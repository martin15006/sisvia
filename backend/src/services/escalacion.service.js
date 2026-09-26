// Escalado de informes (Opción C): un admin envía a su SUPERIOR inmediato un
// informe manual (nota + resumen opcional de su área). Le llega por correo y
// como notificación en la campanita.
//
// Cadena de mando: Coordinador de sede → Director Regional de su departamento;
// Director Regional → Administración general (superadmin). El administrador general no tiene superior.
import { supabase } from '../config/supabase.js';
import { rolEfectivo } from './jerarquia.service.js';
import { obtenerScope, aplicarScope } from './scope.service.js';
import { emailsDeUsuarios, enviarCorreo, plantillaInforme } from './email.service.js';
import { crearNotificacionDirecta } from './notificaciones.service.js';
import { textoInforme, ofreceResumen } from './informeReglas.js';
import { cabeceraDeSede, etiquetaCargo, organizacionDeUsuario } from './export/branding.js';
import { deLaEmpresa } from './scopeReglas.js';

const idsActivos = async (filtro) => {
    const { data } = await filtro;
    return (data || []).map((u) => u.id);
};

// Devuelve { ids, etiqueta, sinSuperior? } del superior inmediato.
// Todo sube DENTRO de la empresa (pacto para-empresas, OB-06):
//   Coordinador de sede -> Director Regional de su departamento (de su empresa)
//                       -> si no hay, el Administrador de empresa
//   Director Regional   -> Administrador de empresa
//   Administrador de empresa y superadmin -> no tienen superior
// Si la empresa todavia no tiene Administrador (por ejemplo la empresa inicial
// "SISVIA" recien migrada), sube al equipo SISVIA para que no se pierda.
export const resolverSuperior = async (usuario) => {
    const rol = rolEfectivo(usuario);
    if (rol === 'superadmin' || rol === 'admin_empresa') return { ids: [], etiqueta: null, sinSuperior: true };

    const administracion = async () => {
        const ids = await idsActivos(
            deLaEmpresa(supabase.from('usuarios').select('id').eq('rol', 'admin_empresa').eq('activo', true), usuario.empresa_id)
        );
        if (ids.length > 0) return { ids, etiqueta: 'la Administración de tu empresa' };
        const equipo = await idsActivos(
            supabase.from('usuarios').select('id').eq('rol', 'superadmin').eq('activo', true)
        );
        return { ids: equipo, etiqueta: 'el equipo SISVIA', equipoSisvia: true };
    };

    if (rol === 'admin_departamental') return administracion();

    // Coordinador / admin con sede / suplente -> Director Regional de su departamento
    const sedeId = usuario.sedeActiva || usuario.sede_id;
    if (!sedeId) return administracion();
    const { data: sede } = await supabase
        .from('sedes')
        .select('ciudad:ciudad_id ( departamento:departamento_id ( id, nombre ) )')
        .eq('id', sedeId)
        .maybeSingle();
    const depto = sede?.ciudad?.departamento;
    if (depto?.id) {
        const ids = await idsActivos(
            deLaEmpresa(
                supabase.from('usuarios').select('id')
                    .eq('rol', 'admin_departamental')
                    .eq('departamento_id', depto.id)
                    .eq('activo', true),
                usuario.empresa_id
            )
        );
        if (ids.length > 0) return { ids, etiqueta: `el Director Regional de ${depto.nombre}` };
    }
    // Sin Regional de su empresa en ese departamento: sube a la Administración
    return administracion();
};

// Etiqueta del área del remitente (sede o regional) para el encabezado del informe.
const areaDelUsuario = async (usuario) => {
    const sedeId = usuario.sedeActiva || usuario.sede_id;
    if (sedeId) return (await cabeceraDeSede(sedeId)).sedeNombre;
    if (usuario.departamento_id) {
        const { data } = await supabase.from('departamentos').select('nombre').eq('id', usuario.departamento_id).maybeSingle();
        return data?.nombre ? `Regional ${data.nombre}` : '';
    }
    return '';
};

// Conteos del área del admin (respeta su scope) para el resumen opcional.
export const resumenDeArea = async (usuario) => {
    const scope = await obtenerScope(usuario);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const iso = hoy.toISOString();
    const con = (q) => aplicarScope(q, scope);
    const [veh, crit, noop, cheq] = await Promise.all([
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true)),
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'critico')),
        con(supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'no_operativo')),
        con(supabase.from('chequeos_preoperacionales').select('id', { count: 'exact', head: true }).gte('fecha', iso)),
    ]);
    return {
        vehiculos: veh.count || 0,
        criticos: crit.count || 0,
        noOperativos: noop.count || 0,
        chequeosHoy: cheq.count || 0,
    };
};

// Envía el informe: campanita (con todo) + copia por correo al superior. Devuelve { ok, ... }.
export const enviarInforme = async ({ usuario, asunto, mensaje, incluirResumen }) => {
    if (!mensaje || !mensaje.trim()) {
        return { ok: false, status: 400, error: 'El mensaje es obligatorio.' };
    }
    const superior = await resolverSuperior(usuario);
    if (superior.sinSuperior) {
        return { ok: false, status: 400, error: 'No tienes un superior al cual escalar.' };
    }
    if (superior.ids.length === 0) {
        return { ok: false, status: 404, error: 'No se encontró un superior activo para escalar.' };
    }

    const resumen = incluirResumen && ofreceResumen(superior) ? await resumenDeArea(usuario) : null;
    const asuntoLimpio = (asunto || '').trim() || 'Informe';
    const cargo = etiquetaCargo(usuario.rol, usuario.es_pool);
    const area = await areaDelUsuario(usuario);

    // 1) Correo al superior (a prueba de fallos: si está deshabilitado o falla,
    //    seguimos con la campanita igual; solo cambia la nota que mostramos).
    let correoEnviado = false;
    try {
        const para = await emailsDeUsuarios(superior.ids);
        const html = plantillaInforme({ deQuien: usuario.nombre_completo, cargo, area, asunto: asuntoLimpio, mensaje, resumen, organizacion: organizacionDeUsuario(usuario) });
        const r = await enviarCorreo({ para, asunto: `Informe: ${asuntoLimpio}`, html });
        correoEnviado = r.enviado === true;
    } catch {
        correoEnviado = false;
    }

    // 2) Campanita al superior (SIEMPRE, aunque el correo esté deshabilitado),
    //    con el mensaje y el resumen completos. Si el correo sí salió, se avisa
    //    que también le llegó una copia.
    await crearNotificacionDirecta({
        destinatarioIds: superior.ids,
        tipo: 'informe_escalado',
        titulo: `${usuario.nombre_completo} te envió un informe`,
        mensaje: textoInforme({ asunto: asuntoLimpio, mensaje, area, resumen, correoEnviado }),
        url_destino: '/admin/notificaciones',
    });

    return { ok: true, superior: superior.etiqueta, correoEnviado, notificados: superior.ids.length };
};
