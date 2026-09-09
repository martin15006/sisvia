// En PRODUCCION (Cloudflare) inyectamos la URL del backend por la variable VITE_API_URL
// (ej: https://mi-backend.up.railway.app/api). Vite la "hornea" en el build.
// En DESARROLLO (sin esa variable) caemos al backend local usando el hostname actual,
// para que siga funcionando en localhost y desde un celular en el mismo wifi.
// Exportada para que TODAS las llamadas con `fetch` crudo (subida de fotos, RUNT,
// descargas, etc.) usen la MISMA base que el helper `api()` y no se desincronicen.
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`;

export const api = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    // Pool multi-sede: la sede que el suplente esta gestionando ahora (ver
    // lib/sedeActiva.js). El backend lo valida contra las sedes que cubre.
    const sedeActiva = localStorage.getItem('sisvia_sede_activa');

    const headers = {
        'Content-type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(sedeActiva && { 'X-Sede-Activo': sedeActiva }),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        cache: 'no-store',
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const metodo = (options.method || 'GET').toUpperCase();
    const separador = endpoint.includes('?') ? '&' : '?';
    const urlFinal =
        metodo === 'GET'
            ? `${API_URL}${endpoint}${separador}_=${Date.now()}`
            : `${API_URL}${endpoint}`;

    let response;
    try {
        response = await fetch(urlFinal, config);
    } catch (err) {
        throw new Error('No se pudo conectar al servidor');
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && endpoint !== '/auth/login') {
        window.dispatchEvent(
            new CustomEvent('auth:expirado', {
                detail: { mensaje: data.error || 'Tu sesión expiró' },
            })
        );
        const err = new Error(data.error || 'Sesión expirada');
        err.sesionExpirada = true;
        throw err;
    }

    // Cuenta desactivada: el middleware lo devuelve (403 "Cuenta desactivada") en
    // CUALQUIER request si activo=false. Cerramos sesion y avisamos en el login.
    if (
        response.status === 403 &&
        data.error === 'Cuenta desactivada' &&
        endpoint !== '/auth/login'
    ) {
        window.dispatchEvent(
            new CustomEvent('auth:desactivado', {
                detail: {
                    mensaje:
                        'Tu cuenta fue desactivada. Contacta al administrador del sistema.',
                },
            })
        );
        const err = new Error('Cuenta desactivada');
        err.cuentaDesactivada = true;
        throw err;
    }

    if (!response.ok) {
        // Adjuntamos el status al Error para que los callers puedan diferenciar
        // entre tipos de fallo (401, 403, 404, etc) y mostrar UI distinta.
        const err = new Error(data.error || `Error ${response.status}`);
        err.status = response.status;
        throw err;
    }

    return data;
};
