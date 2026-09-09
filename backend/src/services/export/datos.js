import { supabase } from '../../config/supabase.js';
import { obtenerChequeoCompleto, obtenerChequeosDelConductor, listarChequeosParaAdmin } from '../chequeos.service.js';
import { obtenerVehiculoCompleto } from '../vehiculos.service.js';
import { puedeAccederSede, obtenerScope, usuarioEnScope } from '../scope.service.js';
import { cabeceraDeSede, origenDeUsuario, etiquetaEstado, fechaLarga } from './branding.js';

// Junta TODO lo necesario para exportar un chequeo (reusa la capa de datos existente,
// respetando el scope del usuario). Devuelve { ok, error?, status?, chequeo, origen }.
export const datosChequeo = async (id, usuario) => {
    const resultado = await obtenerChequeoCompleto(id, usuario);
    if (resultado.error) {
        return { ok: false, status: resultado.error.status, error: resultado.error.mensaje };
    }
    const chequeo = resultado.chequeo;
    const origen = await cabeceraDeSede(chequeo.sede_id);
    return { ok: true, chequeo, origen };
};

// Junta el vehiculo completo + sus ultimos chequeos cerrados, respetando el scope.
// Devuelve { ok, error?, status?, vehiculo, chequeos, origen }.
export const datosVehiculo = async (id, usuario) => {
    let vehiculo;
    try {
        vehiculo = await obtenerVehiculoCompleto(id);
    } catch {
        return { ok: false, status: 404, error: 'Vehículo no encontrado.' };
    }
    if (!vehiculo) return { ok: false, status: 404, error: 'Vehículo no encontrado.' };
    if (!(await puedeAccederSede(usuario, vehiculo.sede_id))) {
        return { ok: false, status: 403, error: 'No tienes acceso a este vehículo.' };
    }

    const { data: chequeos } = await supabase
        .from('chequeos_preoperacionales')
        .select('id, fecha, tipo, es_oficial, resultado_estado, resultado_criticidad, cerrado, tiene_falla_critica, conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (nombre_completo)')
        .eq('vehiculo_id', id)
        .eq('cerrado', true)
        .order('fecha', { ascending: false })
        .limit(8);

    const origen = await cabeceraDeSede(vehiculo.sede_id);
    return { ok: true, vehiculo, chequeos: chequeos || [], origen };
};

// Junta el conductor (perfil completo) + sus ultimos chequeos, respetando el scope
// (mismo criterio que la gestion de usuarios: el objetivo debe estar en el area).
// Devuelve { ok, error?, status?, conductor, chequeos, origen }.
export const datosConductor = async (id, usuario) => {
    const { data: conductor } = await supabase
        .from('usuarios')
        .select('*, sede:sedes ( nombre, direccion, ciudad:ciudad_id ( nombre, departamento:departamento_id ( nombre ) ) )')
        .eq('id', id)
        .maybeSingle();
    if (!conductor) return { ok: false, status: 404, error: 'Usuario no encontrado.' };

    const scope = await obtenerScope(usuario);
    if (usuario.id !== conductor.id && !usuarioEnScope(scope, conductor)) {
        return { ok: false, status: 403, error: 'Ese usuario no pertenece a tu área.' };
    }

    let email = null;
    try {
        const { data: authUser } = await supabase.auth.admin.getUserById(id);
        email = authUser?.user?.email || null;
    } catch { /* sin email de auth */ }

    const chequeos = await obtenerChequeosDelConductor(id, 8);
    const origen = await cabeceraDeSede(conductor.sede_id);
    return { ok: true, conductor: { ...conductor, email }, chequeos: chequeos || [], origen };
};

// Reporte/listado de chequeos visibles segun el scope del admin, respetando los
// mismos filtros de ChequeosAdmin (periodo, placa, resultado, oficiales, cerrados).
// Devuelve { ok, chequeos, total, origen, filtrosTexto }.
export const datosReporteChequeos = async (filtros, usuario) => {
    const { chequeos } = await listarChequeosParaAdmin({
        usuario,
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        placa: filtros.placa,
        resultadoEstado: filtros.resultadoEstado,
        soloOficiales: filtros.soloOficiales,
        soloCerrados: filtros.soloCerrados,
        pagina: 1,
        limite: 5000,
    });

    const partes = [];
    if (filtros.fechaDesde || filtros.fechaHasta) {
        partes.push(`Período: ${filtros.fechaDesde ? fechaLarga(filtros.fechaDesde) : '…'} – ${filtros.fechaHasta ? fechaLarga(filtros.fechaHasta) : '…'}`);
    }
    if (filtros.placa) partes.push(`Placa: ${filtros.placa}`);
    if (filtros.resultadoEstado) partes.push(`Resultado: ${etiquetaEstado(filtros.resultadoEstado)}`);
    if (filtros.soloOficiales === 'true') partes.push('Solo oficiales');
    if (filtros.soloCerrados === 'true') partes.push('Solo cerrados');
    const filtrosTexto = partes.length ? partes.join('   ·   ') : 'Todos los chequeos visibles';

    const origen = await origenDeUsuario(usuario);
    return { ok: true, chequeos: chequeos || [], total: (chequeos || []).length, origen, filtrosTexto };
};
