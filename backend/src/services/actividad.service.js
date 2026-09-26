// Actividad de la empresa y Registro del equipo (pacto para-empresas, HU-19 ·
// HU-20.1 · RN-14). La tabla solo crece: aca no hay editar ni borrar (lo unico
// que la borra es eliminar la empresa, HU-05 · CB-25).
//
// Vehiculos, usuarios y lo del equipo SISVIA con las empresas los copia la base
// sola (migracion 2026-09-21). Sedes y catalogo propio pasan por registrarActividad.
import { supabase } from '../config/supabase.js';
import { deLaEmpresa } from './scopeReglas.js';
import { cargoDe, viajaEnSoporte, condicionesDeConsulta, armarPagina, POR_PAGINA } from './actividadReglas.js';

const CAMPOS = 'id, created_at, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto, detalles, empresa_nombre';

// Un cambio en una sede o en el catalogo. Si lo hace el equipo SISVIA dentro de
// la empresa, ya queda en su registro de soporte (con contraseña): ahi se suma
// el nombre de lo que toco. Nunca frena la respuesta: si falla, queda en el log.
export const registrarActividad = async ({ usuario, res, tipo, accion, objetoId = null, objeto = null, detalles = null }) => {
    try {
        if (viajaEnSoporte(usuario)) {
            if (res) res.locals.auditoria = { ...(res.locals.auditoria || {}), elemento: objeto };
            return;
        }
        const empresaId = usuario?.rol === 'superadmin' ? null : usuario?.empresa_id || null;
        let empresaNombre = null;
        if (empresaId) {
            const { data } = await supabase.from('empresas').select('nombre').eq('id', empresaId).maybeSingle();
            empresaNombre = data?.nombre || null;
        }
        const { error } = await supabase.from('actividad').insert({
            empresa_id: empresaId,
            empresa_nombre: empresaNombre,
            actor_id: usuario?.id || null,
            actor_nombre: usuario?.nombre_completo || 'Alguien',
            actor_cargo: cargoDe(usuario?.rol, usuario?.es_pool === true),
            de_sisvia: usuario?.rol === 'superadmin',
            tipo,
            accion,
            objeto_id: objetoId === null ? null : String(objetoId),
            objeto,
            detalles,
        });
        if (error) console.error('No se pudo registrar la actividad:', error.message);
    } catch (err) {
        console.error('No se pudo registrar la actividad:', err.message);
    }
};

// Una pagina de actividad (de a 50, lo mas nuevo primero).
//   alcance: { empresaId } (HU-19) o { equipo: true } (HU-20.1)
export const listarActividad = async (alcance, filtros) => {
    let q = supabase.from('actividad').select(CAMPOS);
    for (const [op, ...args] of condicionesDeConsulta(alcance, filtros)) {
        q = op === 'deLaEmpresa' ? deLaEmpresa(q, args[0]) : q[op](...args);
    }
    const { data, error } = await q
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(POR_PAGINA + 1);
    if (error) throw error;
    return armarPagina(data);
};
