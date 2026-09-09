// Descarga un archivo de un endpoint protegido (manda el token, lee el blob y dispara
// la descarga). `endpoint` es relativo a /api. Lanza Error con el mensaje del backend.
import { API_URL } from './api.js';

export const descargarArchivo = async (endpoint, nombreSugerido) => {
    const token = localStorage.getItem('token');
    const sedeActiva = localStorage.getItem('sisvia_sede_activa');
    const resp = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(sedeActiva && { 'X-Sede-Activo': sedeActiva }),
        },
    });
    if (!resp.ok) {
        let msg = 'No se pudo generar el documento';
        try { msg = (await resp.json()).error || msg; } catch { /* respuesta no-JSON */ }
        throw new Error(msg);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreSugerido || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
