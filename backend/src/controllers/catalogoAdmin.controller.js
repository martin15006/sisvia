// Controllers del admin del catalogo del chequeo
// Todos requieren rol admin (validado en el middleware del router)

import {
    listarCategoriasAdmin,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    listarItemsAdmin,
    crearItem,
    actualizarItem,
    eliminarItem,
    listarPreguntasAdmin,
    crearPregunta,
    actualizarPregunta,
    eliminarPregunta,
} from "../services/catalogoAdmin.service.js";

// -- Categorias --

export const getCategorias = async (req, res) => {
     try{
        const data = await listarCategoriasAdmin();
        res.json({ categorias: data, total: data.length });
    } catch (err) {
        console.error("Error listando categorias:", err);
        res.status(500).json({ error: err.message || "Error al listar categorias" });
    }
};

export const postCategoria = async (req, res) => {
    try {
        const { nombre, descripcion, icono, orden } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: "El nombre es obligatorio" });
        }
        const data = await crearCategoria({ nombre, descripcion, icono, orden });
        res.status(201).json({ mensaje: "Categoria creada", categoria: data });
    } catch (err) {
        console.error("Error creando categoria:", err);
        res.status(500).json({ error: err.message || "Error al crear la categoria" });
    }
};

export const putCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await actualizarCategoria(id, req.body);
        res.json({ mensaje: "Categoria actualizada", categoria: data });
    } catch (err) {
        console.error("Error actualizando categoria:", err);
        res.status(500).json({ error: err.message || "Error al actualizar la categoria" });
    }
};

export const deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await eliminarCategoria(id);
        const mensaje = resultado.tipo === "hard"
            ? "Categoria eliminada permanentemente."
            : "Categoria desactivada porque tiene historial en chequeos previos.";
        res.json({
            mensaje,
            tipo: resultado.tipo,
            categoria: resultado.data,
        });
    } catch (err) {
        console.error("Error eliminando categoria:", err);
        res.status(500).json({ error: err.message || "Error al eliminar la categoria" });
    }
};

// -- Items --

export const getItems = async (req, res) => {
    try {
        const data = await listarItemsAdmin();
        res.json({ items: data, total: data.length });
    } catch (err) {
        console.error("Error listando items:", err);
        res.status(500).json({ error: err.message || "Error al listar items" });
    }
};

export const postItem = async (req, res) => {
    try {
        const { categoria_id, descripcion } = req.body;
        if (!categoria_id) {
            return res.status(400).json({ error: "categoria_id es obligatorio" });
        }
        if (!descripcion || !descripcion.trim()) {
            return res.status(400).json({ error: "La descripcion es obligatoria" });
        }
        const data = await crearItem(req.body);
        res.status(201).json({ mensaje: "Item creado", item: data });
    } catch (err) {
        console.error("Error creando item:", err);
        res.status(500).json({ error: err.message || "Error al crear el item" });
    }
};

export const putItem = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await actualizarItem(id, req.body);
        res.json({ mensaje: "Item actualizado", item: data });
    } catch (err) {
        console.error("Error actualizando item:", err);
        res.status(500).json({ error: err.message || "Error al actualizar el item" });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await eliminarItem(id);
        const mensaje = resultado.tipo === "hard"
            ? "Item eliminado permanentemente."
            : "Item desactivado porque tiene historial en chequeos previos.";
        res.json({ mensaje, tipo: resultado.tipo, item: resultado.data });
    } catch (err) {
        console.error("Error eliminando item:", err);
        res.status(500).json({ error: err.message || "Error al eliminar el item" });
    }
};

// -- Preguntas de aptitud --

export const getPreguntas = async (req, res) => {
    try {
        const data = await listarPreguntasAdmin();
        res.json({ preguntas: data, total: data.length });
    } catch (err) {
        console.error("Error listando preguntas:", err);
        res.status(500).json({ error: err.message || "Error al listar preguntas" });
    }
};

export const postPregunta = async (req, res) => {
    try {
        const { pregunta, respuesta_apta } = req.body;
        if (!pregunta || !pregunta.trim()) {
            return res.status(400).json({ error: "La pregunta es obligatoria" });
        }
        if (!respuesta_apta) {
            return res.status(400).json({ error: "respuesta_apta es obligatoria ('si' o 'no')" });
        }
        const data = await crearPregunta(req.body);
        res.status(201).json({ mensaje: "Pregunta creada", pregunta: data });
    } catch (err) {
        console.error("Error creando pregunta:", err);
        res.status(500).json({ error: err.message || "Error al crear la pregunta" });
    }
};

export const putPregunta = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await actualizarPregunta(id, req.body);
        res.json({ mensaje: "Pregunta actualizada", pregunta: data });
    } catch (err) {
        console.error("Error actualizando pregunta:", err);
        res.status(500).json({ error: err.message || "Error al actualizar la pregunta" });
    }
};

export const deletePregunta = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await eliminarPregunta(id);
        const mensaje = resultado.tipo === "hard"
            ? "Pregunta eliminada permanentemente."
            : "Pregunta desactivada porque tiene historial en chequeos previos.";
        res.json({ mensaje, tipo: resultado.tipo, pregunta: resultado.data });
    } catch (err) {
        console.error("Error eliminando pregunta:", err);
        res.status(500).json({ error: err.message || "Error al eliminar la pregunta" });
    }
};
