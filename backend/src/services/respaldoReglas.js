// IP y navegador en el Registro del equipo (pacto portada-publica, enmienda 1:
// HU-07 · RN-07). Reglas puras: que IP guardar y cuando.
import { describirNavegador } from './buzonReglas.js';

// CB-14: la IP real, sin el prefijo IPv4-en-IPv6 ("::ffff:190.24.10.5" -> "190.24.10.5").
export const normalizarIp = (ip) => {
    const t = String(ip ?? '').trim();
    if (!t) return null;
    return (t.toLowerCase().startsWith('::ffff:') && t.includes('.') ? t.slice(7) : t).slice(0, 64);
};

// RN-07: solo de lo que hace el equipo SISVIA. CB-17: sin navegador, queda vacio
// (en pantalla dice "navegador desconocido").
export const datosDeRespaldo = ({ usuario, ip, agente }) => {
    if (usuario?.rol !== 'superadmin') return {};
    return {
        ip: normalizarIp(ip),
        navegador: String(agente || '').trim() ? describirNavegador(agente) : null,
    };
};

// HU-07.1: la linea debajo de cada renglon del Registro del equipo. Sin IP (lo de
// antes de la enmienda), no hay linea (HU-07.2).
export const lineaDeRespaldo = ({ ip, navegador }) =>
    (ip ? `IP ${ip} · ${navegador || 'navegador desconocido'}` : null);
