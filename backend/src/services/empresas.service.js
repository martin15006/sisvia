// Modulo Empresas (pacto para-empresas, HU-01, HU-02 y HU-03).
// Lo usa solo el superadmin, salvo verificarLimite y usoDeEmpresa, que se llaman
// al crear o reactivar sedes y vehiculos, y desde el panel de la empresa.
import { supabase } from '../config/supabase.js';
import { alcanzoLimite, mensajeLimite, limiteBajoUso } from './limitesReglas.js';
import { MENSAJES_EMPRESA, esCorreoRepetido, escaparLike, motivoNoEliminar } from './empresasReglas.js';
import { generarPasswordTemporal, registrarAuditoria } from './usuarios.service.js';
import { deLaEmpresa } from './scopeReglas.js';
import { insertarConRespaldo } from './respaldo.service.js';

const CAMPOS_EMPRESA = 'id, nombre, nit, ciudad_id, telefono, correo, limite_sedes, limite_vehiculos, activa, desactivada_en, ultimo_respaldo_en, created_at, ciudades:ciudad_id(nombre)';

// Error con status HTTP, para que la ruta lo devuelva tal cual.
const errorDe = (status, mensaje) => Object.assign(new Error(mensaje), { status });

// RNF-05: toda accion del superadmin sobre una empresa queda registrada.
// respaldo: la IP y el navegador (enmienda 1 de portada-publica, HU-07). Por defecto,
// los del pedido en curso; el registro de soporte los pasa ya tomados.
export const auditarEmpresa = async ({ empresa, actorId, accion, detalles = {}, respaldo }) => {
    const { error } = await insertarConRespaldo('auditoria_empresas', {
        empresa_id: empresa.id,
        empresa_nombre: empresa.nombre,
        actor_id: actorId,
        accion,
        detalles,
    }, respaldo);
    if (error) console.error('No se pudo auditar la accion sobre la empresa:', error.message);
};

// Lo que cuenta para el limite: sedes activas y vehiculos activos no dados de baja (RN-03).
const contar = async (empresaId, tipo) => {
    let q = deLaEmpresa(
        supabase.from(tipo === 'sedes' ? 'sedes' : 'vehiculos').select('id', { count: 'exact', head: true }),
        empresaId,
    ).eq('activo', true);
    if (tipo === 'vehiculos') q = q.eq('dado_de_baja', false);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
};

export const usoDeEmpresa = async (empresa) => {
    const [sedes, vehiculos] = await Promise.all([contar(empresa.id, 'sedes'), contar(empresa.id, 'vehiculos')]);
    return {
        sedes: { usadas: sedes, limite: empresa.limite_sedes },
        vehiculos: { usados: vehiculos, limite: empresa.limite_vehiculos },
    };
};

// null si la empresa puede sumar una sede o un vehiculo mas; si no, el texto
// exacto de HU-02.2 / HU-02.3. Vale para cualquiera que cree o reactive,
// tambien el superadmin (RN-03): si hace falta, se sube el limite.
export const verificarLimite = async (empresaId, tipo) => {
    if (!empresaId) return null;
    const { data: empresa, error } = await supabase
        .from('empresas')
        .select('limite_sedes, limite_vehiculos')
        .eq('id', empresaId)
        .maybeSingle();
    if (error) throw error;
    if (!empresa) return null;
    const limite = tipo === 'sedes' ? empresa.limite_sedes : empresa.limite_vehiculos;
    return alcanzoLimite(await contar(empresaId, tipo), limite) ? mensajeLimite(tipo, limite) : null;
};

const aplanar = (e) => {
    const { ciudades, ...resto } = e;
    return { ...resto, ciudad_nombre: ciudades?.nombre || null };
};

// HU-01.1: lista con estado y uso de los limites.
export const listarEmpresas = async () => {
    const { data, error } = await supabase.from('empresas').select(CAMPOS_EMPRESA).order('nombre');
    if (error) throw error;
    return Promise.all((data || []).map(async (e) => ({ ...aplanar(e), uso: await usoDeEmpresa(e) })));
};

