// Servicio de notificaciones (Bloque C).
//
// Define el helper crearNotificacion(...) que se usa desde los controllers
// de chequeos (cuando ocurre un evento como abandono, chequeo no operativo,
// intento bloqueado, etc).
//
// Decision de diseño: la notificacion va a TODOS los admins activos del
// sede afectada. Asi cualquiera de ellos puede atenderla sin que dependa
// de uno solo. Cuando uno la marca como leida, se marca solo para ese.

import { supabase } from '../config/supabase.js';
import { poolsVigentesEnSede } from './suplencias.service.js';

// Roles que pueden recibir notificaciones administrativas (todos los niveles).
const ROLES_DESTINATARIOS = [
    'admin',
    'admin_sede',
    'admin_departamental',
    'superadmin',
];

// resolverDestinatariosSede: devuelve los IDs de los usuarios que deben recibir
// un aviso de una sede dada. Misma regla de scope que usa la campanita:
//   - sede_id null             -> TODOS los admins activos
//   - admin SIN sede (global)  -> recibe todo
//   - admin CON sede           -> solo si coincide con el del evento
//   - + pool con suplencia VIGENTE en esa sede (actua como Coordinador)
// Se usa para la campanita Y para los correos de avisos importantes.
//
// Nota: usamos .neq('rol', 'conductor') (no .in(roles)) porque rol es un ENUM en BD;
// "todos los que no son conductor" = todos los admins, robusto ante cambios del enum.
export const resolverDestinatariosSede = async (sede_id = null, { soloSede = false } = {}) => {
    const { data: todosAdmins, error } = await supabase
        .from('usuarios')
        .select('id, sede_id')
        .neq('rol', 'conductor')
        .eq('activo', true);
    if (error) {
        console.error('[notificaciones] error obteniendo destinatarios:', error);
        return [];
    }
    const ids = (todosAdmins || [])
        .filter((u) => {
            if (!sede_id) return true;
            // soloSede: UNICAMENTE los admins de esa sede (Coordinador de sede).
            // Por defecto tambien reciben los globales/departamentales (sin sede).
            if (soloSede) return u.sede_id === sede_id;
            return !u.sede_id || u.sede_id === sede_id;
        })
        .map((u) => u.id);

    if (sede_id) {
        const poolIds = await poolsVigentesEnSede(sede_id);
        const set = new Set(ids);
        for (const poolId of poolIds) {
            if (poolId && !set.has(poolId)) { ids.push(poolId); set.add(poolId); }
        }
    }
    return ids;
};

