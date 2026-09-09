// Pool · Suplencia Fase B (multi-sede).
// Cuando el pool cubre VARIAS sedes (toda una regional), elige cuál gestiona a la vez
// (el "sede activa"). Se guarda en localStorage y el helper `api` lo manda en el header
// `X-Sede-Activo`; el backend lo valida contra las sedes que cubre la suplencia y
// acota el scope a esa sede.

const KEY = "sisvia_sede_activa";

export const getSedeActiva = () => localStorage.getItem(KEY) || null;

export const setSedeActiva = (id) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
};

export const clearSedeActiva = () => localStorage.removeItem(KEY);
