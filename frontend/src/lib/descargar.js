// Descarga un archivo de un endpoint protegido (manda el token, lee el blob y dispara
// la descarga). `endpoint` es relativo a /api. Lanza Error con el mensaje del backend.
import { API_URL, encabezados } from './api.js';

// Sin nombre sugerido, usa el que manda el servidor (Content-Disposition).
const nombreDelServidor = (resp) =>
    (resp.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1];

export const descargarArchivo = async (endpoint, nombreSugerido, { method = 'GET' } = {}) => {
    // Mismos encabezados que api(): token, sede activa y empresa activa (HU-16).
    const resp = await fetch(`${API_URL}${endpoint}`, { method, headers: encabezados() });
    if (!resp.ok) {
        let msg = 'No se pudo generar el documento';
        try { msg = (await resp.json()).error || msg; } catch { /* respuesta no-JSON */ }
        throw new Error(msg);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreSugerido || nombreDelServidor(resp) || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
