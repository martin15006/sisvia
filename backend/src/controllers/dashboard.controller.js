// Controlador del dashboard administrativo.
// Devuelve KPIs del dia + alertas que necesitan atencion del admin.
//
// Diferenciacion por rol (multinivel, Tarea #102): el filtro de scope lo resuelve
// el helper scope.service.js segun el nivel del admin (sede / ciudad / departamento
// / region / nacional). Todas las consultas se filtran por las sedes de su scope.
//
// IMPORTANTE: para "del dia" usamos la medianoche local del servidor. En produccion,
// si el servidor estuviera en otra zona horaria distinta a Colombia, habria que
// normalizar a America/Bogota explicitamente.

import { supabase } from '../config/supabase.js';
import { obtenerScope, aplicarScope } from '../services/scope.service.js';
import { motivoBloqueo, GRAVEDAD_BLOQUEO } from '../services/bloqueoVehiculo.js';

// Helper: devuelve el ISO string de la medianoche de hoy en hora local
const inicioDelDiaISO = () => {
    const ahora = new Date();
    const inicio = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0, 0, 0, 0
    );
    return inicio.toISOString();
};

// Helper: ISO de hoy + N dias hacia el futuro
const enDiasISO = (dias) => {
    const ahora = new Date();
    const objetivo = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + dias,
        23, 59, 59, 999
    );
    return objetivo.toISOString();
};

