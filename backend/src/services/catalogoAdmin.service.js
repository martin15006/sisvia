// Servicio del catalogo del chequeo (admin).
// Soft delete (activo=false) para no romper chequeos historicos.

import { supabase } from "../config/supabase.js";

// -- Categorias --

export const listarCategoriasAdmin = async () => {
    const { data, error } = await supabase
        .from("categorias_chequeo")
        .select("id, nombre, descripcion, icono, orden, activo")
        .order("orden", { ascending: true });
    if (error) throw error;
    return data;
};

export const crearCategoria = async ({ nombre, descripcion, icono, orden }) => {
    const { data, error } = await supabase
        .from("categorias_chequeo")
        .insert({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || null,
            icono: icono ?? "",
            orden: orden || 999,
            activo: true,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const actualizarCategoria = async (id, { nombre, descripcion, icono, orden, activo }) => {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre.trim();
    if (descripcion !== undefined) cambios.descripcion = descripcion?.trim() || null;
    if (icono !== undefined) cambios.icono = icono;
    if (orden !== undefined) cambios.orden = orden;
    if (activo !== undefined) cambios.activo = activo;

    const { data, error } = await supabase
        .from("categorias_chequeo")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const eliminarCategoria = async (id) => {
    // Estrategia: si la categoria no tiene items O todos sus items son borrables
    // (sin respuestas_chequeo), se borra todo en cascada. Si algun item ya tiene
    // historial, se hace soft delete para no romper el historial.

    // 1. Buscar items de la categoria
    const { data: items, error: errItems } = await supabase
        .from("items_chequeo")
        .select("id")
        .eq("categoria_id", id);
    if (errItems) throw errItems;

    const idsItems = (items || []).map((i) => i.id);

    // 2. Si hay items, ver cuantos tienen respuestas en algun chequeo
    let tieneHistorial = false;
    if (idsItems.length > 0) {
        const { count, error: errCount } = await supabase
            .from("respuestas_chequeo")
            .select("id", { count: "exact", head: true })
            .in("item_id", idsItems);
        if (errCount) throw errCount;
        tieneHistorial = (count || 0) > 0;
    }

    if (tieneHistorial) {
        // Soft delete: marca todo como inactivo
        if (idsItems.length > 0) {
            await supabase.from("items_chequeo").update({ activo: false }).in("id", idsItems);
        }
        const { data, error } = await supabase
            .from("categorias_chequeo")
            .update({ activo: false })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return { tipo: "soft", data, motivo: "tiene_historial" };
    }

    // Hard delete: primero los items (no tienen respuestas), luego la categoria
    if (idsItems.length > 0) {
        const { error: errDelItems } = await supabase
            .from("items_chequeo")
            .delete()
            .in("id", idsItems);
        if (errDelItems) throw errDelItems;
    }
    const { data, error } = await supabase
        .from("categorias_chequeo")
        .delete()
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return { tipo: "hard", data };
};

// -- Items --

export const listarItemsAdmin = async () => {
    const { data, error } = await supabase
        .from("items_chequeo")
        .select("id, categoria_id, descripcion, descripcion_larga, orden, es_critico, aplica_a_tipos, activo")
        .order("categoria_id", { ascending: true })
        .order("orden", { ascending: true });
    if (error) throw error;
    return data;
};

export const crearItem = async ({
    categoria_id,
    descripcion,
    descripcion_larga,
    orden,
    es_critico,
    aplica_a_tipos,
}) => {
    const { data, error } = await supabase
        .from("items_chequeo")
        .insert({
            categoria_id,
            descripcion: descripcion.trim(),
            descripcion_larga: descripcion_larga?.trim() || null,
            orden: orden || 999,
            es_critico: !!es_critico,
            aplica_a_tipos: aplica_a_tipos || ["preoperacional", "postoperacional"],
            activo: true,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const actualizarItem = async (id, datos) => {
    const cambios = {};
    if (datos.categoria_id !== undefined) cambios.categoria_id = datos.categoria_id;
    if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
    if (datos.descripcion_larga !== undefined) {
        cambios.descripcion_larga = datos.descripcion_larga?.trim() || null;
    }
    if (datos.orden !== undefined) cambios.orden = datos.orden;
    if (datos.es_critico !== undefined) cambios.es_critico = !!datos.es_critico;
    if (datos.aplica_a_tipos !== undefined) cambios.aplica_a_tipos = datos.aplica_a_tipos;
    if (datos.activo !== undefined) cambios.activo = datos.activo;

    const { data, error } = await supabase
        .from("items_chequeo")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const eliminarItem = async (id) => {
    // Si el item nunca tuvo respuestas, se borra de verdad. Si ya esta en algun
    // chequeo, solo se desactiva para no romper el historial.
    const { count, error: errCount } = await supabase
        .from("respuestas_chequeo")
        .select("id", { count: "exact", head: true })
        .eq("item_id", id);
    if (errCount) throw errCount;

    if ((count || 0) > 0) {
        const { data, error } = await supabase
            .from("items_chequeo")
            .update({ activo: false })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return { tipo: "soft", data, motivo: "tiene_historial" };
    }

    const { data, error } = await supabase
        .from("items_chequeo")
        .delete()
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return { tipo: "hard", data };
};

// -- Preguntas de aptitud --

export const listarPreguntasAdmin = async () => {
    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .select("id, pregunta, respuesta_apta, orden, activo")
        .order("orden", { ascending: true });
    if (error) throw error;
    return data;
};

export const crearPregunta = async ({ pregunta, respuesta_apta, orden }) => {
    if (!["si", "no"].includes(respuesta_apta)) {
        throw new Error("respuesta_apta debe ser 'si' o 'no'");
    }
    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .insert({
            pregunta: pregunta.trim(),
            respuesta_apta,
            orden: orden || 999,
            activo: true,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const actualizarPregunta = async (id, { pregunta, respuesta_apta, orden, activo }) => {
    const cambios = {};
    if (pregunta !== undefined) cambios.pregunta = pregunta.trim();
    if (respuesta_apta !== undefined) {
        if (!["si", "no"].includes(respuesta_apta)) {
            throw new Error("respuesta_apta debe ser 'si' o 'no'");
        }
        cambios.respuesta_apta = respuesta_apta;
    }
    if (orden !== undefined) cambios.orden = orden;
    if (activo !== undefined) cambios.activo = activo;

    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .update(cambios)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const eliminarPregunta = async (id) => {
    // Si la pregunta nunca tuvo respuestas, se borra de verdad. Si ya esta en
    // algun chequeo, solo se desactiva para no romper el historial.
    const { count, error: errCount } = await supabase
        .from("respuestas_aptitud")
        .select("id", { count: "exact", head: true })
        .eq("pregunta_id", id);
    if (errCount) throw errCount;

    if ((count || 0) > 0) {
        const { data, error } = await supabase
            .from("preguntas_aptitud")
            .update({ activo: false })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return { tipo: "soft", data, motivo: "tiene_historial" };
    }

    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .delete()
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return { tipo: "hard", data };
};
