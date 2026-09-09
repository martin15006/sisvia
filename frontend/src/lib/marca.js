// ============================================================
// MARCA — identidad del producto en UN SOLO LUGAR.
//
// Si algun dia el producto cambia de nombre, se cambia ACA y en
// backend/src/config/marca.js. Nada mas. No hardcodear el nombre
// en componentes, titulos, correos ni documentos.
// ============================================================

export const MARCA = {
    // Nombre corto: el que va en el sidebar, el titulo y los correos.
    nombre: "SISVIA",

    // Nombre + descriptor: portada de documentos y pie de correos.
    nombreLargo: "SISVIA · Control de vehículos",

    // Una linea de que hace el producto (meta description, login).
    lema: "Chequeo preoperacional y control de vehículos",

    // Logo servido desde /public.
    logo: "/logo.png",

    // Prefijo de todas las claves de localStorage. Cambiarlo obliga a
    // todos los navegadores a empezar limpio (util al renombrar).
    prefijoStorage: "sisvia",
};

// Nombre de la ORGANIZACION que usa el sistema (el cliente, no el producto).
// Sale en la cabecera de los PDF/Word y en el sidebar. Se configura por
// entorno para que el mismo build sirva a varios clientes.
export const ORGANIZACION =
    import.meta.env.VITE_ORG_NOMBRE || "Mi organización";

// Helper para armar claves de storage sin repetir el prefijo.
export const claveStorage = (nombre) => `${MARCA.prefijoStorage}_${nombre}`;
