import { Router } from 'express';
import { login, obtenerActual, cambiarPassword, actualizarMiPerfil } from '../controllers/auth.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/cambiar-password', verificarToken, cambiarPassword);

router.get('/me', verificarToken, obtenerActual);

// Auto-edicion: cualquier usuario logueado puede actualizar su propia foto,
// nombre y telefono. Cedula y correo solo los puede cambiar un admin superior.
router.patch('/mi-perfil', verificarToken, actualizarMiPerfil);

export default router;