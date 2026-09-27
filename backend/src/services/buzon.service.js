// "Escribir a SISVIA" (pacto para-empresas, HU-18 · RN-12 · RN-13 · RNF-10).
// El Administrador de empresa escribe; el equipo SISVIA responde en el mismo hilo
// hasta marcarlo resuelto. Los adjuntos van a Cloudinary en modo PRIVADO
// ("authenticated"): no hay un enlace publico, se sirven por la API con sesion.
import { supabase } from '../config/supabase.js';
import { cloudinary } from '../config/cloudinary.js';
import { MARCA } from '../config/marca.js';
import { deLaEmpresa } from './scopeReglas.js';
import { etiquetaCargo } from './export/branding.js';
import { crearNotificacionDirecta } from './notificaciones.service.js';
import { emailsDeUsuarios, enviarCorreo, plantillaBuzon } from './email.service.js';
import {
    TIPOS_BUZON, MENSAJES_BUZON, ESTADOS_BUZON, puedeEscribir, validarMensaje, validarTexto, validarAdjunto,
    recursoDeAdjunto, estadoAlAbrir, puedeResponder, destinatariosDeRespuesta, ordenarBandeja,
    limpiarPantalla, describirNavegador,
} from './buzonReglas.js';
import {
    VENTANA_MIRANDO, FRENO_VISTO_MS, MENSAJES_CORREOS, conCorreosPrendidos, destinatariosCorreoEquipo, reclamosALiberar,
} from './correosSoporteReglas.js';

const errorDe = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const esSisvia = (usuario) => usuario?.rol === 'superadmin';

const CAMPOS = `id, empresa_id, autor_id, autor_nombre, autor_cargo, tipo, mensaje, estado, pantalla, navegador,
    adjunto_id, adjunto_recurso, adjunto_formato, adjunto_nombre, adjunto_bytes, resuelto_en, created_at, actualizado_en,
    atiende_id, empresa:empresa_id ( nombre )`;
const CAMPOS_RESPUESTA = 'id, mensaje_id, autor_nombre, de_sisvia, texto, adjunto_id, adjunto_recurso, adjunto_formato, adjunto_nombre, adjunto_bytes, created_at';

// Lo que ve el navegador: sin el id interno de Cloudinary.
const adjuntoPublico = (fila) => (fila.adjunto_id ? { nombre: fila.adjunto_nombre, formato: fila.adjunto_formato, bytes: fila.adjunto_bytes } : null);
const paraCliente = (m) => {
    const { adjunto_id: _i, adjunto_recurso: _r, adjunto_formato: _f, adjunto_nombre: _n, adjunto_bytes: _b, atiende_id: _a, empresa, respuestas, ...resto } = m;
    return {
        ...resto,
        empresa_nombre: empresa?.nombre || null,
        tipo_texto: TIPOS_BUZON[m.tipo] || m.tipo,
        estado_texto: ESTADOS_BUZON[m.estado] || m.estado,
        adjunto: adjuntoPublico(m),
        ...(Array.isArray(respuestas) && respuestas[0]?.count !== undefined ? { cantidad_respuestas: respuestas[0].count } : {}),
    };
};
const respuestaParaCliente = (r) => {
    const { adjunto_id: _i, adjunto_recurso: _r, adjunto_formato: _f, adjunto_nombre: _n, adjunto_bytes: _b, ...resto } = r;
    return { ...resto, adjunto: adjuntoPublico(r) };
};

// ----- Adjuntos privados (RNF-10 · CB-18) -----

const nombreSeguro = (nombre) => String(nombre || 'adjunto').replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, '_').slice(0, 120);