// Ficha: datos, uso, administradores y ultimas acciones del superadmin.
export const obtenerEmpresa = async (id) => {
    const { data: empresa, error } = await supabase.from('empresas').select(CAMPOS_EMPRESA).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!empresa) return null;

    const [uso, { data: admins }, { data: auditoria }] = await Promise.all([
        usoDeEmpresa(empresa),
        deLaEmpresa(supabase.from('usuarios').select('id, nombre_completo, cedula, telefono, activo'), id).eq('rol', 'admin_empresa').order('nombre_completo'),
        deLaEmpresa(supabase.from('auditoria_empresas').select('id, accion, detalles, created_at, actor:actor_id(nombre_completo)'), id).order('created_at', { ascending: false }).limit(20),
    ]);

    // Correos de los administradores (viven en Supabase Auth).
    const administradores = await Promise.all((admins || []).map(async (a) => {
        const { data } = await supabase.auth.admin.getUserById(a.id);
        return { ...a, email: data?.user?.email || null };
    }));

    // HU-05: por que todavia no se puede eliminar (null = se puede, escribiendo el nombre).
    const noSeElimina = motivoNoEliminar({ empresa, nombreEscrito: empresa.nombre });
    return { ...aplanar(empresa), uso, administradores, auditoria: auditoria || [], no_se_elimina: noSeElimina };
};

const nombreOcupado = async (nombre, excepto = null) => {
    let q = supabase.from('empresas').select('id').ilike('nombre', escaparLike(nombre));
    if (excepto) q = q.neq('id', excepto);
    const { data, error } = await q.limit(1);
    if (error) throw error;
    return (data || []).length > 0;
};

// HU-01.2-4 · CB-09 · CB-14: empresa + Administrador de empresa, todo o nada.
// Orden: comprobaciones -> cuenta de acceso (ahi se sabe si el correo existe)
// -> empresa (el indice unico frena al que llega segundo con el mismo nombre)
// -> perfil. Si un paso falla, se deshace lo anterior.
export const crearEmpresaConAdmin = async ({ empresa, admin }, actor) => {
    if (await nombreOcupado(empresa.nombre)) throw errorDe(409, MENSAJES_EMPRESA.nombreRepetido);

    const { data: mismaCedula } = await supabase.from('usuarios').select('id').eq('cedula', admin.cedula).maybeSingle();
    if (mismaCedula) throw errorDe(409, MENSAJES_EMPRESA.cedulaRepetida);

    const passwordTemporal = generarPasswordTemporal();
    const { data: cuenta, error: errCuenta } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: passwordTemporal,
        email_confirm: true,
    });
    if (errCuenta) {
        if (esCorreoRepetido(errCuenta)) throw errorDe(409, MENSAJES_EMPRESA.correoRepetido);
        throw errorDe(400, errCuenta.message);
    }
    const borrarCuenta = () => supabase.auth.admin.deleteUser(cuenta.user.id);

    const { data: nueva, error: errEmpresa } = await supabase
        .from('empresas')
        .insert({ ...empresa, activa: true })
        .select(CAMPOS_EMPRESA)
        .single();
    if (errEmpresa) {
        await borrarCuenta();
        if (errEmpresa.code === '23505') throw errorDe(409, MENSAJES_EMPRESA.nombreRepetido);
        throw errEmpresa;
    }

    const { data: perfil, error: errPerfil } = await supabase
        .from('usuarios')
        .insert({
            id: cuenta.user.id,
            cedula: admin.cedula,
            nombre_completo: admin.nombre_completo,
            telefono: admin.telefono,
            rol: 'admin_empresa',
            empresa_id: nueva.id,
            debe_cambiar_password: true,
        })
        .select('id, nombre_completo, cedula, telefono, rol, empresa_id')
        .single();
    if (errPerfil) {
        await borrarCuenta();
        await supabase.from('empresas').delete().eq('id', nueva.id);
        if (errPerfil.code === '23505') throw errorDe(409, MENSAJES_EMPRESA.cedulaRepetida);
        throw errPerfil;
    }

    await auditarEmpresa({
        empresa: nueva,
        actorId: actor.id,
        accion: 'creada',
        detalles: {
            limite_sedes: nueva.limite_sedes,
            limite_vehiculos: nueva.limite_vehiculos,
            administrador: { nombre: perfil.nombre_completo, email: admin.email },
        },
    });
    await registrarAuditoria({
        usuarioAfectadoId: perfil.id,
        accionPorId: actor.id,
        accion: 'creado',
        detalles: { email: admin.email, rol: 'admin_empresa', empresa: nueva.nombre },
    });

    return {
        empresa: { ...aplanar(nueva), uso: await usoDeEmpresa(nueva) },
        administrador: { ...perfil, email: admin.email },
        password_temporal: passwordTemporal,
    };
};

