// Telefono: celular colombiano (10 digitos, empieza por 3) o numero de otro
// pais escrito con + (codigo de pais + numero, hasta 15 digitos: norma E.164).
// Copia de backend/src/utils/telefono.js: el backend es el que manda; esto
// solo evita escribir lo que igual se va a rechazar.

export const AVISO_TELEFONO = "Celular de 10 dígitos que empieza por 3, o un número de otro país que empiece con +";
export const EJEMPLO_TELEFONO = "Ej: 3001234567 o +58 4121234567";

// Mientras se escribe: deja pasar solo lo que puede terminar siendo un numero valido.
export const filtrarTelefono = (texto) => {
    const t = (texto || "").trim();
    if (t.startsWith("+")) {
        return "+" + t.slice(1).replace(/\D/g, "").slice(0, 15);
    }
    const digitos = t.replace(/\D/g, "");
    if (digitos && digitos[0] !== "3") return "";
    return digitos.slice(0, 10);
};

// Al guardar: el numero tiene que estar completo. Vacio vale (no es obligatorio).
export const telefonoValido = (t) => !t || /^3\d{9}$/.test(t) || /^\+\d{8,15}$/.test(t);
