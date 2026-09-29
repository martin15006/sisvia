// Solicitudes de cita desde la portada publica (pacto portada-publica).
// Recibir (HU-02), avisar al equipo SISVIA (HU-03) y atenderlas (HU-04). Las ve
// solo el superadmin: una solicitud no es dato de ninguna empresa (no tiene empresa_id).
import { supabase } from '../config/supabase.js';
import { MARCA } from '../config/marca.js';
import { crearNotificacionDirecta, marcarLeidasDe } from './notificaciones.service.js';
import { enviarCorreo, plantillaSolicitud } from './email.service.js';
import { MENSAJES_SOLICITUD, enlaceWhatsApp, procesarSolicitud, filaDeRegistro, rutaDeSolicitud, TIPO_AVISO } from './solicitudReglas.js';
import { insertarConRespaldo } from './respaldo.service.js';

const errorDe = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const CAMPOS = 'id, empresa, ciudad, vehiculos, nombre, telefono, correo, mensaje, estado, contactada_por_nombre, contactada_en, created_at';

const paraCliente = (s) => ({ ...s, whatsapp: enlaceWhatsApp(s.telefono) });

const guardar = async (datos) => {
    const { data, error } = await supabase.from('solicitudes').insert(datos).select(CAMPOS).single();
    if (error) throw error;
    return data;
};

const idsEquipo = async () => {
    const { data, error } = await supabase.from('usuarios').select('id').eq('rol', 'superadmin').eq('activo', true);
    if (error) throw error;
    return (data || []).map((u) => u.id);
};

// POST publico. Devuelve { ok, errores? }. Los avisos salen en segundo plano: quien
// llena el formulario no espera al correo.
export const recibirSolicitud = async (cuerpo) => {
    const resultado = await procesarSolicitud(cuerpo, {
        guardar,
        idsEquipo,
        notificar: ({ ids, titulo, mensaje, ruta }) =>
            crearNotificacionDirecta({ destinatarioIds: ids, tipo: TIPO_AVISO, titulo, mensaje, url_destino: ruta }),
        enviarCorreo: ({ para, asunto, fila }) =>
            enviarCorreo({ para, asunto, html: plantillaSolicitud({ ...fila, whatsapp: enlaceWhatsApp(fila.telefono) }) }),
        contacto: MARCA.contacto.correo,
        copia: process.env.SOLICITUDES_COPIA,
        registrar: (err) => console.error('[solicitudes] no salio un aviso:', err.message || err),
    });
    resultado.avisos?.then((r) => {
        if (r.correo?.enviado) console.log(`[solicitudes] aviso: campanita a ${r.campanita}, correo a ${r.correo.cantidad}`);
        else if (r.correo && !r.correo.omitido) console.error('[solicitudes] el correo no salio:', r.correo.error || r.correo);
    });
    return resultado;
};

// HU-04.2: de la mas nueva a la mas vieja.
export const listarSolicitudes = async () => {
    const { data, error } = await supabase.from('solicitudes').select(CAMPOS).order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data || []).map(paraCliente);
};

// HU-04.1: la cantidad de nuevas, para el menu.
export const contarNuevas = async () => {
    const { count, error } = await supabase.from('solicitudes').select('id', { count: 'exact', head: true }).eq('estado', 'nueva');
    if (error) throw error;
    return count || 0;
};

// HU-04.3 · CB-08: solo si sigue nueva. Si otro ya la marco, se devuelve como quedo, sin error.
export const marcarContactada = async (usuario, id) => {
    const { data, error } = await supabase.from('solicitudes')
        .update({ estado: 'contactada', contactada_por: usuario.id, contactada_por_nombre: usuario.nombre_completo, contactada_en: new Date().toISOString() })
        .eq('id', id).eq('estado', 'nueva').select(CAMPOS).maybeSingle();
    if (error) throw error;
    if (data) {
        await anotarEnRegistro({ usuario, solicitud: data, accion: 'contactada' });
        await dejarLeidosSusAvisos(id);
        return paraCliente(data);
    }
    const { data: actual, error: e2 } = await supabase.from('solicitudes').select(CAMPOS).eq('id', id).maybeSingle();
    if (e2) throw e2;
    if (!actual) throw errorDe(404, MENSAJES_SOLICITUD.noEncontrada);
    await dejarLeidosSusAvisos(id); // CB-19: aunque otro ya la hubiera marcado
    return paraCliente(actual);
};

// HU-04.7 (enmienda 2): contactada, su aviso de la campanita queda leido para todo el
// equipo. Si falla, la solicitud igual queda contactada: queda en el log.
const dejarLeidosSusAvisos = async (id) => {
    try {
        await marcarLeidasDe({ tipo: TIPO_AVISO, url_destino: rutaDeSolicitud(id) });
    } catch (err) {
        console.error('[solicitudes] no se pudieron marcar leidos sus avisos:', err.message);
    }
};

// HU-04.3 (enmienda 1): se borra solo una ya contactada; borrar es de verdad (spam, o
// quien pide que borren sus datos). CB-13: una "Nueva" responde 409 y queda.
export const borrarSolicitud = async (usuario, id) => {
    const { data, error } = await supabase.from('solicitudes').delete()
        .eq('id', id).eq('estado', 'contactada').select('id, empresa, ciudad');
    if (error) throw error;
    if (data?.length) {
        await anotarEnRegistro({ usuario, solicitud: data[0], accion: 'borrada' });
        return;
    }
    const { data: actual, error: e2 } = await supabase.from('solicitudes').select('id').eq('id', id).maybeSingle();
    if (e2) throw e2;
    throw actual ? errorDe(409, MENSAJES_SOLICITUD.primeroContactada) : errorDe(404, MENSAJES_SOLICITUD.noEncontrada);
};

// HU-04.5 · HU-07: al Registro del equipo, con la IP y el navegador. Si no se puede
// anotar, la accion ya hecha no se deshace: queda en el log.
const anotarEnRegistro = async ({ usuario, solicitud, accion }) => {
    try {
        const { error } = await insertarConRespaldo('actividad', filaDeRegistro({ usuario, solicitud, accion }));
        if (error) console.error('[solicitudes] no se pudo anotar en el Registro del equipo:', error.message);
    } catch (err) {
        console.error('[solicitudes] no se pudo anotar en el Registro del equipo:', err.message);
    }
};
