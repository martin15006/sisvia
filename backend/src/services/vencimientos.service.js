// Servicio de vencimientos: arma la lista de documentos por vencer (o vencidos
// hace poco) para que el job diario llene la campanita y mande el correo-resumen.
//
// Documentos vigilados:
//   - Vehiculos: SOAT, RTM (revision tecnico-mecanica), Extintor
//   - Conductores: Licencia de conduccion
import { supabase } from '../config/supabase.js';

export const DIAS_AVISO = 30;   // se avisa cuando faltan <= 30 dias
const DIAS_PISO = -60;          // ...y hasta 60 dias despues de vencido (luego se asume fuera de servicio)

const UN_DIA = 24 * 60 * 60 * 1000;
const diasHasta = (fecha) => Math.ceil((new Date(fecha).getTime() - Date.now()) / UN_DIA);
const enRango = (dias) => dias <= DIAS_AVISO && dias >= DIAS_PISO;

// Devuelve una lista plana de items por vencer, ordenada por urgencia (dias asc).
// Cada item: { categoria, tipo, vence, dias, sujeto, sede_id, vehiculo_id?, conductor_id? }
export const obtenerVencimientos = async () => {
    const items = [];

    const { data: vehiculos, error: errVeh } = await supabase
        .from('vehiculos')
        .select('id, placa, sede_id, soat_vencimiento, rtm_vencimiento, extintor_vencimiento')
        .eq('activo', true);
    if (errVeh) console.error('[vencimientos] error consultando vehiculos:', errVeh.message);

    for (const v of vehiculos || []) {
        const docs = [
            ['SOAT', 'soat_proximo_vencer', v.soat_vencimiento],
            ['RTM', 'rtm_proximo_vencer', v.rtm_vencimiento],
            ['Extintor', 'extintor_proximo_vencer', v.extintor_vencimiento],
        ];
        for (const [categoria, tipo, vence] of docs) {
            if (!vence) continue;
            const dias = diasHasta(vence);
            if (enRango(dias)) {
                items.push({ categoria, tipo, vence, dias, sujeto: v.placa || '—', sede_id: v.sede_id, vehiculo_id: v.id });
            }
        }
    }

    const { data: conductores } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, sede_id, licencia_vencimiento')
        .eq('rol', 'conductor')
        .eq('activo', true);

    for (const c of conductores || []) {
        if (!c.licencia_vencimiento) continue;
        const dias = diasHasta(c.licencia_vencimiento);
        if (enRango(dias)) {
            items.push({ categoria: 'Licencia', tipo: 'licencia_proxima_vencer', vence: c.licencia_vencimiento, dias, sujeto: c.nombre_completo || '—', sede_id: c.sede_id, conductor_id: c.id });
        }
    }

    items.sort((a, b) => a.dias - b.dias);
    return items;
};