export const obtenerStatsDashboard = async (req, res) => {
    try {
        const usuario = req.usuario; // viene del middleware verificarToken
        // Resolver una sola vez el scope territorial del admin (qué sedes ve)
        const scope = await obtenerScope(usuario);
        const desdeHoy = inicioDelDiaISO();
        const enUnMes = enDiasISO(30);

        // ====================================================================
        // 1) KPIs del dia (4 cajas)
        // ====================================================================

        // a) Chequeos creados hoy (cerrados o no)
        const chequeosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        // b) Chequeos cerrados hoy con resultado NO OPERATIVO
        const noOperativosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy)
            .eq('cerrado', true)
            .eq('resultado_estado', 'no_operativo');

        // c) Intentos bloqueados de hoy
        const intentosHoyQuery = supabase
            .from('intentos_chequeo_bloqueado')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desdeHoy);

        // d) Conductores activos (totalidad, no del dia)
        const conductoresActivosQuery = supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('rol', 'conductor')
            .eq('activo', true);

        // e) Chequeos abandonados hoy (Tarea #104)
        const abandonadosHoyQuery = supabase
            .from('chequeos_preoperacionales')
            .select('id', { count: 'exact', head: true })
            .gte('abandonado_en', desdeHoy)
            .eq('abandonado', true);

        // Aplicar filtro de sede si aplica y ejecutar todo en paralelo
        const [
            { count: chequeosDelDia },
            { count: chequeosNoOperativosDelDia },
            { count: intentosBloqueadosDelDia },
            { count: conductoresActivos },
            { count: chequeosAbandonadosDelDia },
        ] = await Promise.all([
            aplicarScope(chequeosHoyQuery, scope),
            aplicarScope(noOperativosHoyQuery, scope),
            aplicarScope(intentosHoyQuery, scope),
            aplicarScope(conductoresActivosQuery, scope),
            aplicarScope(abandonadosHoyQuery, scope),
        ]);

        // ====================================================================
        // 2) Alertas "Necesita atencion"
        // ====================================================================

        // a) Licencias por vencer (proximos 30 dias) — solo conductores activos
        let licenciasQuery = supabase
            .from('usuarios')
            .select('id, nombre_completo, licencia_numero, licencia_categoria, licencia_vencimiento, sede_id')
            .eq('rol', 'conductor')
            .eq('activo', true)
            .not('licencia_vencimiento', 'is', null)
            .lte('licencia_vencimiento', enUnMes.split('T')[0])
            .order('licencia_vencimiento', { ascending: true });
        licenciasQuery = aplicarScope(licenciasQuery, scope);
        const { data: licenciasPorVencerRaw } = await licenciasQuery;

        // Calcular dias_restantes para cada licencia (negativo si ya vencio)
        const hoyMidnight = new Date(desdeHoy);
        const licenciasPorVencer = (licenciasPorVencerRaw || []).map((u) => {
            const vencimiento = new Date(u.licencia_vencimiento);
            const diffMs = vencimiento - hoyMidnight;
            const diasRestantes = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            return {
                id: u.id,
                nombre_completo: u.nombre_completo,
                licencia_numero: u.licencia_numero,
                licencia_categoria: u.licencia_categoria,
                licencia_vencimiento: u.licencia_vencimiento,
                dias_restantes: diasRestantes,
            };
        });

        // b) Vehiculos sin RUNT cargado
        let sinRuntQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea')
            .is('runt_url', null)
            .eq('activo', true);
        sinRuntQuery = aplicarScope(sinRuntQuery, scope);
        const { data: vehiculosSinRunt } = await sinRuntQuery;

        // c) Vehiculos no operativos (estado='no_operativo' o inactivos)
        let noOperativosQuery = supabase
            .from('vehiculos')
            .select('id, placa, marca, linea, estado, activo')
            .or('estado.eq.no_operativo,activo.eq.false');
        noOperativosQuery = aplicarScope(noOperativosQuery, scope);
        const { data: vehiculosNoOperativos } = await noOperativosQuery;

        // d) Chequeos abandonados hoy (con datos del conductor y vehiculo).
        // Solo para visualizacion — el contador completo del dia ya esta en kpis.
        let abandonadosListaQuery = supabase
            .from('chequeos_preoperacionales')
            .select(`
                id,
                abandonado_en,
                motivo_abandono,
                tipo,
                conductor:conductor_id ( id, nombre_completo ),
                vehiculo:vehiculo_id ( id, placa )
            `)
            .eq('abandonado', true)
            .gte('abandonado_en', desdeHoy)
            .order('abandonado_en', { ascending: false })
            .limit(10);
        abandonadosListaQuery = aplicarScope(abandonadosListaQuery, scope);
        const { data: abandonadosRaw } = await abandonadosListaQuery;
        const chequeosAbandonados = (abandonadosRaw || []).map((c) => ({
            id: c.id,
            abandonado_en: c.abandonado_en,
            motivo_abandono: c.motivo_abandono,
            tipo: c.tipo,
            conductor_nombre: c.conductor?.nombre_completo || '—',
            placa: c.vehiculo?.placa || '—',
        }));

        // ====================================================================
        // 3) Estado de la flota — conteo por estado, para la franja proporcional
        // ====================================================================
        // Solo vehiculos activos: los desactivados no son "flota disponible",
        // salen aparte en la lista de bloqueados.
        let flotaQuery = supabase
            .from('vehiculos')
            .select('estado')
            .eq('activo', true);
        flotaQuery = aplicarScope(flotaQuery, scope);
        const { data: flotaRaw } = await flotaQuery;

        const flota = { operativo: 0, observacion: 0, alerta: 0, critico: 0, no_operativo: 0 };
        for (const v of flotaRaw || []) {
            if (Object.prototype.hasOwnProperty.call(flota, v.estado)) flota[v.estado] += 1;
        }
        flota.total = (flotaRaw || []).length;

        // ====================================================================
        // 4) "No pueden salir" — una sola lista ordenada por gravedad
        // ====================================================================
        // Reemplaza el tener que leer cuatro grupos sueltos para saber que te
        // frena hoy. Usa la MISMA regla que frena al conductor al iniciar
        // (services/bloqueoVehiculo.js): lo que esta en esta lista es exactamente
        // lo que el sistema no deja sacar, ni mas ni menos.
        let bloqueadosQuery = supabase
            .from('vehiculos')
            .select(`
                id, placa, tipo, estado, activo,
                soat_vencimiento, rtm_vencimiento, extintor_vencimiento,
                sede:sede_id ( id, nombre )
            `);
        bloqueadosQuery = aplicarScope(bloqueadosQuery, scope);
        const { data: candidatosRaw } = await bloqueadosQuery;

        const hoy = new Date(desdeHoy);
        const noPuedenSalir = [];
        for (const v of candidatosRaw || []) {
            const bloqueo = motivoBloqueo(v, 'preoperacional', hoy);
            if (!bloqueo) continue;
            noPuedenSalir.push({
                id: v.id,
                placa: v.placa,
                tipo: v.tipo,
                estado: v.estado,
                sede_nombre: v.sede?.nombre || '—',
                motivo: bloqueo.razon,
                detalle: bloqueo.detalle,
            });
        }
        noPuedenSalir.sort((a, b) =>
            (GRAVEDAD_BLOQUEO[a.motivo] || 9) - (GRAVEDAD_BLOQUEO[b.motivo] || 9) || a.placa.localeCompare(b.placa)
        );

        // ====================================================================
        // 5) Respuesta
        // ====================================================================

        res.json({
            // scope.tipo: 'global' (superadmin) | 'sedes' (resto, con la lista
            // de sedes que cubre su nivel). El frontend lo usa para el texto
            // contextual del dashboard.
            scope: scope.tipo === 'global'
                ? { tipo: 'global' }
                : { tipo: 'sedes', cantidad_sedes: scope.sedeIds.length },
            generado_en: new Date().toISOString(),
            kpis: {
                chequeos_del_dia: chequeosDelDia || 0,
                chequeos_no_operativos_del_dia: chequeosNoOperativosDelDia || 0,
                intentos_bloqueados_del_dia: intentosBloqueadosDelDia || 0,
                conductores_activos: conductoresActivos || 0,
                chequeos_abandonados_del_dia: chequeosAbandonadosDelDia || 0,
            },
            flota,
            no_pueden_salir: noPuedenSalir,
            alertas: {
                licencias_por_vencer: licenciasPorVencer,
                vehiculos_sin_runt: vehiculosSinRunt || [],
                vehiculos_no_operativos: vehiculosNoOperativos || [],
                chequeos_abandonados: chequeosAbandonados,
            },
        });
    } catch (err) {
        console.error('Error en obtenerStatsDashboard:', err);
        res.status(500).json({ error: 'Error al obtener las estadisticas del dashboard' });
    }
};