// Valida y sube. Si Cloudinary falla, no se guarda nada (CB-18).
const subirAdjunto = async (archivo, empresaId) => {
    if (!archivo) return {};
    const error = validarAdjunto({ mimetype: archivo.mimetype, size: archivo.size, inicio: archivo.buffer.subarray(0, 8) });
    if (error) throw errorDe(400, error);
    const recurso = recursoDeAdjunto(archivo.mimetype);
    try {
        const subido = await new Promise((listo, fallo) => {
            cloudinary.uploader.upload_stream(
                { resource_type: recurso, type: 'authenticated', folder: `sisvia/buzon/${empresaId}` },
                (err, resultado) => (err ? fallo(err) : listo(resultado)),
            ).end(archivo.buffer);
        });
        return {
            adjunto_id: subido.public_id,
            adjunto_recurso: recurso,
            adjunto_formato: archivo.mimetype,
            adjunto_nombre: nombreSeguro(archivo.originalname),
            adjunto_bytes: archivo.size,
        };
    } catch (err) {
        console.error('[buzon] no se pudo subir el adjunto:', err.message || err);
        throw errorDe(502, MENSAJES_BUZON.subidaFallida);
    }
};

// Si la fila no se pudo guardar, el archivo subido no queda suelto.
const borrarAdjunto = async (datos) => {
    if (!datos?.adjunto_id) return;
    try {
        await cloudinary.uploader.destroy(datos.adjunto_id, { resource_type: datos.adjunto_recurso, type: 'authenticated' });
    } catch (err) {
        console.error('[buzon] no se pudo borrar el adjunto huerfano:', err.message || err);
    }
};

// ----- Quien recibe los avisos -----

const idsActivos = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((u) => u.id);
};
const equipoSisvia = () => idsActivos(supabase.from('usuarios').select('id').eq('rol', 'superadmin').eq('activo', true));
const adminsDeEmpresa = (empresaId) => idsActivos(
    deLaEmpresa(supabase.from('usuarios').select('id').eq('rol', 'admin_empresa').eq('activo', true), empresaId));

// ----- Correos: uno por conversacion hasta que la abras (pacto correos-de-soporte) -----

// El equipo SISVIA con su interruptor (HU-02 · HU-03), y el interruptor de otras personas.
const equipoParaCorreo = async () => {
    const { data, error } = await supabase.from('usuarios').select('id, correos_soporte').eq('rol', 'superadmin').eq('activo', true);
    if (error) throw error;
    return data || [];
};
const conInterruptorPrendido = async (ids) => {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('usuarios').select('id, correos_soporte').in('id', ids);
    if (error) throw error;
    return conCorreosPrendidos(data || []);
};

// RN-01: "la vio" al abrirla, responder o escribirla. Abierta en pantalla se pide cada
// segundo: al abrir se anota a lo sumo cada 30 s por persona. Si falla, no frena nada.
const vistoReciente = new Map();
const marcarVisto = async (mensajeId, usuarioId, { frenar = false } = {}) => {
    if (!usuarioId) return;
    const clave = `${mensajeId}:${usuarioId}`;
    const ahora = Date.now();
    if (frenar && ahora - (vistoReciente.get(clave) || 0) < FRENO_VISTO_MS) return;
    if (vistoReciente.size > 5000) vistoReciente.clear();
    vistoReciente.set(clave, ahora);
    const { error } = await supabase.rpc('marcar_visto_buzon', { p_mensaje: mensajeId, p_usuario: usuarioId });
    if (error) console.error('[buzon] no se pudo anotar que la vio:', error.message);
};

// HU-01: la base decide y anota, en una sola operacion, a quien de correoIds le toca
// (CB-01). Sale un solo correo a esos; si el envio falla, se liberan (CB-02).
const mandarCorreo = async ({ mensajeId, correoIds, titulo, encabezado, texto, ruta, organizacion }) => {
    if (!correoIds.length) return;
    const { data: reclamos, error } = await supabase.rpc('reclamar_correo_buzon', {
        p_mensaje: mensajeId, p_usuarios: correoIds, p_ventana: VENTANA_MIRANDO,
    });
    if (error) throw error;
    if (!reclamos?.length) return;
    const para = await emailsDeUsuarios(reclamos.map((r) => r.usuario_id));
    const resultado = para.length
        ? await enviarCorreo({ para, asunto: titulo, html: plantillaBuzon({ titulo, encabezado, texto, ruta, organizacion, pie: MENSAJES_CORREOS.pie }) })
        : null;
    for (const r of reclamosALiberar(resultado, reclamos)) {
        await supabase.rpc('liberar_correo_buzon', { p_mensaje: mensajeId, p_usuario: r.usuario_id, p_anterior: r.correo_anterior, p_reclamado: r.correo_nuevo });
    }
};

