// Servicio de SCOPE territorial (Fase 4 multinivel, Tarea #102).
//
// Dado un administrador, calcula QUE SEDES puede ver segun su nivel y su
// territorio asignado. Casi todo en el sistema (vehiculos, chequeos, conductores,
// intentos) cuelga de un sede_id, asi que resolver "las sedes de mi scope"
// permite filtrar cualquier consulta con un simple .in('sede_id', [...]).
//
// Jerarquia geografica: region -> departamento -> ciudad -> sede.
//
// Reglas por rol:
//   superadmin            -> TODOS las sedes (sin filtro)
//   admin_departamental   -> sedes de su departamento (via ciudades)
//   admin_sede / admin  -> solo su sede
//   conductor             -> solo su sede
//   (cualquier admin sin su scope asignado -> no ve nada, por seguridad)
//
// NOTA (12 jun 2026): se eliminaron los niveles admin_regional y admin_ciudad.
// El "Director Regional" es el antiguo admin_departamental (Regional =
// departamento). Las columnas usuarios.region_id / ciudad_id quedan sin uso.

import { supabase } from '../config/supabase.js';
import { rolEfectivo } from './jerarquia.service.js';

// UUID imposible: se usa para forzar "0 resultados" cuando un admin no tiene
// scope valido, en vez de devolver todo por error.
const UUID_IMPOSIBLE = '00000000-0000-0000-0000-000000000000';

// Devuelve { tipo: 'global' }  -> sin filtro (superadmin)
//       o  { tipo: 'sedes', sedeIds, ciudadIds, departamentoIds, regionIds }
//          -> el scope territorial resuelto a TODOS sus niveles.
//
// sedeIds es el que usa aplicarScope() para filtrar recursos (vehiculos,
// chequeos, etc. cuelgan de una sede). Los demas conjuntos (ciudadIds, etc.)
// sirven para ubicar a OTROS administradores que no tienen sede_id sino un
// territorio mas amplio (ver usuarioEnScope).
export const obtenerScope = async (usuario) => {
    // Rol EFECTIVO: un pool con suplencia vigente se trata como admin_sede de su
    // sede (ver jerarquia.service rolEfectivo). El resto usa su rol real.
    const rol = rolEfectivo(usuario);

    // Superadmin ve todo el pais
    if (rol === 'superadmin') {
        return { tipo: 'global' };
    }

    // Scope vacio base: si un admin no tiene su territorio asignado, no ve nada.
    const vacio = {
        tipo: 'sedes',
        regionIds: [],
        departamentoIds: [],
        ciudadIds: [],
        sedeIds: [],
    };

    // SUPLENTE (pool con suplencia vigente): su scope es la SEDE ACTIVA (el que esta
    // gestionando ahora), de entre las sedes que cubre la suplencia. Lo resuelve el
    // middleware (sedeActiva): si cubre un solo sede, ese; si cubre varios (toda una
    // regional), el que eligio en el selector. Si cubre varios y no eligio, no ve nada
    // hasta elegir uno.
    if (usuario?.rol === 'conductor' && usuario?.es_pool === true && usuario?.suplencia) {
        return { ...vacio, sedeIds: usuario.sedeActiva ? [usuario.sedeActiva] : [] };
    }

    // Admin de sede (nuevo rol explicito) y conductor: solo su sede.
    if (rol === 'admin_sede' || rol === 'conductor') {
        return {
            ...vacio,
            sedeIds: usuario.sede_id ? [usuario.sede_id] : [],
        };
    }

    // Alias historico 'admin' (antes del multinivel solo existian 'admin' y
    // 'conductor'). Para NO romper cuentas existentes:
    //   - si tiene sede asignada -> se comporta como admin_sede (su sede)
    //   - si NO tiene sede (admin "global" de antes) -> conserva visibilidad total
    if (rol === 'admin') {
        if (usuario.sede_id) {
            return { ...vacio, sedeIds: [usuario.sede_id] };
        }
        return { tipo: 'global' };
    }

    // Admin departamental: ciudades del departamento -> sedes de esas ciudades
    if (rol === 'admin_departamental') {
        if (!usuario.departamento_id) return vacio;
        const { data: ciudades } = await supabase
            .from('ciudades')
            .select('id')
            .eq('departamento_id', usuario.departamento_id);
        const ciudadIds = (ciudades || []).map((c) => c.id);
        let sedeIds = [];
        if (ciudadIds.length > 0) {
            const { data: sedes } = await supabase
                .from('sedes')
                .select('id')
                .in('ciudad_id', ciudadIds);
            sedeIds = (sedes || []).map((c) => c.id);
        }
        return {
            ...vacio,
            departamentoIds: [usuario.departamento_id],
            ciudadIds,
            sedeIds,
        };
    }

    // Rol desconocido: por seguridad, no ve nada
    return vacio;
};

// Aplica el scope a una query de Supabase que tenga columna sede_id.
// Uso:
//   let query = supabase.from('vehiculos').select('*');
//   query = aplicarScope(query, scope);
export const aplicarScope = (query, scope) => {
    if (!scope || scope.tipo === 'global') return query;
    const ids = scope.sedeIds && scope.sedeIds.length > 0
        ? scope.sedeIds
        : [UUID_IMPOSIBLE];
    return query.in('sede_id', ids);
};

// ¿El admin puede acceder a un recurso de una sede dada?
// Resuelve el scope y verifica si la sede esta dentro. Util para los chequeos
// de acceso individual (ver/editar/eliminar un vehiculo, etc.).
export const puedeAccederSede = async (usuario, sedeId) => {
    const scope = await obtenerScope(usuario);
    if (scope.tipo === 'global') return true;
    return scope.sedeIds.includes(sedeId);
};

// ¿El usuario OBJETIVO cae dentro del scope del admin?
// A diferencia de los vehiculos/chequeos (que siempre tienen sede_id), un
// usuario puede ser otro administrador cuyo territorio es mas amplio que un
// sede (una ciudad, un departamento, una region). Por eso comparamos cada
// nivel: el objetivo es visible si CUALQUIERA de sus asignaciones territoriales
// cae dentro del scope del admin que consulta.
//
// Ejemplos:
//   - admin_sede (scope: 1 sede) ve los conductores de su sede.
//   - admin_departamental (scope: su depto + sus ciudades/sedes) ve a los
//     coordinadores y conductores de esas sedes, y a si mismo.
//   - superadmin ve a todos (scope global).
export const usuarioEnScope = (scope, objetivo) => {
    if (!scope || scope.tipo === 'global') return true;
    if (!objetivo) return false;
    if (objetivo.sede_id && scope.sedeIds?.includes(objetivo.sede_id)) return true;
    if (objetivo.ciudad_id && scope.ciudadIds?.includes(objetivo.ciudad_id)) return true;
    if (objetivo.departamento_id && scope.departamentoIds?.includes(objetivo.departamento_id)) return true;
    if (objetivo.region_id && scope.regionIds?.includes(objetivo.region_id)) return true;
    return false;
};