// HU-02.1 · CB-02: editar datos y limites. Un limite no puede quedar por debajo
// de lo que la empresa ya tiene activo (enmienda 1).
export const actualizarEmpresa = async (id, cambios, actor) => {
    const { data: antes, error } = await supabase.from('empresas').select(CAMPOS_EMPRESA).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!antes) throw errorDe(404, 'Empresa no encontrada');

    const reales = Object.fromEntries(Object.entries(cambios).filter(([k, v]) => antes[k] !== v));
    if (Object.keys(reales).length === 0) return { ...aplanar(antes), uso: await usoDeEmpresa(antes) };

    if (reales.nombre && (await nombreOcupado(reales.nombre, id))) throw errorDe(409, MENSAJES_EMPRESA.nombreRepetido);

    for (const [campo, tipo] of [['limite_sedes', 'sedes'], ['limite_vehiculos', 'vehiculos']]) {
        if (!(campo in reales)) continue;
        const bajoUso = limiteBajoUso(tipo, reales[campo], await contar(id, tipo));
        if (bajoUso) throw errorDe(400, bajoUso);
    }

    const { data: despues, error: errUpd } = await supabase
        .from('empresas')
        .update({ ...reales, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(CAMPOS_EMPRESA)
        .single();
    if (errUpd) {
        if (errUpd.code === '23505') throw errorDe(409, MENSAJES_EMPRESA.nombreRepetido);
        throw errUpd;
    }

    const cambioLimites = 'limite_sedes' in reales || 'limite_vehiculos' in reales;
    await auditarEmpresa({
        empresa: despues,
        actorId: actor.id,
        accion: cambioLimites ? 'limites' : 'editada',
        detalles: Object.fromEntries(Object.keys(reales).map((k) => [k, { antes: antes[k], despues: despues[k] }])),
    });

    return { ...aplanar(despues), uso: await usoDeEmpresa(despues) };
};

// HU-03.1 y HU-03.4: desactivar o reactivar. Los datos no se tocan.
export const cambiarEstadoEmpresa = async (id, activa, actor) => {
    const { data: antes, error } = await supabase.from('empresas').select('id, nombre, activa').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!antes) throw errorDe(404, 'Empresa no encontrada');
    if (antes.activa === activa) {
        throw errorDe(400, activa ? 'La empresa ya está activa.' : 'La empresa ya está desactivada.');
    }

    const { data: despues, error: errUpd } = await supabase
        .from('empresas')
        .update({ activa, desactivada_en: activa ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(CAMPOS_EMPRESA)
        .single();
    if (errUpd) throw errUpd;

    await auditarEmpresa({ empresa: despues, actorId: actor.id, accion: activa ? 'reactivada' : 'desactivada' });
    return { ...aplanar(despues), uso: await usoDeEmpresa(despues) };
};

// HU-03.2-3: ¿la empresa de este usuario esta desactivada? (el superadmin no tiene empresa)
export const empresaDesactivada = async (empresaId) => {
    if (!empresaId) return false;
    const { data } = await supabase.from('empresas').select('activa').eq('id', empresaId).maybeSingle();
    return data ? data.activa === false : false;
};

// Administradores de empresa activos de una empresa (CB-17).
export const adminsActivosDeEmpresa = async (empresaId) => {
    if (!empresaId) return 0;
    const { count, error } = await deLaEmpresa(
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        empresaId,
    )
        .eq('rol', 'admin_empresa')
        .eq('activo', true);
    if (error) throw error;
    return count ?? 0;
};
