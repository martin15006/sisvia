// Reglas PURAS de la marca "Dueño de SISVIA" (pacto para-empresas, HU-20.3-7 ·
// RN-15 · CB-22 · CB-23; enmienda 7: varios dueños). Sin base de datos, para
// probarlas con node --test.
//
// La marca vive en usuarios.es_dueno y puede estar en varias cuentas, siempre
// Administradores generales activos. Desde la app:
//   · un dueño DA la marca a otra cuenta (los dos quedan dueños),
//   · o se la PASA (el otro queda y él deja de serlo),
//   · o SE QUITA la suya, salvo que sea el único.
// Nadie le quita la marca a otro desde la app: eso se hace en la base (RN-15),
// porque sacar a otro dueño desde la app permitiría un secuestro de la cuenta.

export const MENSAJES_DUENO = {
    protegida: 'Esta cuenta es la del dueño de SISVIA: no se puede desactivar, eliminar ni cambiar de rol. Para dejar de ser dueño, quítate la marca.',
    soloDueno: 'Solo un dueño de SISVIA puede cambiar la marca.',
    destinoInvalido: 'Solo se le puede dar la marca a un Administrador general activo que todavía no la tenga.',
    nombreDistinto: 'El nombre no coincide: no se cambió nada.',
    yaCambio: 'La marca de dueño ya cambió. Recarga la página.',
    ultimoDueno: 'No puedes quitarte la marca: eres el único dueño de SISVIA. Primero dásela a otra cuenta.',
    escribeContrasena: 'Escribe tu contraseña para cambiar la marca.',
};

// HU-20.4: lo que no se le hace a una cuenta con la marca, la pida quien la pida
// (también ella misma). accion: 'desactivar' | 'eliminar' | 'cambiar_rol'.
const PROHIBIDAS = ['desactivar', 'eliminar', 'cambiar_rol'];
export const protegerDueno = (afectado, accion) =>
    afectado?.es_dueno === true && PROHIBIDAS.includes(accion) ? MENSAJES_DUENO.protegida : null;

export const esDueno = (usuario) => usuario?.rol === 'superadmin' && usuario?.es_dueno === true;

// El nombre se compara exacto; solo se perdonan los espacios de las puntas.
const mismoNombre = (escrito, esperado) => String(escrito ?? '').trim() === String(esperado ?? '').trim();

// HU-20.5 · HU-20.6 · CB-22: ¿se le puede dar (o pasar) la marca a esta cuenta?
// Devuelve el mensaje, o null si sí.
export const motivoNoDarMarca = ({ actor, destino, nombreEscrito }) => {
    if (!esDueno(actor)) return MENSAJES_DUENO.soloDueno;
    if (!destino || destino.id === actor.id || destino.rol !== 'superadmin' || destino.activo !== true || destino.es_dueno === true) {
        return MENSAJES_DUENO.destinoInvalido;
    }
    if (!mismoNombre(nombreEscrito, destino.nombre_completo)) return MENSAJES_DUENO.nombreDistinto;
    return null;
};

// HU-20.7: quitarse la propia. Se escribe el nombre de uno mismo, para no hacerlo sin querer.
// Que sea el último lo decide la base, que es la que puede mirarlos a todos a la vez (CB-23).
export const motivoNoQuitarme = ({ actor, nombreEscrito }) => {
    if (!esDueno(actor)) return MENSAJES_DUENO.soloDueno;
    if (!mismoNombre(nombreEscrito, actor.nombre_completo)) return MENSAJES_DUENO.nombreDistinto;
    return null;
};

// Las funciones de la base avisan con su propio texto; acá se traduce al de la
// pantalla. null = otro error (se responde 500).
export const errorDeMarca = (mensajeDeLaBase) => {
    const m = String(mensajeDeLaBase || '');
    if (m.includes('ya_cambio')) return { status: 409, error: MENSAJES_DUENO.yaCambio };
    if (m.includes('ultimo_dueno')) return { status: 400, error: MENSAJES_DUENO.ultimoDueno };
    if (m.includes('destino_invalido')) return { status: 400, error: MENSAJES_DUENO.destinoInvalido };
    return null;
};
