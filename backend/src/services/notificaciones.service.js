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
import { elegirDestinatarios } from './notificacionesReglas.js';
import { deLaEmpresa } from './scopeReglas.js';

// Roles que pueden recibir notificaciones administrativas (todos los niveles).
const ROLES_DESTINATARIOS = [
    'admin',
    'admin_sede',
    'admin_departamental',
    'superadmin',
];

// resolverDestinatariosSede: devuelve los IDs de los usuarios que deben recibir
// un aviso de una sede dada. Misma regla de scope que usa la campanita:
//   - solo admins de la EMPRESA del evento (la de su sede); sin empresa, nadie
//   - admin de la empresa SIN sede (Administrador de empresa, Regional) -> recibe
//   - admin CON sede           -> solo si coincide con el del evento
//   - + pool con suplencia VIGENTE en esa sede (actua como Coordinador)
// Se usa para la campanita Y para los correos de avisos importantes.
//
// Nota: usamos .neq('rol', 'conductor') (no .in(roles)) porque rol es un ENUM en BD;
// "todos los que no son conductor" = todos los admins, robusto ante cambios del enum.
export const resolverDestinatariosSede = async (sede_id = null, { soloSede = false, empresa_id = null } = {}) => {
    // La empresa del evento: la de su sede o, si no hay sede, la que se pase.
    let empresaId = empresa_id;
    if (sede_id) {
        const { data: sede } = await supabase.from('sedes').select('empresa_id').eq('id', sede_id).maybeSingle();
        empresaId = sede?.empresa_id || null;
    }
    if (!empresaId) return [];

    const { data: admins, error } = await deLaEmpresa(
        supabase.from('usuarios').select('id, sede_id, empresa_id').neq('rol', 'conductor').eq('activo', true),
        empresaId
    );
    if (error) {
        console.error('[notificaciones] error obteniendo destinatarios:', error);
        return [];
    }
    // Regla pura con tests (notificacionesReglas.js): solo gente de la empresa.
    const ids = elegirDestinatarios(admins, { sedeId: sede_id, empresaId, soloSede });

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
    empresa_id = null,   // solo hace falta si el aviso no tiene sede
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

    const destinatarioIds = await resolverDestinatariosSede(sede_id, { soloSede, empresa_id });

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


// Avisos de UNA empresa (los que les llegaron a sus usuarios), con a quien le
// llego cada uno. Lo usa el superadmin dentro de una empresa (HU-16.1): ve sus
// avisos, no los propios. Solo lectura: marcarlos es cosa de cada destinatario.
export const listarNotificacionesDeEmpresa = async ({ empresaId, pagina = 1, limite = 20, soloNoLeidas = false }) => {
    const desde = (pagina - 1) * limite;
    let query = supabase
        .from('notificaciones')
        .select('*, destinatario:destinatario_id!inner(nombre_completo, empresa_id)', { count: 'exact' })
        .eq('destinatario.empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .range(desde, desde + limite - 1);
    if (soloNoLeidas) query = query.eq('leida', false);
    const { data, count, error } = await query;
    if (error) throw error;
    return { notificaciones: data || [], total: count || 0, pagina, limite, deEmpresa: true };
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


// marcarLeidasDe: marca leidas, para TODOS sus destinatarios, las de un tipo que
// llevan a una direccion exacta. La usa el contactar una solicitud de cita: su
// aviso ya no le sirve a nadie del equipo (pacto portada-publica, enmienda 2).
export const marcarLeidasDe = async ({ tipo, url_destino }) => {
    const { data, error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_en: new Date().toISOString() })
        .eq('tipo', tipo)
        .eq('url_destino', url_destino)
        .eq('leida', false)
        .select('id');
    if (error) throw error;
    return (data || []).length;
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
