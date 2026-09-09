// Rutas de notificaciones (Bloque C paso 1).
// Solo accesibles a roles administrativos.

import { Router } from 'express';
import {
    getMisNotificaciones,
    getContadorNoLeidas,
    patchMarcarLeida,
    patchMarcarTodasLeidas,
} from '../controllers/notificaciones.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

// IMPORTANTE: las rutas estaticas deben ir ANTES de las que tienen :id
// para que Express no las confunda.
router.get('/no-leidas/count', getContadorNoLeidas);
router.patch('/leer-todas', patchMarcarTodasLeidas);

router.get('/', getMisNotificaciones);
router.patch('/:id/leer', patchMarcarLeida);

export default router;
