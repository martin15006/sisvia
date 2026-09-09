// Controllers de fotos de evidencia. El conductor sube/elimina las suyas, admin marca preservar_siempre.

import {
    subirFotoEvidencia,
    eliminarFotoEvidencia,
    togglePreservarFoto,
    listarFotosDeRespuesta,
} from "../services/fotosChequeo.service.js";

// POST /api/respuestas/:respuestaId/fotos (multipart/form-data, campo "foto")
export const postFotoEvidencia = async (req, res) => {
    try {
        const { respuestaId } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: "No se recibio ninguna foto" });
        }

        const resultado = await subirFotoEvidencia({
            respuestaId,
            conductorId: req.usuario.id,
            buffer: req.file.buffer,
            descripcion: req.body.descripcion,
        });

        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        res.status(201).json({
            mensaje: "Foto subida correctamente",
            foto: resultado.foto,
        });
    } catch (err) {
        console.error("Error subiendo foto de evidencia:", err);
        res.status(500).json({ error: err.message || "Error al subir la foto" });
    }
};

// DELETE /api/respuestas/fotos/:fotoId
export const deleteFotoEvidencia = async (req, res) => {
    try {
        const { fotoId } = req.params;
        const resultado = await eliminarFotoEvidencia({
            fotoId,
            conductorId: req.usuario.id,
        });
        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }
        res.json({ mensaje: "Foto eliminada" });
    } catch (err) {
        console.error("Error eliminando foto:", err);
        res.status(500).json({ error: err.message || "Error al eliminar la foto" });
    }
};

// PATCH /api/respuestas/fotos/:fotoId/preservar (solo admin)
// Body: { preservar: boolean }
export const patchPreservarFoto = async (req, res) => {
    try {
        const { fotoId } = req.params;
        const { preservar } = req.body;
        if (typeof preservar !== "boolean") {
            return res.status(400).json({ error: "preservar debe ser true o false" });
        }

        const resultado = await togglePreservarFoto({ fotoId, preservar });
        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        res.json({
            mensaje: preservar
                ? "Foto marcada para preservar siempre"
                : "Foto restablecida a borrado automatico en 12 meses",
            foto: resultado.foto,
        });
    } catch (err) {
        console.error("Error actualizando preservar:", err);
        res.status(500).json({ error: err.message || "Error al actualizar la foto" });
    }
};

// GET /api/respuestas/:respuestaId/fotos (para el conductor mientras edita)
export const getFotosDeRespuesta = async (req, res) => {
    try {
        const { respuestaId } = req.params;
        const resultado = await listarFotosDeRespuesta(respuestaId, req.usuario.id);
        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }
        const fotos = resultado.fotos;
        res.json({ fotos, total: fotos.length });
    } catch (err) {
        console.error("Error listando fotos:", err);
        res.status(500).json({ error: err.message || "Error al listar fotos" });
    }
};
