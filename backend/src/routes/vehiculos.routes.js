import { Router } from "express";
import multer from "multer";
import {
    listarVehiculos,
    obtenerVehiculo,
    crearVehiculo,
    actualizarVehiculo,
    desactivarVehiculo,
    reactivarVehiculo,
    eliminarVehiculo,
    subirFotos,
    eliminarFoto,
    marcarFotoPrincipal,
    subirRunt,
    eliminarRunt,
} from "../controllers/vehiculos.controller.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

const uploadFotos = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const permitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        cb(permitidos.includes(file.mimetype) ? null : new Error("Solo JPEG, PNG, WebP o GIF"), permitidos.includes(file.mimetype));
    },
});

const uploadRunt = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(file.mimetype === "application/pdf" ? null : new Error("Solo PDF"), file.mimetype === "application/pdf");
    },
});

router.use(verificarToken, soloAdmin);

router.get("/", listarVehiculos);
router.get("/:id", obtenerVehiculo);

router.post("/", crearVehiculo);

router.patch("/:id", actualizarVehiculo);
router.patch("/:id/desactivar", desactivarVehiculo);
router.patch("/:id/reactivar", reactivarVehiculo);

router.delete("/:id", eliminarVehiculo);

router.post("/:id/fotos", uploadFotos.array("fotos", 10), subirFotos);
router.delete("/:id/fotos/:foto_id", eliminarFoto);
router.patch("/:id/fotos/:foto_id/principal", marcarFotoPrincipal);

router.post("/:id/runt", uploadRunt.single("runt"), subirRunt);
router.delete("/:id/runt", eliminarRunt);

export default router;
