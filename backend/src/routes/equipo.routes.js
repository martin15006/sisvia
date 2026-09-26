// Lo de los dueños de SISVIA (pacto para-empresas, HU-20; enmienda 7: varios dueños).
//   GET  /api/equipo/registro?persona=&empresa=&desde=&hasta=&despues_de=   Registro del equipo
//   GET  /api/equipo/duenos                                                 quiénes tienen la marca
//   GET  /api/equipo/candidatos                                             a quién se le puede dar
//   POST /api/equipo/dar-marca        { destino_id, nombre, password }      el otro queda dueño también
//   POST /api/equipo/pasar-marca      { destino_id, nombre, password }      el otro queda y yo dejo de serlo
//   POST /api/equipo/quitarme-marca   { nombre, password }                  renuncio a la mía (el último no puede)
import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { supabase } from '../config/supabase.js';
import { MENSAJES_ACTIVIDAD, puedeVerRegistroEquipo, leerFiltros } from '../services/actividadReglas.js';
import { MENSAJES_DUENO, esDueno, motivoNoDarMarca, motivoNoQuitarme, errorDeMarca } from '../services/duenoReglas.js';
import { listarActividad } from '../services/actividad.service.js';
import { verificarContrasena } from '../services/soporte.service.js';
import { avisarCambioDeMarca } from '../services/dueno.service.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use(verificarToken);

// HU-20.1-2: todo lo que hizo el equipo SISVIA, solo para los dueños.
router.get('/registro', async (req, res) => {
    try {
        if (!puedeVerRegistroEquipo(req.usuario)) return res.status(403).json({ error: MENSAJES_ACTIVIDAD.soloDueno });
        const { filtros, error } = leerFiltros(req.query, { equipo: true });
        if (error) return res.status(400).json({ error });
        res.json(await listarActividad({ equipo: true }, filtros));
    } catch (err) {
        console.error('Error listando el registro del equipo:', err);
        res.status(500).json({ error: 'Error al cargar el registro del equipo' });
    }
});

// HU-20.3: quiénes tienen la marca (lo ve todo el equipo SISVIA: es parte de quién es quién).
router.get('/duenos', async (req, res) => {
    try {
        if (req.usuario?.rol !== 'superadmin') return res.status(403).json({ error: MENSAJES_ACTIVIDAD.soloDueno });
        const { data, error } = await supabase
            .from('usuarios').select('id, nombre_completo').eq('es_dueno', true).order('nombre_completo');
        if (error) throw error;
        res.json({ duenos: data || [] });
    } catch (err) {
        console.error('Error listando los dueños:', err);
        res.status(500).json({ error: 'Error al cargar los dueños de SISVIA' });
    }
});

// HU-20.5: a quién se le puede dar la marca (Administradores generales activos que no la tienen).
router.get('/candidatos', async (req, res) => {
    try {
        if (!esDueno(req.usuario)) return res.status(403).json({ error: MENSAJES_DUENO.soloDueno });
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre_completo')
            .eq('rol', 'superadmin').eq('activo', true).eq('es_dueno', false).neq('id', req.usuario.id)
            .order('nombre_completo');
        if (error) throw error;
        res.json({ candidatos: data || [] });
    } catch (err) {
        console.error('Error listando a quién darle la marca:', err);
        res.status(500).json({ error: 'Error al cargar el equipo SISVIA' });
    }
});

// La contraseña del propio dueño. Códigos propios: los de soporte harían que el
// navegador abra el modal de "confirma con tu contraseña" de HU-16, y este pedido
// ya trae la suya.
const contrasenaOk = async (req, res, password) => {
    if (!password) {
        res.status(400).json({ error: MENSAJES_DUENO.escribeContrasena });
        return false;
    }
    const fallo = await verificarContrasena(req.usuario.email, String(password));
    if (fallo) {
        res.status(403).json({ error: fallo.error, codigo: fallo.bloqueada ? 'marca_bloqueada' : 'marca_contrasena' });
        return false;
    }
    return true;
};

const responderError = (res, err, generico) => {
    const conocido = errorDeMarca(err.message);
    if (conocido) return res.status(conocido.status).json({ error: conocido.error });
    console.error(generico, err);
    return res.status(500).json({ error: generico });
};

// HU-20.5 y HU-20.6: dar la marca, o pasarla. La base lo hace en un solo paso y lo anota.
for (const [ruta, funcion, hecho, aviso] of [
    ['dar-marca', 'dar_marca_dueno', (n) => `${n} ya es dueño de SISVIA.`, 'dio'],
    ['pasar-marca', 'pasar_marca_dueno', (n) => `La marca de dueño pasó a ${n}. Ya no eres dueño de SISVIA.`, 'paso'],
]) {
    router.post(`/${ruta}`, async (req, res) => {
        try {
            const { destino_id: destinoId, nombre, password } = req.body || {};
            if (!esDueno(req.usuario)) return res.status(403).json({ error: MENSAJES_DUENO.soloDueno });

            let destino = null;
            if (UUID.test(String(destinoId || ''))) {
                const { data } = await supabase.from('usuarios').select('id, rol, activo, es_dueno, nombre_completo').eq('id', destinoId).maybeSingle();
                destino = data;
            }
            const motivo = motivoNoDarMarca({ actor: req.usuario, destino, nombreEscrito: nombre });
            if (motivo) return res.status(400).json({ error: motivo });
            if (!(await contrasenaOk(req, res, password))) return undefined;

            const { error } = await supabase.rpc(funcion, { p_de: req.usuario.id, p_a: destino.id });
            if (error) return responderError(res, error, 'Error al cambiar la marca de dueño');
            // La campanita le avisa a quien la recibe y a los demás dueños (enmienda 8)
            await avisarCambioDeMarca({ accion: aviso, actor: req.usuario, destino });
            return res.json({ mensaje: hecho(destino.nombre_completo) });
        } catch (err) {
            return responderError(res, err, 'Error al cambiar la marca de dueño');
        }
    });
}

// HU-20.7: quitarse la propia. El único dueño no puede (RN-15 · CB-23).
router.post('/quitarme-marca', async (req, res) => {
    try {
        const { nombre, password } = req.body || {};
        const motivo = motivoNoQuitarme({ actor: req.usuario, nombreEscrito: nombre });
        if (motivo) return res.status(motivo === MENSAJES_DUENO.soloDueno ? 403 : 400).json({ error: motivo });
        if (!(await contrasenaOk(req, res, password))) return undefined;

        const { error } = await supabase.rpc('quitarme_marca_dueno', { p_quien: req.usuario.id });
        if (error) return responderError(res, error, 'Error al quitarte la marca de dueño');
        await avisarCambioDeMarca({ accion: 'quito', actor: req.usuario });
        return res.json({ mensaje: 'Ya no eres dueño de SISVIA.' });
    } catch (err) {
        return responderError(res, err, 'Error al quitarte la marca de dueño');
    }
});

export default router;
