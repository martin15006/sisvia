// Solicitudes de cita de la portada (pacto portada-publica, HU-04): aviso entre la
// pagina Solicitudes y el numero del menu cuando una se marca o se borra.
const EVENTO_CAMBIO = "sisvia:solicitudes-cambio";

export const avisarCambioSolicitudes = () => window.dispatchEvent(new Event(EVENTO_CAMBIO));
export const escucharCambioSolicitudes = (fn) => {
    window.addEventListener(EVENTO_CAMBIO, fn);
    return () => window.removeEventListener(EVENTO_CAMBIO, fn);
};

// HU-02.8 (enmienda 1): lo que no va se descarta al teclear o pegar. Mismas reglas
// que el servidor (backend/src/services/solicitudReglas.js: nombreValido, ciudadValida).
// Lo que queda de "Ana 2 López" no deja dos espacios seguidos (CB-15).
const unEspacio = (texto) => texto.replace(/\s{2,}/g, " ");
// Tu nombre: letras (tildes, ñ, ü), espacios, apostrofe, guion y punto.
export const limpiarNombre = (texto) => unEspacio(texto.replace(/[^\p{L}\p{M}\s'’.-]/gu, ""));
// Ciudad: sin numeros.
export const limpiarCiudad = (texto) => unEspacio(texto.replace(/\p{N}/gu, ""));
