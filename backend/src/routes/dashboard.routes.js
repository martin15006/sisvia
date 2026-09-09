// Rutas del dashboard administrativo (Bloque B paso 3).
// Solo accesibles a roles administrativos (no conductor).

import { Router } from 'express';
import { obtenerStatsDashboard } from '../controllers/dashboard.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verificarToken, soloAdmin);

router.get('/stats', obtenerStatsDashboard);

export default router;