// La campanita, a todos los de `ids`, como siempre (RN-03). El correo, a los de
// `correoIds` que les toque, en segundo plano: no hace esperar a quien escribe, y si
// falla no frena nada.
const avisar = async ({ mensajeId, ids, correoIds = [], titulo, texto, encabezado, ruta, organizacion }) => {
    if (!ids.length) return;
    await crearNotificacionDirecta({ destinatarioIds: ids, tipo: 'buzon', titulo, mensaje: texto.slice(0, 500), url_destino: ruta });
    mandarCorreo({ mensajeId, correoIds, titulo, encabezado, texto, ruta, organizacion })
        .catch((err) => console.error('[buzon] no salio el correo:', err.message || err));
};

// ----- Lo que usan las rutas -----

// Un mensaje que el usuario puede ver: el equipo SISVIA, todos; la empresa, los suyos.
// Lo de otra empresa responde como si no existiera (RN-01).
const mensajeVisible = async (usuario, id) => {
    let query = supabase.from('buzon_mensajes').select(CAMPOS).eq('id', id);
    if (!esSisvia(usuario)) query = deLaEmpresa(query, usuario.empresa_id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) throw errorDe(404, 'Mensaje no encontrado');
    return data;
};

// HU-18.1-3: el Administrador de empresa escribe.
export const escribirASisvia = async (usuario, cuerpo, archivo, agente) => {
    if (!puedeEscribir(usuario.rol)) throw errorDe(403, MENSAJES_BUZON.soloAdmin);
    const valido = validarMensaje(cuerpo);
    if (valido.error) throw errorDe(400, valido.error);
    const adjunto = await subirAdjunto(archivo, usuario.empresa_id);

    const { data: fila, error } = await supabase.from('buzon_mensajes').insert({
        empresa_id: usuario.empresa_id,
        autor_id: usuario.id,
        autor_nombre: usuario.nombre_completo,
        autor_cargo: etiquetaCargo(usuario.rol, usuario.es_pool),
        ...valido.datos,
        pantalla: limpiarPantalla(cuerpo.pantalla),
        navegador: describirNavegador(agente),
        ...adjunto,
    }).select(CAMPOS).single();
    if (error) {
        await borrarAdjunto(adjunto);
        throw error;
    }

    const empresa = fila.empresa?.nombre || usuario.empresa_nombre || 'Una empresa';
    await marcarVisto(fila.id, usuario.id);   // RN-01: quien la escribe, la vio
    await avisar({
        mensajeId: fila.id,
        ids: await equipoSisvia(),
        // HU-01.1 · HU-02.1: conversacion nueva, nadie la atiende todavia
        correoIds: destinatariosCorreoEquipo({ equipo: await equipoParaCorreo(), atiende: null }),
        titulo: `${empresa} escribió a ${MARCA.nombre} · ${TIPOS_BUZON[fila.tipo]}`,
        encabezado: `${fila.autor_nombre} (${fila.autor_cargo}) · ${empresa}`,
        texto: fila.mensaje,
        ruta: `/admin/soporte/${fila.id}`,
        organizacion: empresa,
    });
    return { mensaje: paraCliente(fila), aviso: MENSAJES_BUZON.enviado };
};

