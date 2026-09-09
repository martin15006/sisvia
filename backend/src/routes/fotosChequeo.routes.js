// Rutas de fotos de evidencia del chequeo.
// El conductor sube/elimina las suyas. El admin marca preservar_siempre.

import { Router } from "express";
import multer from "multer";
import {
    postFotoEvidencia,
    deleteFotoEvidencia,
    patchPreservarFoto,
    getFotosDeRespuesta,
} from "../controllers/fotosChequeo.controller.js";
import {
    verificarToken,
    soloConductor,
    soloAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

const uploadFoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const permitidos = ["image/jpeg", "image/png", "image/webp"];
        const ok = permitidos.includes(file.mimetype);
        cb(ok ? null : new Error("Solo JPEG, PNG o WebP"), ok);
    },
});

router.use(verificarToken);

// Conductor sube una foto a una respuesta marcada como NO CUMPLE
router.post("/:respuestaId/fotos", soloConductor, uploadFoto.single("foto"), postFotoEvidencia);

// Conductor lista las fotos de una de sus respuestas (mientras edita)
router.get("/:respuestaId/fotos", soloConductor, getFotosDeRespuesta);

// Conductor elimina una de sus fotos (mientras el chequeo este abierto)
router.delete("/fotos/:fotoId", soloConductor, deleteFotoEvidencia);

// Admin marca una foto como preservar_siempre (o lo quita)
router.patch("/fotos/:fotoId/preservar", soloAdmin, patchPreservarFoto);

export default router;
