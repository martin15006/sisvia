// Reglas PURAS del scope (pacto para-empresas, OB-03 · CL-13).
// Sin base de datos, para poder probarlas con node --test. scope.service.js
// las usa y las re-exporta: el resto del backend sigue importando de ahi.
//
// El scope ahora tiene dos niveles:
//   1. la EMPRESA: todo usuario que no es superadmin ve solo lo de su empresa;
//   2. el TERRITORIO dentro de la empresa: toda la empresa (Administrador de
//      empresa), un departamento (Director Regional) o una sede (Coordinador,
//      Conductor).
// El superadmin (equipo SISVIA) es global, salvo cuando "entra" a una empresa
// (HU-16): ahi ve esa empresa entera, como su Administrador.

import { rolEfectivo } from './jerarquia.service.js';

// UUID imposible: fuerza "0 resultados" cuando falta algo, en vez de devolver todo.
export const UUID_IMPOSIBLE = '00000000-0000-0000-0000-000000000000';

// Que alcance le toca a un usuario, segun su rol efectivo. No consulta la base.
//   'global' | 'empresa' | 'departamento' | 'sede' | 'pool' | 'ninguno'
export const alcanceDe = (usuario, rol) => {
    if (rol === 'superadmin') return usuario?.empresaActiva ? 'empresa' : 'global';
    if (rol === 'admin_empresa') return 'empresa';
    if (usuario?.rol === 'conductor' && usuario?.es_pool === true && usuario?.suplencia) return 'pool';
    if (rol === 'admin_departamental') return 'departamento';
    if (rol === 'admin_sede' || rol === 'conductor') return 'sede';
    // 'admin' es el alias historico de admin_sede. Antes, sin sede era global;
    // con varias empresas eso dejaria ver todas: ahora ve solo su empresa.
    if (rol === 'admin') return usuario?.sede_id ? 'sede' : 'empresa';
    return 'ninguno';
};

// La empresa del scope: la del usuario, o la que el superadmin eligio al entrar.
export const empresaDe = (usuario, rol) =>
    (rol === 'superadmin' ? usuario?.empresaActiva : usuario?.empresa_id) || null;

// Aplica el scope a una query de Supabase de una tabla con empresa_id y sede_id.
// Uso: query = aplicarScope(supabase.from('vehiculos').select('*'), scope);
export const aplicarScope = (query, scope) => {
    if (!scope || scope.tipo === 'global') return query;
    const filtrada = query.eq('empresa_id', scope.empresaId || UUID_IMPOSIBLE);
    if (scope.todaLaEmpresa) return filtrada;
    const ids = scope.sedeIds && scope.sedeIds.length > 0 ? scope.sedeIds : [UUID_IMPOSIBLE];
    return filtrada.in('sede_id', ids);
};

// ¿El usuario OBJETIVO cae dentro del scope de quien consulta?
// Primero la empresa: otra empresa (o un superadmin, que no tiene) nunca.
// Despues el territorio, como antes: basta con que UNA de sus asignaciones caiga
// dentro. Si el objetivo vino sin empresa_id (consulta vieja), se decide por el
// territorio, que ya esta dentro de la empresa; con toda la empresa, se niega.
export const usuarioEnScope = (scope, objetivo) => {
    if (!scope || scope.tipo === 'global') return true;
    if (!objetivo) return false;
    if (objetivo.empresa_id !== undefined && objetivo.empresa_id !== scope.empresaId) return false;
    if (scope.todaLaEmpresa) return objetivo.empresa_id !== undefined;
    if (objetivo.sede_id && scope.sedeIds?.includes(objetivo.sede_id)) return true;
    if (objetivo.ciudad_id && scope.ciudadIds?.includes(objetivo.ciudad_id)) return true;
    if (objetivo.departamento_id && scope.departamentoIds?.includes(objetivo.departamento_id)) return true;
    if (objetivo.region_id && scope.regionIds?.includes(objetivo.region_id)) return true;
    return false;
};

// Filtro por UNA empresa dada (la del evento, no la de quien consulta): a quien
// le llega un aviso, quien es el superior, que sedes cubre una suplencia. Sin
// empresa no devuelve nada, en vez de devolver todo.
export const deLaEmpresa = (query, empresaId) => query.eq('empresa_id', empresaId || UUID_IMPOSIBLE);

// El catálogo que ve una empresa (RN-07): el base (sin empresa) y el suyo. Sin
// empresa, solo el base. El id va dentro de un filtro de texto de la base: si no
// es un UUID, no entra (así nada raro se cuela en el filtro).
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const baseODeLaEmpresa = (query, empresaId) =>
    query.or(ES_UUID.test(String(empresaId || '')) ? `empresa_id.is.null,empresa_id.eq.${empresaId}` : 'empresa_id.is.null');

// Filtro de empresa para buscar UN recurso por su id (vehiculo, usuario,
// chequeo...). Lo de otra empresa no aparece, asi que el handler responde su
// "no encontrado" de siempre: como si no existiera (RN-01), sin confirmar que
// existe con un 403. Uso: .eq("id", id).match(filtroEmpresa(req.usuario))
export const filtroEmpresa = (usuario) => {
    const rol = rolEfectivo(usuario);
    if (alcanceDe(usuario, rol) === 'global') return {};
    return { empresa_id: empresaDe(usuario, rol) || UUID_IMPOSIBLE };
};

// ¿El area (territorio) que se le quiere asignar a un usuario queda fuera del
// scope de quien la asigna? La sede siempre tiene que ser de su alcance. Con la
// empresa entera, ciudad, departamento y region son libres: la geografia es la
// misma para todas las empresas (RN-02) y el Administrador de empresa arma su
// estructura en cualquier parte del pais.
export const areaFueraDeScope = (scope, { sede_id, ciudad_id, departamento_id, region_id } = {}) => {
    if (!scope || scope.tipo === 'global') return false;
    if (sede_id && !(scope.sedeIds || []).includes(sede_id)) return true;
    if (scope.todaLaEmpresa) return false;
    return Boolean(
        (ciudad_id && !(scope.ciudadIds || []).includes(ciudad_id)) ||
        (departamento_id && !(scope.departamentoIds || []).includes(departamento_id)) ||
        (region_id && !(scope.regionIds || []).includes(region_id))
    );
};
