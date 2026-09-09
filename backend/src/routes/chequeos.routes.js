import { Router } from "express";
import {
    getCatalogo,
    getVehiculosDisponibles,
    postIniciarChequeo,
    putRespuestasChequeo,
    postCerrarChequeo,
    getChequeos,
    getChequeoPorId,
    getIntentosBloqueados,
    getMisChequeos,
    postAptitudNoApta,
    postAbandonarChequeo,
} from "../controllers/chequeos.controller.js";
import {
    verificarToken,
    adminOConductor,
    soloConductor,
    soloAdmin,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren autenticacion
router.use(verificarToken);

// GET /api/chequeos/catalogo
// Devuelve categorias + items + preguntas de aptitud
// Accesible por admin y conductor (ambos lo usan)
router.get("/catalogo", adminOConductor, getCatalogo);

// GET /api/chequeos/vehiculos-disponibles?busqueda=...
// Lista vehiculos activos de la sede del conductor
// Solo conductor: el admin ya tiene su propia vista de vehiculos
router.get("/vehiculos-disponibles", soloConductor, getVehiculosDisponibles);

// POST /api/chequeos/iniciar
// Crea un chequeo nuevo con sus respuestas de aptitud
router.post("/iniciar", soloConductor, postIniciarChequeo);

// POST /api/chequeos/aptitud-no-apta
// Registra el intento bloqueado cuando el conductor no es apto (antes de vehiculo)
router.post("/aptitud-no-apta", soloConductor, postAptitudNoApta);

// PUT /api/chequeos/:id/respuestas
// Guarda respuestas del checklist (1 a 39 a la vez, upsert por item)
router.put("/:id/respuestas", soloConductor, putRespuestasChequeo);

// POST /api/chequeos/:id/cerrar
// Calcula resultado, cierra el chequeo, actualiza vehiculo si aplica
router.post("/:id/cerrar", soloConductor, postCerrarChequeo);

// POST /api/chequeos/:id/abandonar
// Marca el chequeo como abandonado (inactividad / cierre de pestaña / etc).
// Accesible tanto a conductor (su propio chequeo) como a admin (intervencion manual).
router.post("/:id/abandonar", adminOConductor, postAbandonarChequeo);

// GET /api/chequeos/mios?limite=10
// Lista los chequeos del propio conductor logueado
router.get("/mios", soloConductor, getMisChequeos);

// == Vista del admin ==

// GET /api/chequeos?fecha_desde=...&placa=...&resultado_estado=...&pagina=1&limite=20
// Lista chequeos visibles segun el scope del admin (sede/ciudad/depto/regional/nacional)
router.get("/", soloAdmin, getChequeos);

// GET /api/chequeos/intentos-bloqueados?razon=...&pagina=1&limite=20
// IMPORTANTE: esta ruta tiene que ir ANTES de /:id porque sino /:id matchearia "intentos-bloqueados"
router.get("/intentos-bloqueados", soloAdmin, getIntentosBloqueados);

// GET /api/chequeos/:id
// Detalle completo de un chequeo (cabecera + respuestas + aptitud + vehiculo + conductor + fotos)
router.get("/:id", soloAdmin, getChequeoPorId);

export default router;