// crearNotificacion: crea una entrada de notificacion para cada admin que aplique.
//
// Parametros:
//   tipo         — uno de los valores permitidos en el CHECK constraint de la tabla
//   titulo       — texto corto que aparece en la lista
//   mensaje      — descripcion mas larga
//   url_destino  — a donde llevar al admin si hace clic (opcional)
//   sede_id    — si esta dado, solo notifica a admins de esa sede (multi-tenant)
//                  si es null, notifica a todos los admins activos
//   contexto     — { chequeo_id?, vehiculo_id?, conductor_id? }
//
// Devuelve { cantidadCreada: N } o lanza error si algo falla.
//
// Limite de frecuencia (opcional): si se pasan dedupeHoras + maxPorVentana,
// solo se permite crear hasta `maxPorVentana` notificaciones del mismo tipo para
// el mismo conductor dentro de esa ventana de horas. Asi el admin recibe el aviso
// varias veces (para que no se le pase) pero sin saturarse.
// Ej: dedupeHoras=24, maxPorVentana=5 -> hasta 5 avisos por dia por conductor.
export const crearNotificacion = async ({
    tipo,
    titulo,
    mensaje,
    url_destino = null,
    sede_id = null,
    chequeo_id = null,
    vehiculo_id = null,
    conductor_id = null,
    dedupeHoras = null,
    maxPorVentana = 1,
    soloSede = false,
}) => {
    if (!tipo || !titulo || !mensaje) {
        throw new Error('tipo, titulo y mensaje son obligatorios');
    }

    // Control de frecuencia: contar cuantas notificaciones del mismo tipo para el
    // mismo conductor O vehiculo existen en la ventana. Si ya se alcanzo el maximo,
    // no crear. (Sirve para no repetir a diario los avisos de vencimiento.)
    if (dedupeHoras && (conductor_id || vehiculo_id)) {
        const desde = new Date(Date.now() - dedupeHoras * 60 * 60 * 1000).toISOString();
        let q = supabase
            .from('notificaciones')
            .select('id', { count: 'exact', head: true })
            .eq('tipo', tipo)
            .gte('created_at', desde);
        if (conductor_id) q = q.eq('conductor_id', conductor_id);
        if (vehiculo_id) q = q.eq('vehiculo_id', vehiculo_id);
        const { count } = await q;
        if (count && count >= maxPorVentana) {
            return { cantidadCreada: 0, omitidaPorLimite: true };
        }
    }

    const destinatarioIds = await resolverDestinatariosSede(sede_id, { soloSede });

    if (destinatarioIds.length === 0) {
        // No hay a quien notificar — no es un error, solo no se crea nada
        return { cantidadCreada: 0 };
    }

    // Construir una fila por destinatario
    const filas = destinatarioIds.map((id) => ({
        destinatario_id: id,
        tipo,
        titulo,
        mensaje,
        url_destino,
        chequeo_id,
        vehiculo_id,
        conductor_id,
    }));

    const { error: errInsert } = await supabase
        .from('notificaciones')
        .insert(filas);

    if (errInsert) {
        console.error('[notificaciones] error insertando:', errInsert);
        return { cantidadCreada: 0 };
    }

    return { cantidadCreada: filas.length };
};


// crearNotificacionDirecta: crea una notificacion para destinatarios ESPECIFICOS
// (no broadcast por sede). La usa el escalado de informes para avisarle al
// superior puntual.
export const crearNotificacionDirecta = async ({ destinatarioIds, tipo, titulo, mensaje, url_destino = null }) => {
    const ids = [...new Set((destinatarioIds || []).filter(Boolean))];
    if (!tipo || !titulo || !mensaje) throw new Error('tipo, titulo y mensaje son obligatorios');
    if (ids.length === 0) return { cantidadCreada: 0 };
    const filas = ids.map((id) => ({ destinatario_id: id, tipo, titulo, mensaje, url_destino }));
    const { error } = await supabase.from('notificaciones').insert(filas);
    if (error) {
        console.error('[notificaciones] error insert directo:', error);
        return { cantidadCreada: 0 };
    }
    return { cantidadCreada: filas.length };
};


// listarMisNotificaciones: lista paginada para el admin logueado.
export const listarMisNotificaciones = async ({
    destinatarioId,
    pagina = 1,
    limite = 20,
    soloNoLeidas = false,
}) => {
    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    let query = supabase
        .from('notificaciones')
        .select('*', { count: 'exact' })
        .eq('destinatario_id', destinatarioId)
        .order('created_at', { ascending: false })
        .range(desde, hasta);

    if (soloNoLeidas) {
        query = query.eq('leida', false);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
        notificaciones: data || [],
        total: count || 0,
        pagina,
        limite,
    };
};


// contarNoLeidas: solo el numero (para el badge de la campanita).
export const contarNoLeidas = async (destinatarioId) => {
    const { count, error } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', destinatarioId)
        .eq('leida', false);

    if (error) throw error;
    return count || 0;
};


// marcarLeida: marca una notificacion como leida (solo si es del usuario).
export const marcarLeida = async (notifId, usuarioId) => {
    const ahora = new Date().toISOString();
    const { data, error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_en: ahora })
        .eq('id', notifId)
        .eq('destinatario_id', usuarioId)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No encontrada (o no es del usuario)
            return null;
        }
        throw error;
    }
    return data;
};


// marcarTodasLeidas: marca TODAS las del usuario como leidas.
export const marcarTodasLeidas = async (usuarioId) => {
    const ahora = new Date().toISOString();
    const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_en: ahora })
        .eq('destinatario_id', usuarioId)
        .eq('leida', false);

    if (error) throw error;
    return { ok: true };
};
