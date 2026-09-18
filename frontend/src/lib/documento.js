// Numero de documento: solo numeros, de 6 a 10 digitos, sin 0 al inicio.
// Copia de backend/src/utils/documento.js: el backend es el que manda; esto
// solo evita escribir lo que igual se va a rechazar.

export const AVISO_DOCUMENTO = "Solo números: de 6 a 10 dígitos, sin 0 al inicio";
export const EJEMPLO_DOCUMENTO = "Ej: 1012345678";

// Mientras se escribe: solo digitos, sin ceros adelante y maximo 10.
export const filtrarDocumento = (texto) =>
    (texto || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);

// Al guardar: entre 6 y 10 digitos.
export const documentoValido = (d) => /^[1-9]\d{5,9}$/.test(d || "");
