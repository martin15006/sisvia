// Helpers para mantener el estado del chequeo entre pantallas (sessionStorage)
// Se limpia al cerrar el chequeo o al cerrar sesion

const KEY = "sisvia_chequeo_en_curso";

export const guardarChequeoEnCurso = (data) => {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
        console.error("No se pudo guardar el chequeo en curso:", err);
    }
};

export const obtenerChequeoEnCurso = () => {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const actualizarChequeoEnCurso = (cambios) => {
    const actual = obtenerChequeoEnCurso() || {};
    guardarChequeoEnCurso({ ...actual, ...cambios });
};

export const limpiarChequeoEnCurso = () => {
    sessionStorage.removeItem(KEY);
};
