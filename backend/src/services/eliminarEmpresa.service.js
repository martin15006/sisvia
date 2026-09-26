// Eliminar una empresa para siempre (pacto para-empresas, HU-05 · RN-06 · CB-07).
//
// Toda tabla de una empresa tiene empresa_id con ON DELETE CASCADE: borrar la
// fila de la empresa arrastra sus sedes, usuarios, vehiculos, chequeos (con sus
// respuestas y fotos), intentos, suplencias, avisos, catalogo propio, bloqueos y
// sus mensajes a SISVIA (CB-21) en UNA sola instruccion, que se hace entera o no
// se hace. Antes hay que:
//   1) juntar lo que vive afuera de la base: sus accesos (Supabase Auth) y sus
//      archivos (Cloudinary), porque despues ya no se sabe cuales eran;
//   2) borrar los historiales que apuntan a sus usuarios, vehiculos y chequeos
//      sin empresa_id (auditoria_chequeos, ademas, frena el borrado si queda).
// Si algo falla antes del paso 3 la empresa sigue ahi, y "Eliminar" se puede
// volver a intentar: cada paso borra solo lo que todavia exista.
import { supabase } from '../config/supabase.js';
import { cloudinary } from '../config/cloudinary.js';
import { obtenerMapaEmails } from './email.service.js';
import { motivoNoEliminar } from './empresasReglas.js';
import { deLaEmpresa } from './scopeReglas.js';
import { auditarEmpresa } from './empresas.service.js';

const PAGINA = 1000; // tope de filas por consulta de Supabase
const LOTE = 200;    // ids por consulta (viajan en la URL)

const errorDe = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const enLotes = (lista, tamano) => {
    const lotes = [];
    for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
    return lotes;
};

const todas = async (armar) => {
    const filas = [];
    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await armar().range(desde, desde + PAGINA - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < PAGINA) return filas;
    }
};

const borrarDonde = async (tabla, columna, ids) => {
    for (const lote of enLotes(ids, LOTE)) {
        const { error } = await supabase.from(tabla).delete().in(columna, lote);
        if (error) throw error;
    }
};

// URL de Cloudinary -> { tipo, id }. En los "raw" (el RUNT en PDF) la extension
// es parte del public_id; en las imagenes no.
const recursoDe = (url) => {
    const m = String(url || '').match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/i);
    if (!m) return null;
    const tipo = m[1].toLowerCase();
    return { tipo, id: tipo === 'raw' ? m[2] : m[2].replace(/\.[a-z0-9]+$/i, '') };
};

// Borra de a 100 (tope de la API). Devuelve cuantos no se pudieron borrar.
// `entrega`: "upload" (fotos, publicas) o "authenticated" (adjuntos del buzon, privados).
const borrarDeCloudinary = async (recursos) => {
    let fallidos = 0;
    const porTipo = new Map();
    for (const r of recursos) {
        const clave = `${r.tipo}|${r.entrega || 'upload'}`;
        if (!porTipo.has(clave)) porTipo.set(clave, new Set());
        porTipo.get(clave).add(r.id);
    }
    for (const [clave, ids] of porTipo) {
        const [tipo, entrega] = clave.split('|');
        for (const lote of enLotes([...ids], 100)) {
            try {
                const { deleted } = await cloudinary.api.delete_resources(lote, { resource_type: tipo, type: entrega });
                // "not_found" ya no estaba: cuenta como borrado.
                fallidos += Object.values(deleted || {}).filter((estado) => estado !== 'deleted' && estado !== 'not_found').length;
            } catch (err) {
                console.error('[eliminar empresa] Cloudinary:', err.message || err);
                fallidos += lote.length;
            }
        }
    }
    return fallidos;
};

