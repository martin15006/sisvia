import { resolverSuperior, enviarInforme } from '../services/escalacion.service.js';

// GET /api/escalacion/superior — para que el frontend sepa si mostrar el botón y a quién.
export const getSuperior = async (req, res) => {
    try {
        const superior = await resolverSuperior(req.usuario);
        res.json({
            tieneSuperior: !superior.sinSuperior,
            etiqueta: superior.etiqueta, // ej. "el Director Regional de Tolima"
        });
    } catch (err) {
        console.error('Error resolviendo superior:', err);
        res.status(500).json({ error: 'No se pudo resolver el superior.' });
    }
};

// POST /api/escalacion/informe — envía el informe al superior (correo + campanita).
export const postInforme = async (req, res) => {
    try {
        const { asunto, mensaje, incluir_resumen } = req.body;
        const resultado = await enviarInforme({
            usuario: req.usuario,
            asunto,
            mensaje,
            incluirResumen: incluir_resumen === true,
        });
        if (!resultado.ok) {
            return res.status(resultado.status || 400).json({ error: resultado.error });
        }
        res.json(resultado);
    } catch (err) {
        console.error('Error enviando informe:', err);
        res.status(500).json({ error: 'No se pudo enviar el informe.' });
    }
};
