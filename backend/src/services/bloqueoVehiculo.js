// Reglas de bloqueo del vehiculo: UNA sola fuente de verdad.
//
// Las usan dos lugares que antes tenian cada uno su copia:
//   - chequeos.service.js  -> frena al conductor al iniciar el preoperacional
//   - dashboard.controller -> arma la lista "No pueden salir" del panel
// Si cada uno decide por su cuenta, el panel puede mostrar como bloqueado un
// vehiculo que el conductor si puede sacar (o al reves). Por eso viven aca.
//
// Este modulo es PURO a proposito: no importa la base de datos. Asi se prueba
// con `node --test` sin credenciales (importar config/supabase.js corta el
// proceso si faltan las variables de entorno).
//
// Pacto: docs/pactos/2026-09-16-identidad-y-correcciones.md · RN-01, HU-03

const MS_POR_DIA = 1000 * 60 * 60 * 24;

// Documentos legales que, vencidos, impiden circular. El orden decide cual se
// informa primero cuando hay mas de uno vencido.
const DOCUMENTOS = [
    ["SOAT", "soat_vencimiento"],
    ["revisión técnico-mecánica (RTM)", "rtm_vencimiento"],
    ["extintor", "extintor_vencimiento"],
];

const soloFecha = (valor) => {
    const d = new Date(valor);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Devuelve el PRIMER documento vencido { nombre, fechaLegible, diasVencido }
// o null si estan todos al dia. "Vence hoy" todavia es valido.
export const primerDocumentoVencido = (vehiculo, hoy = new Date()) => {
    const hoySolo = soloFecha(hoy);
    for (const [nombre, campo] of DOCUMENTOS) {
        const fecha = vehiculo[campo];
        if (!fecha) continue;
        const vence = soloFecha(fecha);
        if (vence < hoySolo) {
            return {
                nombre,
                fechaLegible: vence.toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                }),
                diasVencido: Math.floor((hoySolo - vence) / MS_POR_DIA),
            };
        }
    }
    return null;
};

// Por que un vehiculo NO puede arrancar un chequeo, o null si puede.
//
// Devuelve { razon, mensaje, detalle }:
//   razon   -> 'desactivado' | 'documento_vencido' | 'no_operativo' | 'critico'
//   mensaje -> lo que lee el CONDUCTOR al intentar iniciar
//   detalle -> la linea corta que ve el COORDINADOR en "No pueden salir"
//
// RN-01: el orden de las comprobaciones es el orden de gravedad, y el
// postoperacional no lo bloquea ninguna (el recorrido ya ocurrio y hay que
// poder registrar el cierre).
export const motivoBloqueo = (vehiculo, tipo, hoy = new Date()) => {
    if (tipo !== "preoperacional") return null;

    if (!vehiculo.activo) {
        return {
            razon: "desactivado",
            mensaje: `El vehiculo ${vehiculo.placa} esta deshabilitado por el administrador`,
            detalle: "Vehículo desactivado",
        };
    }

    const doc = primerDocumentoVencido(vehiculo, hoy);
    if (doc) {
        const dias = doc.diasVencido;
        return {
            razon: "documento_vencido",
            mensaje: `No puedes operar este vehículo: el ${doc.nombre} está vencido (desde el ${doc.fechaLegible}). Avísale al Coordinador de sede para que lo renueve.`,
            detalle: `${doc.nombre} vencido hace ${dias} ${dias === 1 ? "día" : "días"}`,
        };
    }

    if (vehiculo.estado === "no_operativo") {
        return {
            razon: "no_operativo",
            mensaje: "No puedes operar este vehículo: está marcado como no operativo. Avísale al Coordinador de sede para que lo revise.",
            detalle: "Marcado como no operativo",
        };
    }

    if (vehiculo.estado === "critico") {
        return {
            razon: "critico",
            mensaje: "No puedes operar este vehículo: está en estado crítico. Avísale al Coordinador de sede para que lo revise.",
            detalle: "Estado crítico tras el último chequeo",
        };
    }

    return null;
};

// Gravedad para ordenar "No pueden salir": menor numero = mas grave.
// Mismo orden que las comprobaciones de motivoBloqueo (RN-01).
export const GRAVEDAD_BLOQUEO = {
    desactivado: 1,
    documento_vencido: 2,
    no_operativo: 3,
    critico: 4,
};
