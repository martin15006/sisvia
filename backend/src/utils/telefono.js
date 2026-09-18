// Telefono: celular colombiano (10 digitos, empieza por 3) o numero de otro
// pais escrito con + (codigo de pais + numero, hasta 15 digitos: norma E.164).
// El telefono NO es obligatorio: vacio es valido.
// El frontend tiene su copia en frontend/src/lib/telefono.js.

// Sin espacios ni guiones: "+57 300 123-4567" -> "+573001234567". Vacio -> null.
export const normalizarTelefono = (telefono) => {
    const t = String(telefono ?? "").trim();
    if (!t) return null;
    return t.startsWith("+") ? "+" + t.slice(1).replace(/\D/g, "") : t.replace(/\D/g, "");
};

export const MENSAJE_TELEFONO =
    "El teléfono debe ser un celular de 10 dígitos que empiece por 3, o un número de otro país que empiece con + (máximo 15 dígitos).";

// Devuelve null si sirve, o el mensaje de error.
export const validarTelefono = (telefono) => {
    const t = normalizarTelefono(telefono);
    if (t === null) return null;
    return /^3\d{9}$/.test(t) || /^\+\d{8,15}$/.test(t) ? null : MENSAJE_TELEFONO;
};
