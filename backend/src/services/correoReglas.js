// Regla PURA del correo: a que direcciones se manda de verdad.
// Los dominios reservados para pruebas y ejemplos (RFC 2606 y RFC 6761) nunca
// existen: mandarles un correo solo genera un rebote en la cuenta de Gmail que
// envia. Las cuentas de prueba (@sisvia.test) caen aca.
const RESERVADOS = /\.(test|example|invalid|localhost)$/i;

export const esCorreoReal = (email) => {
    const dominio = String(email || '').trim().split('@')[1] || '';
    return dominio.length > 0 && !RESERVADOS.test(dominio) && !/^example\.(com|net|org)$/i.test(dominio);
};

export const destinosReales = (para) => (Array.isArray(para) ? para : [para]).filter(Boolean).filter(esCorreoReal);

// Interruptor del correo (pedido de Martín, 2026-09-21): CORREO_ACTIVO=1 encendido,
// CORREO_ACTIVO=0 apagado. Si no esta, queda encendido (asi produccion no cambia).
// Apagado, la campanita sigue igual: solo no sale ningun correo (util para probar).
export const estadoDelCorreo = ({ usuario, clave, activo }) => {
    if (String(activo ?? '').trim() === '0') return { encendido: false, motivo: 'CORREO_ACTIVO=0' };
    if (!usuario || !clave) return { encendido: false, motivo: 'sin GMAIL_USER / GMAIL_APP_PASSWORD' };
    return { encendido: true, motivo: null };
};
