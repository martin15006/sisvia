// Rutas del admin del catalogo del chequeo
// Solo accesibles por roles administrativos. Quien cambia que (base, propio,
// solo lectura) lo decide el servicio (pacto para-empresas, HU-12 a HU-14).

import { Router } from "express";
import {
    getCategorias, postCategoria, putCategoria, deleteCategoria,
    getItems, postItem, putItem, deleteItem,
    getPreguntas, postPregunta, putPregunta, deletePregunta,
    postBloqueo,
} from "../controllers/catalogoAdmin.controller.js";
import { verificarToken, soloAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verificarToken);
router.use(soloAdmin);

// CATEGORIAS
router.get("/categorias", getCategorias);
router.post("/categorias", postCategoria);
router.put("/categorias/:id", putCategoria);
router.delete("/categorias/:id", deleteCategoria);

// ITEMS
router.get("/items", getItems);
router.post("/items", postItem);
router.put("/items/:id", putItem);
router.delete("/items/:id", deleteItem);

// PREGUNTAS DE APTITUD
router.get("/preguntas-aptitud", getPreguntas);
router.post("/preguntas-aptitud", postPregunta);
router.put("/preguntas-aptitud/:id", putPregunta);
router.delete("/preguntas-aptitud/:id", deletePregunta);

// BLOQUEOS DE ELEMENTOS BASE POR EMPRESA (HU-14: el superadmin dentro de una empresa)
router.post("/bloqueos/bloquear", postBloqueo(true));
router.post("/bloqueos/desbloquear", postBloqueo(false));

export default router;