// HU-18.4 y 18.8: la bandeja. El equipo SISVIA ve todas; la empresa, las suyas.
export const listarMensajes = async (usuario, { estado } = {}) => {
    let query = supabase.from('buzon_mensajes').select(`${CAMPOS}, respuestas:buzon_respuestas ( count )`)
        .order('actualizado_en', { ascending: false }).limit(500);
    if (!esSisvia(usuario)) query = deLaEmpresa(query, usuario.empresa_id);
    if (estado && ESTADOS_BUZON[estado]) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw error;
    return ordenarBandeja(data || []).map(paraCliente);
};

// El numero del menu del equipo SISVIA (HU-18.4).
export const contarNuevos = async () => {
    const { count, error } = await supabase.from('buzon_mensajes').select('id', { count: 'exact', head: true }).eq('estado', 'nuevo');
    if (error) throw error;
    return count || 0;
};

// HU-18.4-6: abrir un mensaje con su hilo. Si lo abre SISVIA y era Nuevo, pasa a En revision.
export const abrirMensaje = async (usuario, id) => {
    const mensaje = await mensajeVisible(usuario, id);
    await marcarVisto(id, usuario.id, { frenar: true });   // RN-01 · HU-01.3-4
    const nuevoEstado = estadoAlAbrir(mensaje.estado, usuario.rol);
    if (nuevoEstado !== mensaje.estado) {
        const ahora = new Date().toISOString();
        // Abrirlo no es actividad: no cambia su lugar en la bandeja (actualizado_en).
        const { error } = await supabase.from('buzon_mensajes').update({ estado: nuevoEstado }).eq('id', id);
        if (error) throw error;
        mensaje.estado = nuevoEstado;
    }
    const { data: respuestas, error } = await supabase.from('buzon_respuestas').select(CAMPOS_RESPUESTA)
        .eq('mensaje_id', id).order('created_at', { ascending: true });
    if (error) throw error;
    return {
        ...paraCliente(mensaje),
        respuestas: (respuestas || []).map(respuestaParaCliente),
        ...(mensaje.estado === 'resuelto' ? { aviso_resuelto: MENSAJES_BUZON.resuelto } : {}),
    };
};

// HU-18.5 · CB-19: responder en el hilo, mientras no este resuelto.
export const responderMensaje = async (usuario, id, cuerpo, archivo) => {
    const mensaje = await mensajeVisible(usuario, id);
    if (!esSisvia(usuario) && !puedeEscribir(usuario.rol)) throw errorDe(403, MENSAJES_BUZON.soloAdmin);
    if (!puedeResponder(mensaje.estado)) throw errorDe(400, MENSAJES_BUZON.resuelto);
    const valido = validarTexto(cuerpo?.texto);
    if (valido.error) throw errorDe(400, valido.error);
    const adjunto = await subirAdjunto(archivo, mensaje.empresa_id);
    const deSisvia = esSisvia(usuario);

    const { data: respuesta, error } = await supabase.from('buzon_respuestas').insert({
        mensaje_id: id,
        empresa_id: mensaje.empresa_id,
        autor_id: usuario.id,
        autor_nombre: usuario.nombre_completo,
        de_sisvia: deSisvia,
        texto: valido.texto,
        ...adjunto,
    }).select(CAMPOS_RESPUESTA).single();
    if (error) {
        await borrarAdjunto(adjunto);
        throw error;
    }
    // HU-02.2 · CB-05: quien del equipo responde se queda con la conversacion.
    const cambios = {
        actualizado_en: respuesta.created_at,
        ...(deSisvia && mensaje.estado === 'nuevo' ? { estado: 'en_revision' } : {}),
        ...(deSisvia ? { atiende_id: usuario.id } : {}),
    };
    await supabase.from('buzon_mensajes').update(cambios).eq('id', id);
    await marcarVisto(id, usuario.id);   // RN-01: responder cuenta como abrirla

    const empresa = mensaje.empresa?.nombre || '';
    let autor = null;
    if (mensaje.autor_id) {
        const { data } = await supabase.from('usuarios').select('id, activo').eq('id', mensaje.autor_id).maybeSingle();
        autor = data;
    }
    const ids = destinatariosDeRespuesta({
        deSisvia,
        autor,
        adminsActivos: deSisvia ? await adminsDeEmpresa(mensaje.empresa_id) : [],
        equipoSisvia: deSisvia ? [] : await equipoSisvia(),
    });
    await avisar({
        mensajeId: id,
        ids,
        // HU-01.5 · HU-03.3: a la empresa, con su interruptor. HU-02: al equipo, segun quien la atiende.
        correoIds: deSisvia
            ? await conInterruptorPrendido(ids)
            : destinatariosCorreoEquipo({ equipo: await equipoParaCorreo(), atiende: mensaje.atiende_id }),
        titulo: deSisvia ? `${MARCA.nombre} respondió: ${TIPOS_BUZON[mensaje.tipo]}` : `${empresa} respondió en Soporte`,
        encabezado: `${respuesta.autor_nombre}${deSisvia ? ` · equipo ${MARCA.nombre}` : ` · ${empresa}`}`,
        texto: respuesta.texto,
        ruta: `/admin/soporte/${id}`,
        organizacion: empresa,
    });
    return { respuesta: respuestaParaCliente(respuesta) };
};

