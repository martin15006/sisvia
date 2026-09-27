// Correos de Soporte: uno por conversacion (pacto correos-de-soporte).
// Reglas puras. Cuando le toca correo a cada persona (HU-01.1-4: nunca avisada, o
// vio la conversacion despues del ultimo correo, y no la esta mirando) lo decide la
// base con reclamar_correo_buzon, en la misma operacion que lo anota (CB-01); aca
// va a quienes se les pregunta y que hacer si el envio falla.
import { MARCA } from '../config/marca.js';

// HU-01.4: la vio en los ultimos 10 minutos = la esta mirando (firmado 2026-09-27).
export const VENTANA_MIRANDO_MIN = 10;
export const VENTANA_MIRANDO = `${VENTANA_MIRANDO_MIN} minutes`;

// Abierta en pantalla, la conversacion se pide cada segundo: "la vio" se anota a lo
// sumo cada 30 s por persona. Con la ventana de 10 minutos, no cambia nada.
export const FRENO_VISTO_MS = 30 * 1000;

export const MENSAJES_CORREOS = {
    // HU-01.1: al final de cada correo de Soporte (CL-02: el nombre sale de la marca).
    pie: `Mientras no abras esta conversación en ${MARCA.nombre}, no te llegan más correos de ella.`,
    // HU-03.2 y HU-03.4
    apagados: 'Listo: ya no te llegan correos de Soporte.',
    prendidos: 'Listo: te vuelven a llegar los correos de Soporte.',
    soloAdministradores: 'Solo los Administradores reciben correos de Soporte.',
    valorInvalido: 'Indica si quieres recibir los correos de Soporte.',
};

// HU-03: quien apago los correos de Soporte no entra en la lista (la campanita, si).
const conCorreos = (u) => u?.correos_soporte !== false;
export const conCorreosPrendidos = (personas = []) => personas.filter(conCorreos).map((u) => u.id);

// HU-02: a quien del equipo SISVIA se le pregunta si le toca correo.
//   equipo  -> los Administradores generales activos, con su interruptor
//   atiende -> quien del equipo respondio por ultima vez (o nadie)
// Si atiende sigue en el equipo y tiene los correos prendidos, solo a el (HU-02.2).
// Si los apago, a los demas que los tienen prendidos (HU-02.3). Si nadie respondio
// todavia, o quien respondio ya no esta en el equipo, a todos (HU-02.1 · CB-04).
export const destinatariosCorreoEquipo = ({ equipo = [], atiende = null } = {}) => {
    const suyo = atiende ? equipo.find((u) => u.id === atiende) : null;
    if (suyo && conCorreos(suyo)) return [suyo.id];
    return conCorreosPrendidos(equipo);
};

// CB-02: si el correo no salio por un error, esos reclamos se liberan para que el
// mensaje siguiente lo vuelva a intentar. Con el correo apagado en el servidor
// (RN-04) o sin direcciones reales, la decision queda tomada: no hay que reintentar.
export const reclamosALiberar = (resultado, reclamos = []) => (resultado?.error ? reclamos : []);

// HU-03.2 y HU-03.4: quien puede cambiar el interruptor y con que valor.
export const RECIBEN_CORREOS_SOPORTE = ['superadmin', 'admin_empresa'];
export const puedeElegirCorreosSoporte = (rol) => RECIBEN_CORREOS_SOPORTE.includes(rol);
export const leerInterruptor = (cuerpo) => (typeof cuerpo?.activo === 'boolean' ? cuerpo.activo : null);
