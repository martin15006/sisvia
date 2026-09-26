// Modulo Empresas (pacto para-empresas, HU-01 a HU-03): solo el superadmin.
//   GET   /api/empresas                  lista con estado y uso de los limites
//   POST  /api/empresas                  crea la empresa con su Administrador
//   GET   /api/empresas/:id              ficha
//   PATCH /api/empresas/:id              datos y limites
//   POST  /api/empresas/:id/desactivar
//   POST  /api/empresas/:id/reactivar
//   POST  /api/empresas/:id/entrar         (HU-16, queda registrado)
//   POST  /api/empresas/:id/exportar       (HU-04, el .zip con todo; queda registrado)
//   POST  /api/empresas/:id/eliminar       (HU-05, { nombre }; para siempre)
import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { verificarToken, requiereRol } from '../middlewares/auth.middleware.js';
import { validarDatosEmpresa, validarAdminEmpresa } from '../services/empresasReglas.js';
import {
    listarEmpresas,
    obtenerEmpresa,
    crearEmpresaConAdmin,
    actualizarEmpresa,
    cambiarEstadoEmpresa,
    auditarEmpresa,
} from '../services/empresas.service.js';
import { crearZip } from '../services/export/zip.js';
import { generarRespaldo, RespaldoCortado } from '../services/export/respaldo.js';
import { nombreRespaldo } from '../services/export/respaldoReglas.js';
import { eliminarEmpresa } from '../services/eliminarEmpresa.service.js';

const router = Router();
router.use(verificarToken, requiereRol('superadmin'));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Los errores con status (409 nombre repetido, 404...) salen tal cual.
const responderError = (res, err, generico) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(generico, err);
    return res.status(500).json({ error: generico });
};

router.get('/', async (req, res) => {
    try {
        res.json({ empresas: await listarEmpresas() });
    } catch (err) {
        responderError(res, err, 'Error al listar las empresas');
    }
});

router.post('/', async (req, res) => {
    try {
        const empresa = validarDatosEmpresa(req.body?.empresa);
        if (empresa.error) return res.status(400).json({ error: empresa.error });
        const admin = validarAdminEmpresa(req.body?.administrador);
        if (admin.error) return res.status(400).json({ error: admin.error });

        const creada = await crearEmpresaConAdmin({ empresa: empresa.datos, admin: admin.datos }, req.usuario);
        res.status(201).json(creada);
    } catch (err) {
        responderError(res, err, 'Error al crear la empresa');
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
        const empresa = await obtenerEmpresa(req.params.id);
        if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
        res.json({ empresa });
    } catch (err) {
        responderError(res, err, 'Error al cargar la empresa');
    }
});

router.patch('/:id', async (req, res) => {
    try {
        if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
        const cambios = validarDatosEmpresa(req.body, { parcial: true });
        if (cambios.error) return res.status(400).json({ error: cambios.error });
        res.json({ empresa: await actualizarEmpresa(req.params.id, cambios.datos, req.usuario) });
    } catch (err) {
        responderError(res, err, 'Error al actualizar la empresa');
    }
});

// HU-16.1: el superadmin entra a la empresa. El frontend guarda la empresa y la
// manda en X-Empresa-Activa; aca se comprueba que existe y queda registrado.
router.post('/:id/entrar', async (req, res) => {
    try {
        if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
        const { data: empresa, error } = await supabase
            .from('empresas')
            .select('id, nombre, activa')
            .eq('id', req.params.id)
            .maybeSingle();
        if (error) throw error;
        if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
        await auditarEmpresa({ empresa, actorId: req.usuario.id, accion: 'entro' });
        res.json({ empresa });
    } catch (err) {
        responderError(res, err, 'Error al entrar a la empresa');
    }
});

// HU-04: "Exportar todo". El .zip sale en flujo mientras se arma (con 1.000
// chequeos no se junta entero en memoria). "Ultimo respaldo" se marca recien
// con el .zip entero escrito, antes de cerrar la respuesta (asi la ficha que el
// navegador recarga al terminar ya trae la fecha). Si la descarga se corta
// mientras se arma, no se marca (CB-01).
router.post('/:id/exportar', async (req, res) => {
    let empresa;
    try {
        if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
        const { data, error } = await supabase.from('empresas').select('id, nombre').eq('id', req.params.id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Empresa no encontrada' });
        empresa = data;
    } catch (err) {
        return responderError(res, err, 'Error al exportar la empresa');
    }

    const fecha = new Date();
    let cortado = false;
    res.on('close', () => { if (!res.writableFinished) cortado = true; });
    // Respeta el ritmo del que descarga: si el buffer se llena, espera el 'drain'.
    const escribir = async (buffer) => {
        if (cortado) throw new RespaldoCortado();
        if (res.write(buffer)) return;
        await new Promise((listo) => {
            const seguir = () => { res.off('drain', seguir); res.off('close', seguir); listo(); };
            res.on('drain', seguir);
            res.on('close', seguir);
        });
        if (cortado) throw new RespaldoCortado();
    };

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreRespaldo(empresa.nombre, fecha)}"`);
    try {
        const zip = crearZip(escribir, { fecha });
        const resumen = await generarRespaldo({
            empresa, zip, fecha, quien: req.usuario.nombre_completo, cortado: () => cortado,
        });
        await zip.cerrar();
        if (cortado) throw new RespaldoCortado();
        const { error } = await supabase.from('empresas').update({ ultimo_respaldo_en: fecha.toISOString() }).eq('id', empresa.id);
        if (error) console.error('No se pudo marcar el ultimo respaldo:', error.message);
        await auditarEmpresa({ empresa, actorId: req.usuario.id, accion: 'exportada', detalles: resumen });
        res.end();
    } catch (err) {
        if (!(err instanceof RespaldoCortado)) console.error('Error exportando la empresa:', err);
        // El .zip ya empezo a salir: no se puede mandar un JSON. Se corta la
        // descarga para que el navegador la de por fallida (y no se marca nada).
        res.destroy();
    }
});

// HU-05 · RN-06: solo desactivada, con respaldo de los ultimos 30 dias y
// escribiendo su nombre exacto. Se borra todo lo suyo, sus accesos y sus fotos.
router.post('/:id/eliminar', async (req, res) => {
    try {
        if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
        res.json({ eliminada: await eliminarEmpresa(req.params.id, req.body?.nombre, req.usuario) });
    } catch (err) {
        responderError(res, err, 'Error al eliminar la empresa');
    }
});

for (const [accion, activa] of [['desactivar', false], ['reactivar', true]]) {
    router.post(`/:id/${accion}`, async (req, res) => {
        try {
            if (!UUID.test(req.params.id)) return res.status(404).json({ error: 'Empresa no encontrada' });
            res.json({ empresa: await cambiarEstadoEmpresa(req.params.id, activa, req.usuario) });
        } catch (err) {
            responderError(res, err, `Error al ${accion} la empresa`);
        }
    });
}

export default router;
