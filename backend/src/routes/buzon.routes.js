// "Escribir a SISVIA" (pacto para-empresas, HU-18). En pantalla: "Soporte".
//   POST /api/buzon                              escribir (Administrador de empresa)
//   GET  /api/buzon?estado=                      bandeja (SISVIA: todas; la empresa: las suyas)
//   GET  /api/buzon/nuevos                       cuantos nuevos hay (menu del equipo SISVIA)
//   GET  /api/buzon/:id                          el mensaje con su hilo
//   POST /api/buzon/:id/respuestas               responder en el hilo
//   POST /api/buzon/:id/resolver                 marcarlo resuelto (equipo SISVIA)
//   GET  /api/buzon/:id/adjunto                  el adjunto del mensaje (privado, RNF-10)
//   GET  /api/buzon/:id/respuestas/:rid/adjunto  el de una respuesta
import { Router } from 'express';
import multer from 'multer';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { ADJUNTO_MAX, MENSAJES_BUZON } from '../services/buzonReglas.js';
import {
    escribirASisvia, listarMensajes, contarNuevos, abrirMensaje, responderMensaje, resolverMensaje, obtenerAdjunto,
} from '../services/buzon.service.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// RN-12: el buzon es del equipo SISVIA y de los Administradores de empresa.
router.use(verificarToken, (req, res, next) =>
    (['superadmin', 'admin_empresa'].includes(req.usuario?.rol) ? next() : res.status(403).json({ error: MENSAJES_BUZON.soloAdmin })));

// Un solo adjunto de hasta 5 MB; si se pasa, el texto de HU-18.2.
// El tope de multer va 1 byte arriba: busboy da por cortado un archivo apenas
// LLEGA al tope (no sabe si vienen mas bytes), y uno de 5 MB justos tiene que
// pasar. Los 5 MB los controla validarAdjunto.
const recibirAdjunto = (req, res, next) =>
    multer({ storage: multer.memoryStorage(), limits: { fileSize: ADJUNTO_MAX + 1, files: 1 } }).single('adjunto')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) return res.status(400).json({ error: MENSAJES_BUZON.adjuntoInvalido });
        return next(err);
    });

const conId = (req, res, next) => (UUID.test(req.params.id) && (!req.params.rid || UUID.test(req.params.rid))
    ? next() : res.status(404).json({ error: 'Mensaje no encontrado' }));

const responder = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('[buzon]', err);
        res.status(500).json({ error: 'Error en Soporte. Intenta de nuevo.' });
    }
};

router.post('/', recibirAdjunto, responder(async (req, res) => {
    res.status(201).json(await escribirASisvia(req.usuario, req.body || {}, req.file, req.get('user-agent')));
}));

router.get('/', responder(async (req, res) => {
    res.json({ mensajes: await listarMensajes(req.usuario, { estado: req.query.estado }) });
}));

router.get('/nuevos', responder(async (req, res) => {
    res.json({ nuevos: req.usuario.rol === 'superadmin' ? await contarNuevos() : 0 });
}));

router.get('/:id', conId, responder(async (req, res) => {
    res.json({ mensaje: await abrirMensaje(req.usuario, req.params.id) });
}));

router.post('/:id/respuestas', conId, recibirAdjunto, responder(async (req, res) => {
    res.status(201).json(await responderMensaje(req.usuario, req.params.id, req.body || {}, req.file));
}));

router.post('/:id/resolver', conId, responder(async (req, res) => {
    res.json({ mensaje: await resolverMensaje(req.usuario, req.params.id) });
}));

const enviarAdjunto = (res, { contenido, formato, nombre }) => {
    res.setHeader('Content-Type', formato);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombre || 'adjunto')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(contenido);
};
router.get('/:id/adjunto', conId, responder(async (req, res) => {
    enviarAdjunto(res, await obtenerAdjunto(req.usuario, req.params.id));
}));
router.get('/:id/respuestas/:rid/adjunto', conId, responder(async (req, res) => {
    enviarAdjunto(res, await obtenerAdjunto(req.usuario, req.params.id, req.params.rid));
}));

export default router;
