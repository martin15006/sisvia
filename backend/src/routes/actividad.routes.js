// Actividad de la empresa (pacto para-empresas, HU-19). Solo lectura: nadie la
// edita ni la borra desde la app (RN-14).
//   GET /api/actividad?tipo=&persona=&desde=&hasta=&despues_de=
// La ve el Administrador de empresa, y el equipo SISVIA dentro de la empresa (HU-16).
import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { MENSAJES_ACTIVIDAD, puedeVerActividad, leerFiltros } from '../services/actividadReglas.js';
import { listarActividad } from '../services/actividad.service.js';

const router = Router();

router.get('/', verificarToken, async (req, res) => {
    try {
        if (!puedeVerActividad(req.usuario)) return res.status(403).json({ error: MENSAJES_ACTIVIDAD.soloAdminEmpresa });
        const { filtros, error } = leerFiltros(req.query);
        if (error) return res.status(400).json({ error });
        // La empresa sale de quien pregunta, nunca de la query (RN-01).
        const empresaId = req.usuario.rol === 'superadmin' ? req.usuario.empresaActiva : req.usuario.empresa_id;
        res.json(await listarActividad({ empresaId }, filtros));
    } catch (err) {
        console.error('Error listando la actividad:', err);
        res.status(500).json({ error: 'Error al cargar la actividad' });
    }
});

export default router;
