import {
    activarSuplencia,
    desactivarSuplencia,
    listarSuplencias,
    actividadDelPool,
} from '../services/suplencias.service.js';

const manejarError = (res, err, dondeError) => {
    console.error(dondeError, err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
};

export const postSuplencia = async (req, res) => {
    try {
        const { pool_id, alcance, sede_id, departamento_id, hasta, motivo } = req.body;
        if (!pool_id) return res.status(400).json({ error: 'Falta el conductor (pool_id).' });
        const suplencia = await activarSuplencia({
            actor: req.usuario,
            poolId: pool_id,
            alcance: alcance === 'departamento' ? 'departamento' : 'sede',
            sedeId: sede_id || null,
            departamentoId: departamento_id || null,
            hasta: hasta || null,
            motivo,
        });
        res.status(201).json({ suplencia });
    } catch (err) { manejarError(res, err, 'Error activando suplencia:'); }
};

export const patchDesactivarSuplencia = async (req, res) => {
    try {
        const suplencia = await desactivarSuplencia({ actor: req.usuario, suplenciaId: req.params.id });
        res.json({ suplencia });
    } catch (err) { manejarError(res, err, 'Error desactivando suplencia:'); }
};

export const getSuplencias = async (req, res) => {
    try {
        const { sede_id, activa } = req.query;
        const suplencias = await listarSuplencias({
            actor: req.usuario,
            sedeId: sede_id || null,
            soloActivas: activa === 'true',
        });
        res.json({ suplencias });
    } catch (err) { manejarError(res, err, 'Error listando suplencias:'); }
};

export const getActividadPool = async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const actividad = await actividadDelPool({
            actor: req.usuario,
            poolId: req.params.poolId,
            desde: desde || null,
            hasta: hasta || null,
        });
        res.json({ actividad });
    } catch (err) { manejarError(res, err, 'Error obteniendo actividad del pool:'); }
};
