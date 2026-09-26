// Servicio de SCOPE: que puede ver cada usuario (Tarea #102 multinivel +
// pacto para-empresas, OB-03).
//
// Dos niveles:
//   1. EMPRESA: todo usuario que no es superadmin ve solo lo de su empresa.
//   2. TERRITORIO dentro de la empresa (region -> departamento -> ciudad -> sede).
//
// Reglas por rol:
//   superadmin            -> global (equipo SISVIA); o una empresa entera si
//                            "entro" a ella (usuario.empresaActiva, HU-16)
//   admin_empresa         -> toda su empresa
//   admin_departamental   -> las sedes de su empresa en su departamento
//   admin_sede / admin    -> su sede
//   conductor             -> su sede (el pool: la sede de su suplencia)
//   cualquier otro caso   -> nada, por seguridad
//
// CL-13: toda consulta a datos de una empresa pasa por aplicarScope(); ninguna
// ruta arma el filtro de empresa a mano. Las reglas puras viven en
// scopeReglas.js (con tests) y se re-exportan desde aca.
import { supabase } from '../config/supabase.js';
import { rolEfectivo } from './jerarquia.service.js';
import { alcanceDe, empresaDe, aplicarScope, usuarioEnScope, UUID_IMPOSIBLE, deLaEmpresa } from './scopeReglas.js';

export { aplicarScope, usuarioEnScope };

// Sedes de una empresa (opcionalmente, solo las de ciertas ciudades).
const sedesDeEmpresa = async (empresaId, ciudadIds = null) => {
    let q = deLaEmpresa(supabase.from('sedes').select('id'), empresaId);
    if (ciudadIds) q = q.in('ciudad_id', ciudadIds.length ? ciudadIds : [UUID_IMPOSIBLE]);
    const { data } = await q;
    return (data || []).map((s) => s.id);
};

// Devuelve { tipo: 'global' }  -> sin filtro (superadmin fuera de una empresa)
//       o  { tipo: 'sedes', empresaId, todaLaEmpresa, sedeIds, ciudadIds,
//            departamentoIds, regionIds }
// sedeIds es el que usa aplicarScope() cuando el scope no es toda la empresa.
// Los otros conjuntos sirven para ubicar a otros administradores que no tienen
// sede sino un territorio mas amplio (ver usuarioEnScope).
export const obtenerScope = async (usuario) => {
    const rol = rolEfectivo(usuario);
    const alcance = alcanceDe(usuario, rol);
    const empresaId = empresaDe(usuario, rol);

    if (alcance === 'global') return { tipo: 'global' };

    const vacio = {
        tipo: 'sedes',
        empresaId,
        todaLaEmpresa: false,
        regionIds: [],
        departamentoIds: [],
        ciudadIds: [],
        sedeIds: [],
    };

    if (!empresaId) return vacio;

    if (alcance === 'empresa') {
        return { ...vacio, todaLaEmpresa: true, sedeIds: await sedesDeEmpresa(empresaId) };
    }

    if (alcance === 'pool') {
        return { ...vacio, sedeIds: usuario.sedeActiva ? [usuario.sedeActiva] : [] };
    }

    if (alcance === 'sede') {
        return { ...vacio, sedeIds: usuario.sede_id ? [usuario.sede_id] : [] };
    }

    // Director Regional: ciudades de su departamento -> sedes de SU empresa ahi
    if (alcance === 'departamento') {
        if (!usuario.departamento_id) return vacio;
        const { data: ciudades } = await supabase
            .from('ciudades')
            .select('id')
            .eq('departamento_id', usuario.departamento_id);
        const ciudadIds = (ciudades || []).map((c) => c.id);
        return {
            ...vacio,
            departamentoIds: [usuario.departamento_id],
            ciudadIds,
            sedeIds: await sedesDeEmpresa(empresaId, ciudadIds),
        };
    }

    return vacio;
};

// Empresa de una sede (null si no existe).
export const empresaDeSede = async (sedeId) => {
    if (!sedeId) return null;
    const { data } = await supabase.from('sedes').select('empresa_id').eq('id', sedeId).maybeSingle();
    return data?.empresa_id || null;
};

// Empresa en la que actua un usuario: la suya, o la que el superadmin eligio al
// entrar (HU-16). Null para el superadmin fuera de una empresa.
export const empresaDelUsuario = (usuario) => empresaDe(usuario, rolEfectivo(usuario));

// ¿El usuario puede acceder a un recurso de una sede dada?
export const puedeAccederSede = async (usuario, sedeId) => {
    const scope = await obtenerScope(usuario);
    if (scope.tipo === 'global') return true;
    return scope.sedeIds.includes(sedeId);
};
