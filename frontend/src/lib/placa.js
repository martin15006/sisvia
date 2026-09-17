// Formatos de placa por tipo de vehiculo (Colombia, RUNT) y filtros de los
// campos placa y color. Copia de backend/src/utils/placa.js: el backend es el
// que manda; esto solo evita escribir lo que igual se va a rechazar.

const FORMATO_CARRO = "LLLNNN"; // L = letra, N = numero

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

const EJEMPLOS = { LLLNNN: "ABC123", LLLNNL: "ABC12D", NNNLLL: "123ABC" };
const DESCRIPCIONES = {
    LLLNNN: "3 letras y 3 números",
    LLLNNL: "3 letras, 2 números y 1 letra",
    NNNLLL: "3 números y 3 letras",
};

const formatoDe = (tipo) => FORMATOS_PLACA[tipo] || FORMATO_CARRO;

export const ayudaPlaca = (tipo) => {
    const f = formatoDe(tipo);
    return `${DESCRIPCIONES[f]} · ej. ${EJEMPLOS[f]}`;
};

export const ejemploPlaca = (tipo) => EJEMPLOS[formatoDe(tipo)];

// Mientras se escribe: mayusculas, sin espacios ni guiones, y cada caracter
// solo entra si le toca a su posicion (letra donde va letra, numero donde va
// numero). Nunca pasa del largo de la placa.
export const filtrarPlaca = (texto, tipo) => {
    const formato = formatoDe(tipo);
    let salida = "";
    for (const c of String(texto).toUpperCase().replace(/[^A-Z0-9]/g, "")) {
        if (salida.length >= formato.length) break;
        const toca = formato[salida.length];
        if ((toca === "L" && /[A-Z]/.test(c)) || (toca === "N" && /[0-9]/.test(c))) salida += c;
    }
    return salida;
};

export const validarPlaca = (placa, tipo) => {
    const f = formatoDe(tipo);
    const patron = new RegExp("^" + f.replace(/L/g, "[A-Z]").replace(/N/g, "[0-9]") + "$");
    const limpia = String(placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return patron.test(limpia) ? null : `La placa debe tener ${DESCRIPCIONES[f]} (ej. ${EJEMPLOS[f]}).`;
};

// Color: solo letras (con tildes y ñ) y espacios.
export const filtrarColor = (texto) => String(texto).replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "");
