// Solicitudes de cita desde la portada publica (pacto portada-publica).
//   POST   /api/solicitudes                 publico: pedir la cita (HU-02), con tope (RN-04)
//   GET    /api/solicitudes                 la lista (HU-04.2)            · solo superadmin
//   GET    /api/solicitudes/nuevas          cuantas nuevas (HU-04.1)      · solo superadmin
//   PATCH  /api/solicitudes/:id/contactada  marcarla contactada (HU-04.3) · solo superadmin
//   DELETE /api/solicitudes/:id             borrarla (HU-04.3)            · solo superadmin
import { Router } from 'express';
import { verificarToken, requiereRol } from '../middlewares/auth.middleware.js';
import { crearLimiteSolicitudes } from '../middlewares/limiteSolicitudes.js';
import { MENSAJES_SOLICITUD } from '../services/solicitudReglas.js';
import {
    recibirSolicitud, listarSolicitudes, contarNuevas, marcarContactada, borrarSolicitud,
} from '../services/solicitudes.service.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const responder = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('[solicitudes]', err);
        res.status(500).json({ error: 'Error con las solicitudes. Intenta de nuevo.' });
    }
};

router.post('/', crearLimiteSolicitudes(), responder(async (req, res) => {
    const resultado = await recibirSolicitud(req.body || {});
    if (!resultado.ok) return res.status(400).json({ error: MENSAJES_SOLICITUD.revisar, errores: resultado.errores });
    res.status(201).json({ ok: true });
}));

// HU-04.4: ver, marcar y borrar, solo el equipo SISVIA.
export const ROLES_EQUIPO = ['superadmin'];
const soloEquipo = [verificarToken, requiereRol(...ROLES_EQUIPO)];
const conId = (req, res, next) => (UUID.test(req.params.id) ? next() : res.status(404).json({ error: MENSAJES_SOLICITUD.noEncontrada }));

router.get('/', soloEquipo, responder(async (req, res) => {
    res.json({ solicitudes: await listarSolicitudes() });
}));

router.get('/nuevas', soloEquipo, responder(async (req, res) => {
    res.json({ nuevas: await contarNuevas() });
}));

router.patch('/:id/contactada', soloEquipo, conId, responder(async (req, res) => {
    res.json({ solicitud: await marcarContactada(req.usuario, req.params.id) });
}));

router.delete('/:id', soloEquipo, conId, responder(async (req, res) => {
    await borrarSolicitud(req.usuario, req.params.id);
    res.status(204).end();
}));

export default router;
