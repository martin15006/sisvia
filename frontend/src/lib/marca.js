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

    // Contacto publico del equipo (portada y pie). La copia de las solicitudes
    // al correo personal NO va aca: es SOLICITUDES_COPIA, en el backend.
    contacto: {
        correo: "sisviacontacto@gmail.com",
        whatsapp: "573332540815",         // para wa.me: codigo de pais + numero
        whatsappVisible: "333 254 0815",  // como se muestra
        ciudad: "Ibagué, Tolima",
    },

    // Direccion publica de la app: la usa la vista previa al compartir el
    // enlace (og:url, og:image), que exige direcciones completas.
    urlPublica: "https://sisvia.pages.dev",

    // Prefijo de todas las claves de localStorage. Cambiarlo obliga a
    // todos los navegadores a empezar limpio (util al renombrar).
    prefijoStorage: "sisvia",
};

// El nombre de la ORGANIZACION (el cliente) ya no va aca: es la empresa de cada
// usuario (pacto para-empresas, HU-08). Ver lib/organizacion.js.

// Helper para armar claves de storage sin repetir el prefijo.
export const claveStorage = (nombre) => `${MARCA.prefijoStorage}_${nombre}`;
