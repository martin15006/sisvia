// Empresa a la que el superadmin "entró" (pacto para-empresas, HU-16).
// Se guarda en localStorage y el helper `api` la manda en el header
// `X-Empresa-Activa`; el backend solo la acepta si quien pide es superadmin.
// Cambiarla avisa con el evento `empresa-activa` para que el menú y la franja
// se actualicen.

import { claveStorage } from "./marca.js";

const KEY = claveStorage("empresa_activa");
const EVENTO = "empresa-activa";

export const getEmpresaActiva = () => {
    try {
        const guardada = JSON.parse(localStorage.getItem(KEY));
        return guardada?.id ? guardada : null;
    } catch {
        return null;
    }
};

export const setEmpresaActiva = (empresa) => {
    try {
        if (empresa?.id) localStorage.setItem(KEY, JSON.stringify({ id: empresa.id, nombre: empresa.nombre }));
        else localStorage.removeItem(KEY);
    } catch { /* sin almacenamiento: queda afuera */ }
    window.dispatchEvent(new CustomEvent(EVENTO));
};

export const clearEmpresaActiva = () => setEmpresaActiva(null);

export const escucharEmpresaActiva = (fn) => {
    window.addEventListener(EVENTO, fn);
    return () => window.removeEventListener(EVENTO, fn);
};
