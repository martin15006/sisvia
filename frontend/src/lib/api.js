// En PRODUCCION (Cloudflare) inyectamos la URL del backend por la variable VITE_API_URL
// (ej: https://mi-backend.up.railway.app/api). Vite la "hornea" en el build.
// En DESARROLLO (sin esa variable) caemos al backend local usando el hostname actual,
// para que siga funcionando en localhost y desde un celular en el mismo wifi.
// Exportada para que TODAS las llamadas con `fetch` crudo (subida de fotos, RUNT,
// descargas, etc.) usen la MISMA base que el helper `api()` y no se desincronicen.
import { getEmpresaActiva, clearEmpresaActiva } from './empresaActiva.js';
import { passwordRecordada, recordarPassword, olvidarPassword, pedirPassword } from './confirmarSoporte.js';

export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`;

// Encabezados comunes de todo pedido al backend: token, sede activa del pool y
// empresa a la que entro el superadmin (HU-16). Los usan api(), apiArchivo() y
// las descargas.
export const encabezados = (extra = {}) => {
    const token = localStorage.getItem('token');
    // Pool multi-sede: la sede que el suplente esta gestionando ahora (ver
    // lib/sedeActiva.js). El backend lo valida contra las sedes que cubre.
    const sedeActiva = localStorage.getItem('sisvia_sede_activa');
    const empresaActiva = getEmpresaActiva();
    return {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(sedeActiva && { 'X-Sede-Activo': sedeActiva }),
        ...(empresaActiva && { 'X-Empresa-Activa': empresaActiva.id }),
        ...extra,
    };
};

const hacerPedido = async (url, config) => {
    let response;
    try {
        response = await fetch(url, config);
    } catch {
        throw new Error('No se pudo conectar al servidor');
    }
    const data = await response.json().catch(() => ({}));
    return { response, data };
};

// confirmacion_bloqueada: 5 contraseñas malas seguidas (HU-16.5). El modal muestra
// el bloqueo con 'Confirmar' deshabilitado; solo se puede cancelar.
const PIDE_PASSWORD = ['confirmar_password', 'contrasena_incorrecta', 'confirmacion_bloqueada'];

// HU-16.2-3: si el backend pide la contraseña del superadmin, la pide con el
// modal y reintenta. Si se cancela, no se hace nada.
const conConfirmacion = async (hacer) => {
    let intento = await hacer(passwordRecordada());
    while (intento.response.status === 403 && PIDE_PASSWORD.includes(intento.data.codigo)) {
        olvidarPassword();
        const bloqueado = intento.data.codigo === 'confirmacion_bloqueada';
        const password = await pedirPassword({
            accion: intento.data.accion,
            empresa: intento.data.empresa,
            // El primer pedido no es un error: solo cuando la contraseña no sirvio.
            error: intento.data.codigo === 'confirmar_password' ? null : intento.data.error,
            bloqueado,
        });
        if (password === null) {
            const err = new Error(bloqueado ? intento.data.error : 'Cancelaste el cambio: no se guardó nada.');
            err.cancelado = true;
            throw err;
        }
        intento = await hacer(password);
        if (intento.response.ok) recordarPassword(password);
    }
    return intento;
};

// Errores comunes a todos los pedidos. Devuelve los datos si salio bien.
const interpretar = (endpoint, { response, data }) => {
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

    // Empresa desactivada (HU-03.3 · CB-11): igual que la cuenta desactivada, pero
    // con el texto que manda el servidor ("Tu empresa está desactivada...").
    if (
        response.status === 403 &&
        data.codigo === 'empresa_desactivada' &&
        endpoint !== '/auth/login'
    ) {
        window.dispatchEvent(
            new CustomEvent('auth:desactivado', { detail: { mensaje: data.error } })
        );
        const err = new Error(data.error);
        err.cuentaDesactivada = true;
        throw err;
    }

    // La empresa a la que entro el superadmin ya no existe: sale de ella.
    if (data.codigo === 'empresa_activa_invalida') {
        clearEmpresaActiva();
    }

    if (!response.ok) {
        // Adjuntamos el status al Error para que los callers puedan diferenciar
        // entre tipos de fallo (401, 403, 404, etc) y mostrar UI distinta.
        const err = new Error(data.error || `Error ${response.status}`);
        err.status = response.status;
        // Codigo del backend (ej. limite_plan, placa_en_sisvia) para ofrecer un atajo (HU-18.9).
        if (data.codigo) err.codigo = data.codigo;
        throw err;
    }

    return data;
};

export const api = async (endpoint, options = {}) => {
    const metodo = (options.method || 'GET').toUpperCase();
    const separador = endpoint.includes('?') ? '&' : '?';
    const urlFinal =
        metodo === 'GET'
            ? `${API_URL}${endpoint}${separador}_=${Date.now()}`
            : `${API_URL}${endpoint}`;

    const hacer = (password) =>
        hacerPedido(urlFinal, {
            ...options,
            headers: encabezados({
                'Content-type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                ...(password && { 'X-Confirmar-Password': encodeURIComponent(password) }),
                ...options.headers,
            }),
            cache: 'no-store',
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

    return interpretar(endpoint, metodo === 'GET' ? await hacer(null) : await conConfirmacion(hacer));
};

// Igual que api(), para subir archivos (FormData): fotos y RUNT de un vehiculo.
export const apiArchivo = async (endpoint, formData, { method = 'POST' } = {}) => {
    const hacer = (password) =>
        hacerPedido(`${API_URL}${endpoint}`, {
            method,
            headers: encabezados(password ? { 'X-Confirmar-Password': encodeURIComponent(password) } : {}),
            body: formData,
        });
    return interpretar(endpoint, await conConfirmacion(hacer));
};
