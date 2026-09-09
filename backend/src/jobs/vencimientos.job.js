// Job diario de vencimientos (node-cron).
//
// Cada manana: arma la lista de documentos por vencer, crea las notificaciones
// en la campanita (con dedup de 7 dias para no repetir a diario) y manda un
// correo-resumen por admin con lo que esta por vencer en su sede.
import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { correoHabilitado } from '../config/email.js';
import { obtenerVencimientos } from '../services/vencimientos.service.js';
import { crearNotificacion } from '../services/notificaciones.service.js';
import { enviarCorreo, plantillaDigestVencimientos, obtenerMapaEmails } from '../services/email.service.js';
import { cabeceraDeSede, fechaLarga } from '../services/export/branding.js';

const DEDUPE_HORAS = 24 * 7; // no repetir el mismo aviso (mismo doc) en 7 dias

// Ejecuta una revision completa. Exportada para poder dispararla manualmente.
export const ejecutarRevisionVencimientos = async () => {
    let items = [];
    try {
        items = await obtenerVencimientos();
    } catch (e) {
        console.error('[vencimientos] error consultando vencimientos:', e.message);
        return { items: 0, notifsCreadas: 0, correosEnviados: 0, error: e.message };
    }
    console.log(`[vencimientos] revision: ${items.length} documento(s) por vencer`);

    // 1) Notificaciones en la campanita (una por item, fan-out a los admins de la sede)
    let notifsCreadas = 0;
    for (const it of items) {
        const esVeh = Boolean(it.vehiculo_id);
        const estado = it.dias <= 0 ? 'esta VENCIDO' : `vence en ${it.dias} día${it.dias === 1 ? '' : 's'}`;
        try {
            const r = await crearNotificacion({
                tipo: it.tipo,
                titulo: `${it.categoria} por vencer`,
                mensaje: `${it.categoria} de ${esVeh ? `vehículo ${it.sujeto}` : it.sujeto} ${estado} (${fechaLarga(it.vence)}).`,
                url_destino: esVeh ? `/admin/vehiculos/${it.vehiculo_id}` : `/admin/usuarios/${it.conductor_id}`,
                sede_id: it.sede_id,
                vehiculo_id: it.vehiculo_id || null,
                conductor_id: it.conductor_id || null,
                dedupeHoras: DEDUPE_HORAS,
                maxPorVentana: 1,
                soloSede: true, // el vencimiento es del Coordinador de la sede (no sube a Regional/Nacional)
            });
            notifsCreadas += r.cantidadCreada || 0;
        } catch (e) {
            console.warn('[vencimientos] no se pudo crear notif:', e.message);
        }
    }

    // 2) Correo-resumen al COORDINADOR DE FLOTA de cada sede (solo si el correo
    //    esta habilitado). Es una tarea operativa de la sede: va unicamente a los
    //    admins ASIGNADOS A UNA SEDE (sede_id), NO escala al Director Regional ni
    //    al Nacional (seria mucho correo y no es su gestion directa).
    let correosEnviados = 0;
    if (correoHabilitado && items.length > 0) {
        const { data: admins } = await supabase
            .from('usuarios')
            .select('id, sede_id')
            .neq('rol', 'conductor')
            .eq('activo', true)
            .not('sede_id', 'is', null); // solo Coordinadores de Flota (admins de sede)
        const emailPorId = await obtenerMapaEmails();
        let sinEmail = 0;

        for (const admin of admins || []) {
            const email = emailPorId.get(admin.id);
            if (!email) { sinEmail++; continue; }
            const susItems = items.filter((it) => it.sede_id === admin.sede_id);
            if (susItems.length === 0) continue;
            const sedeNombre = (await cabeceraDeSede(admin.sede_id)).sedeNombre;
            const html = plantillaDigestVencimientos({ items: susItems, sedeNombre });
            const r = await enviarCorreo({
                para: email,
                asunto: `Documentos por vencer (${susItems.length})`,
                html,
            });
            if (r.enviado) correosEnviados++;
        }
        if (sinEmail > 0) {
            console.warn(`[vencimientos] ${sinEmail} coordinador(es) de sede sin email — no recibieron el resumen.`);
        }
    } else if (!correoHabilitado) {
        console.log('[vencimientos] correo deshabilitado: solo se llenó la campanita');
    }

    const resumen = { items: items.length, notifsCreadas, correosEnviados };
    console.log('[vencimientos] listo:', resumen);
    return resumen;
};

let tarea = null;

export const iniciarCronVencimientos = () => {
    const expr = process.env.CRON_VENCIMIENTOS || '0 7 * * *';
    if (typeof cron.validate === 'function' && !cron.validate(expr)) {
        console.error(`[vencimientos] CRON_VENCIMIENTOS invalido ("${expr}") — el aviso diario NO se programara. Revisa el .env.`);
        return;
    }
    try {
        tarea = cron.schedule(
            expr,
            () => { ejecutarRevisionVencimientos().catch((e) => console.error('[vencimientos] error en cron:', e.message)); },
            { timezone: 'America/Bogota' }
        );
        console.log(`[vencimientos] cron programado: "${expr}" (America/Bogota)`);
    } catch (e) {
        console.warn(`[vencimientos] no se pudo programar el cron ("${expr}"):`, e.message);
    }
};

export const detenerCronVencimientos = () => {
    if (tarea) { tarea.stop(); tarea = null; }
};
