// Reglas de placa y color del vehiculo (formatos de Colombia, RUNT).
// Modulo puro: sin base de datos, para poder probarlo con node --test.
// El frontend tiene su copia en frontend/src/lib/placa.js: si cambias un
// formato aca, cambialo alla tambien.

// L = letra, N = numero. Todos los formatos tienen 6 caracteres.
const FORMATO_CARRO = "LLLNNN";

export const FORMATOS_PLACA = {
    automovil: FORMATO_CARRO,
    camioneta: FORMATO_CARRO,
    camion: FORMATO_CARRO,
    tractocamion: FORMATO_CARRO,
    microbus: FORMATO_CARRO,
    buseta: FORMATO_CARRO,
    bus: FORMATO_CARRO,
    motocicleta: "LLLNNL",
    motocarro: "NNNLLL",
};

export const TIPOS_VEHICULO = Object.keys(FORMATOS_PLACA);

const EJEMPLOS = { LLLNNN: "ABC123", LLLNNL: "ABC12D", NNNLLL: "123ABC" };
const DESCRIPCIONES = {
    LLLNNN: "3 letras y 3 números",
    LLLNNL: "3 letras, 2 números y 1 letra",
    NNNLLL: "3 números y 3 letras",
};

// Mayusculas y sin espacios ni guiones: "abc-123" y "ABC 123" son la misma placa.
export const normalizarPlaca = (placa) =>
    String(placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const formatoDePlaca = (tipo) => FORMATOS_PLACA[tipo] || null;

// Devuelve null si la placa sirve para ese tipo, o el mensaje de error.
export const validarPlaca = (placa, tipo) => {
    const formato = formatoDePlaca(tipo);
    if (!formato) return "Tipo de vehículo no válido.";
    const limpia = normalizarPlaca(placa);
    const patron = new RegExp(
        "^" + formato.replace(/L/g, "[A-Z]").replace(/N/g, "[0-9]") + "$"
    );
    if (patron.test(limpia)) return null;
    return `La placa debe tener ${DESCRIPCIONES[formato]} (ej. ${EJEMPLOS[formato]}).`;
};

// Solo letras (con tildes y ñ) y espacios: "Gris plata" sirve, "Rojo 2" no.
export const validarColor = (color) => {
    if (color === null || color === undefined || color === "") return null;
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(String(color).trim())
        ? null
        : "El color solo puede tener letras.";
};
