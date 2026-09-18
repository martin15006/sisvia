// Numero de documento: solo numeros, de 6 a 10 digitos, sin 0 al inicio.
// Cubre la cedula colombiana nueva (10 digitos, NUIP desde 2004) y las viejas
// (6 a 8), la cedula de extranjeria y el PPT numericos.
// El frontend tiene su copia en frontend/src/lib/documento.js.

// Sin puntos, espacios ni guiones: "1.012.345.678" -> "1012345678". Vacio -> null.
// Tambien se usa en el login, para encontrar la cedula aunque la escriban con puntos.
export const normalizarDocumento = (documento) => {
    // Solo se quitan separadores: una letra no se borra, se rechaza al validar.
    const d = String(documento ?? "").replace(/[.\s-]/g, "");
    return d || null;
};

export const MENSAJE_DOCUMENTO = "El documento debe tener solo números, entre 6 y 10 dígitos, sin 0 al inicio.";

// Devuelve null si sirve, o el mensaje de error.
export const validarDocumento = (documento) => {
    const d = normalizarDocumento(documento);
    return d && /^[1-9]\d{5,9}$/.test(d) ? null : MENSAJE_DOCUMENTO;
};