// HU-18.6 · RN-13: solo el equipo SISVIA lo marca resuelto, y ahi se cierra.
export const resolverMensaje = async (usuario, id) => {
    if (!esSisvia(usuario)) throw errorDe(403, MENSAJES_BUZON.soloSisviaResuelve);
    const mensaje = await mensajeVisible(usuario, id);
    if (mensaje.estado !== 'resuelto') {
        const ahora = new Date().toISOString();
        const { error } = await supabase.from('buzon_mensajes')
            .update({ estado: 'resuelto', resuelto_en: ahora, resuelto_por: usuario.id, actualizado_en: ahora }).eq('id', id);
        if (error) throw error;
        let autor = null;
        if (mensaje.autor_id) {
            const { data } = await supabase.from('usuarios').select('id, activo').eq('id', mensaje.autor_id).maybeSingle();
            autor = data;
        }
        await marcarVisto(id, usuario.id);   // RN-01
        const ids = destinatariosDeRespuesta({ deSisvia: true, autor, adminsActivos: await adminsDeEmpresa(mensaje.empresa_id) });
        await avisar({
            mensajeId: id,
            ids,
            correoIds: await conInterruptorPrendido(ids),   // HU-01.5 · HU-03.3
            titulo: `${MARCA.nombre} marcó como resuelto: ${TIPOS_BUZON[mensaje.tipo]}`,
            encabezado: `Equipo ${MARCA.nombre}`,
            texto: MENSAJES_BUZON.resuelto,
            ruta: `/admin/soporte/${id}`,
            organizacion: mensaje.empresa?.nombre || '',
        });
    }
    return abrirMensaje(usuario, id);
};

// RNF-10: el archivo se pide a Cloudinary con una URL firmada que nunca sale del
// servidor, y se le pasa al navegador solo a quien puede ver el mensaje.
export const obtenerAdjunto = async (usuario, id, respuestaId = null) => {
    const mensaje = await mensajeVisible(usuario, id);
    let fila = mensaje;
    if (respuestaId) {
        const { data, error } = await supabase.from('buzon_respuestas').select(CAMPOS_RESPUESTA)
            .eq('id', respuestaId).eq('mensaje_id', id).maybeSingle();
        if (error) throw error;
        fila = data;
    }
    if (!fila?.adjunto_id) throw errorDe(404, 'Adjunto no encontrado');
    const url = cloudinary.url(fila.adjunto_id, { resource_type: fila.adjunto_recurso, type: 'authenticated', sign_url: true, secure: true });
    const r = await fetch(url);
    if (!r.ok) throw errorDe(502, 'No se pudo traer el archivo. Intenta de nuevo.');
    return { contenido: Buffer.from(await r.arrayBuffer()), formato: fila.adjunto_formato, nombre: fila.adjunto_nombre };
};