export const eliminarEmpresa = async (id, nombreEscrito, actor) => {
    const { data: empresa, error } = await supabase
        .from('empresas').select('id, nombre, activa, ultimo_respaldo_en').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!empresa) throw errorDe(404, 'Empresa no encontrada');
    const motivo = motivoNoEliminar({ empresa, nombreEscrito });
    if (motivo) throw errorDe(400, motivo);

    // 1) Accesos y archivos, antes de que se borren las filas que los nombran
    const deEmpresa = (tabla, campos) => todas(() => deLaEmpresa(supabase.from(tabla).select(campos), id).order('id'));
    const [usuarios, vehiculos, chequeos] = await Promise.all([
        deEmpresa('usuarios', 'id, foto_url'),
        deEmpresa('vehiculos', 'id, runt_url'),
        deEmpresa('chequeos_preoperacionales', 'id'),
    ]);
    const idsUsuarios = usuarios.map((u) => u.id);
    const idsVehiculos = vehiculos.map((v) => v.id);
    const idsChequeos = chequeos.map((c) => c.id);

    const fotosVehiculos = [];
    for (const lote of enLotes(idsVehiculos, LOTE)) {
        fotosVehiculos.push(...await todas(() => supabase.from('fotos_vehiculo').select('id, url').in('vehiculo_id', lote).order('id')));
    }
    // Fotos de los chequeos: cuelgan de las respuestas, que cuelgan del chequeo.
    const fotosChequeos = await todas(() => supabase.from('fotos_chequeo')
        .select('id, url, cloudinary_public_id, respuesta:respuestas_chequeo!inner ( chequeo:chequeos_preoperacionales!inner ( empresa_id ) )')
        .eq('respuesta.chequeo.empresa_id', id).order('id'));

    // CB-21: los adjuntos privados de sus mensajes a SISVIA (HU-18)
    const [adjuntosMensajes, adjuntosRespuestas] = await Promise.all(['buzon_mensajes', 'buzon_respuestas'].map((tabla) =>
        todas(() => deLaEmpresa(supabase.from(tabla).select('id, adjunto_id, adjunto_recurso'), id).not('adjunto_id', 'is', null).order('id'))));

    const archivos = [
        ...usuarios.map((u) => recursoDe(u.foto_url)),
        ...vehiculos.map((v) => recursoDe(v.runt_url)),
        ...fotosVehiculos.map((f) => recursoDe(f.url)),
        ...fotosChequeos.map((f) => (f.cloudinary_public_id ? { tipo: 'image', id: f.cloudinary_public_id } : recursoDe(f.url))),
        ...[...adjuntosMensajes, ...adjuntosRespuestas].map((a) => ({ tipo: a.adjunto_recurso, id: a.adjunto_id, entrega: 'authenticated' })),
    ].filter(Boolean);
    const correos = idsUsuarios.length ? await obtenerMapaEmails() : new Map();
    const emails = idsUsuarios.map((u) => correos.get(u)).filter(Boolean);

    // 2) Historiales sin empresa_id que apuntan a lo suyo
    await borrarDonde('auditoria_chequeos', 'chequeo_id', idsChequeos);
    await borrarDonde('auditoria_chequeos', 'accion_por_id', idsUsuarios);
    await borrarDonde('auditoria_vehiculos', 'vehiculo_id', idsVehiculos);
    await borrarDonde('auditoria_usuarios', 'usuario_afectado_id', idsUsuarios);
    await borrarDonde('auditoria_usuarios', 'accion_por_id', idsUsuarios);
    // CB-25 · RN-14: lo que hizo su gente se va con ella. Lo que hizo el equipo
    // SISVIA queda en el registro del equipo con el nombre de la empresa (asi nadie
    // borra sus rastros eliminandola), junto con el 'eliminada' de abajo.
    const { error: errorActividad } = await deLaEmpresa(supabase.from('actividad').delete(), id).eq('de_sisvia', false);
    if (errorActividad) throw errorActividad;

    // 3) Todo lo demas, en una sola instruccion (cascada por empresa_id)
    const { error: errorBorrado } = await supabase.from('empresas').delete().eq('id', id);
    if (errorBorrado) throw errorBorrado;

    // 4) Sus accesos: sin la cuenta de Auth ya no puede ni pedir un enlace
    let accesosFallidos = 0;
    for (const usuarioId of idsUsuarios) {
        const { error: errorAuth } = await supabase.auth.admin.deleteUser(usuarioId);
        if (errorAuth && errorAuth.status !== 404) {
            accesosFallidos++;
            console.error('[eliminar empresa] no se borro el acceso', usuarioId, errorAuth.message);
        }
    }
    await borrarDonde('intentos_login', 'email', emails);

    // 5) Sus archivos
    const archivosFallidos = await borrarDeCloudinary(archivos);

    const resumen = {
        usuarios: idsUsuarios.length,
        vehiculos: idsVehiculos.length,
        chequeos: idsChequeos.length,
        archivos: archivos.length,
        accesos_no_borrados: accesosFallidos,
        archivos_no_borrados: archivosFallidos,
    };
    // El registro queda con el nombre (la empresa ya no existe para enlazarlo).
    await auditarEmpresa({ empresa: { id: null, nombre: empresa.nombre }, actorId: actor.id, accion: 'eliminada', detalles: resumen });
    return { nombre: empresa.nombre, ...resumen };
};
