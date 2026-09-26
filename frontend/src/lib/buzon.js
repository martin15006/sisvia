// "Escribir a SISVIA" (pacto para-empresas, HU-18). En pantalla: "Soporte".
// Los textos y limites son los mismos que valida el backend (buzonReglas.js).

export const TIPOS_BUZON = [
    ["falla", "Algo falla"],
    ["duda", "Tengo una duda"],
    ["cupo", "Necesito más cupo del plan"],
    ["traspaso", "Traspaso de un vehículo"],
    ["idea", "Una idea"],
];

export const ESTADOS_BUZON = { nuevo: "Nuevo", en_revision: "En revisión", resuelto: "Resuelto" };

export const MENSAJE_MAX = 2000;
export const ADJUNTO_MAX = 5 * 1024 * 1024; // 5 MB
export const ADJUNTO_ACEPTA = "image/jpeg,image/png,application/pdf";
export const TEXTO_ADJUNTO_INVALIDO = "El archivo debe ser una imagen JPG o PNG, o un PDF, de hasta 5 MB.";

// El mismo control que el backend (que ademas mira los primeros bytes del archivo).
export const adjuntoValido = (archivo) =>
    !!archivo && ["image/jpeg", "image/png", "application/pdf"].includes(archivo.type) && archivo.size >= 1 && archivo.size <= ADJUNTO_MAX;

export const tamanoLegible = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Abrir el formulario desde cualquier pantalla (la barra de arriba lo escucha).
// detalle: { tipo, mensaje } para llegar con el tipo ya elegido (HU-18.9).
const EVENTO = "sisvia:escribir";
export const abrirEscribirSisvia = (detalle = {}) => window.dispatchEvent(new CustomEvent(EVENTO, { detail: detalle }));
export const escucharEscribirSisvia = (fn) => {
    const manejar = (e) => fn(e.detail || {});
    window.addEventListener(EVENTO, manejar);
    return () => window.removeEventListener(EVENTO, manejar);
};

// Cuando alguien escribe o responde, el numero del menu se actualiza.
const EVENTO_CAMBIO = "sisvia:buzon-cambio";
export const avisarCambioBuzon = () => window.dispatchEvent(new Event(EVENTO_CAMBIO));
export const escucharCambioBuzon = (fn) => {
    window.addEventListener(EVENTO_CAMBIO, fn);
    return () => window.removeEventListener(EVENTO_CAMBIO, fn);
};
