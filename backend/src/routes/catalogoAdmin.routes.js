// Rutas del admin del catalogo del chequeo
// Solo accesibles por roles administrativos

import { Router } from "express";
import {
    getCategorias, postCategoria, putCategoria, deleteCategoria,
    getItems, postItem, putItem, deleteItem,
    getPreguntas, postPregunta, putPregunta, deletePregunta,
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

export default router;
