// RN-04 (pacto portada-publica): hasta 5 solicitudes de cita por hora desde la misma
// conexion. Solo cuentan las que se guardaron: un error de validacion (400) no gasta
// intentos. Fabrica, para que los tests armen el suyo sin compartir la cuenta.
import rateLimit from 'express-rate-limit';
import { LIMITE_POR_HORA, MENSAJES_SOLICITUD } from '../services/solicitudReglas.js';

export const crearLimiteSolicitudes = ({ max = LIMITE_POR_HORA, ventanaMs = 60 * 60 * 1000 } = {}) => rateLimit({
    windowMs: ventanaMs,
    limit: max,
    skipFailedRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: MENSAJES_SOLICITUD.limite },
});
