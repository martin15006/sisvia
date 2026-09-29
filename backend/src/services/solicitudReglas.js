// Solicitudes de cita desde la portada publica (pacto portada-publica, HU-02 · HU-03).
// Reglas puras: validar y normalizar lo que llega del formulario, los textos de la
// campanita y del correo, y el orden de lo que pasa al guardar (procesarSolicitud),
// con las dependencias inyectadas para probarlo sin base ni correo.
import { normalizarTelefono, validarTelefono } from '../utils/telefono.js';

// HU-02.5: largo maximo de cada texto.
export const LARGOS = { empresa: 120, ciudad: 80, nombre: 100, correo: 254, mensaje: 1000 };
export const VEHICULOS_MAX = 9999;

// RN-04: hasta 5 solicitudes guardadas por hora desde la misma conexion.
export const LIMITE_POR_HORA = 5;

// Campo trampa (RN-04): invisible para las personas. Si llega lleno, es un robot.
export const CAMPO_TRAMPA = 'sitio_web';

export const RUTA_SOLICITUDES = '/admin/solicitudes';

// HU-03.1 (enmienda 2): el aviso lleva a su solicitud. Con esa misma direccion se
// encuentran sus avisos para dejarlos leidos al contactarla (HU-04.7). Los avisos de
// antes llevan solo RUTA_SOLICITUDES: nunca coinciden y no se tocan (CB-18).
export const rutaDeSolicitud = (id) => `${RUTA_SOLICITUDES}?solicitud=${encodeURIComponent(id)}`;
export const TIPO_AVISO = 'solicitud_cita';

export const MENSAJES_SOLICITUD = {
    empresa: 'Escribe el nombre de la empresa.',
    ciudad: 'Escribe la ciudad.',
    nombre: 'Escribe tu nombre.',
    telefono: 'Escribe un teléfono o WhatsApp.',
    vehiculos: 'Los vehículos van en número, de 1 a 9999.',
    correo: 'Revisa el correo: debe verse como nombre@empresa.com.',
    autorizo: 'Marca la casilla para que podamos guardar tus datos.',
    largo: (n) => `Máximo ${n} caracteres.`,
    revisar: 'Revisa los datos marcados.',
    limite: 'Ya recibimos varias solicitudes desde esta conexión. Intenta de nuevo en una hora o escríbenos por WhatsApp.',
    noEncontrada: 'Solicitud no encontrada',
    primeroContactada: 'Primero márcala como contactada.',
    campanitaTitulo: 'Nueva solicitud de cita',
    nombreSoloLetras: 'El nombre solo lleva letras.',
    ciudadSinNumeros: 'La ciudad no lleva números.',
};

// HU-04.5: el renglon del Registro del equipo cuando alguien marca o borra una solicitud.
// accion: 'contactada' | 'borrada'. La IP y el navegador los suma quien lo guarda (HU-07).
export const filaDeRegistro = ({ usuario, solicitud, accion }) => ({
    empresa_id: null,
    empresa_nombre: null,
    actor_id: usuario.id,
    actor_nombre: usuario.nombre_completo || 'Alguien del equipo SISVIA',
    actor_cargo: 'Administrador general',
    de_sisvia: true,
    tipo: 'solicitud',
    accion,
    objeto_id: solicitud.id,
    objeto: solicitud.empresa,
    detalles: { ciudad: solicitud.ciudad },
});

const texto = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// HU-02.8 (enmienda 1). Tu nombre: letras de cualquier idioma (tildes, ñ, ü), espacios,
// apostrofe, guion y punto ("María José", "O'Neil", "Ana-Lucía", "Jr."). La ciudad: sin
// numeros. La pantalla usa las mismas reglas (frontend/src/lib/solicitudes.js).
export const nombreValido = (v) => /^[\p{L}\p{M}\s'’.-]+$/u.test(v);
export const ciudadValida = (v) => !/\p{N}/u.test(v);

// Devuelve { errores } (un texto por campo) o { datos } listos para guardar.
export const validarSolicitud = (cuerpo = {}) => {
    const errores = {};
    const datos = {};

    const obligatorio = (campo, forma = null) => {
        const v = texto(cuerpo[campo]);
        if (!v) errores[campo] = MENSAJES_SOLICITUD[campo];
        else if (v.length > LARGOS[campo]) errores[campo] = MENSAJES_SOLICITUD.largo(LARGOS[campo]);
        else if (forma && !forma.valido(v)) errores[campo] = forma.mensaje;
        else datos[campo] = v;
    };
    obligatorio('empresa');
    // HU-02.8 (enmienda 1): la ciudad sin numeros; el nombre, solo letras.
    obligatorio('ciudad', { valido: ciudadValida, mensaje: MENSAJES_SOLICITUD.ciudadSinNumeros });
    obligatorio('nombre', { valido: nombreValido, mensaje: MENSAJES_SOLICITUD.nombreSoloLetras });

    // HU-02.3 · CB-03: la regla de telefono que ya usa SISVIA; se guarda normalizado.
    const telefono = texto(cuerpo.telefono);
    if (!telefono) errores.telefono = MENSAJES_SOLICITUD.telefono;
    else {
        const error = validarTelefono(telefono);
        if (error) errores.telefono = error;
        else datos.telefono = normalizarTelefono(telefono);
    }

    // HU-02.4: opcionales.
    const vehiculos = texto(cuerpo.vehiculos);
    if (!vehiculos) datos.vehiculos = null;
    else if (!/^\d+$/.test(vehiculos) || Number(vehiculos) < 1 || Number(vehiculos) > VEHICULOS_MAX) {
        errores.vehiculos = MENSAJES_SOLICITUD.vehiculos;
    } else datos.vehiculos = Number(vehiculos);

    const correo = texto(cuerpo.correo);
    if (!correo) datos.correo = null;
    else if (correo.length > LARGOS.correo) errores.correo = MENSAJES_SOLICITUD.largo(LARGOS.correo);
    else if (!CORREO.test(correo)) errores.correo = MENSAJES_SOLICITUD.correo;
    else datos.correo = correo;

    const mensaje = texto(cuerpo.mensaje);
    if (!mensaje) datos.mensaje = null;
    else if (mensaje.length > LARGOS.mensaje) errores.mensaje = MENSAJES_SOLICITUD.largo(LARGOS.mensaje);
    else datos.mensaje = mensaje;

    // HU-02.7: la autorizacion de datos es obligatoria; solo vale el true de la casilla.
    if (cuerpo.autorizo !== true) errores.autorizo = MENSAJES_SOLICITUD.autorizo;

    return Object.keys(errores).length ? { errores } : { datos };
};

export const esTrampa = (cuerpo = {}) => texto(cuerpo[CAMPO_TRAMPA]) !== '';

// HU-03.1: el aviso de la campanita.
export const textoCampanita = ({ empresa, ciudad, vehiculos }) => ({
    titulo: MENSAJES_SOLICITUD.campanitaTitulo,
    mensaje: [empresa, ciudad, vehiculos ? `${vehiculos} ${vehiculos === 1 ? 'vehículo' : 'vehículos'}` : null]
        .filter(Boolean).join(' · '),
});

// HU-03.2: el asunto del correo.
export const asuntoCorreo = ({ empresa }) => `Nueva solicitud de cita: ${empresa}`;

// HU-03.2: al correo de contacto y, si esta bien escrita, a la copia (SOLICITUDES_COPIA).
export const destinosCorreo = (contacto, copia) => {
    const lista = [contacto, texto(copia)].filter((c) => c && CORREO.test(c));
    return [...new Set(lista.map((c) => c.toLowerCase()))];
};

// Enlace para escribirle por WhatsApp al numero que dejo (guardado normalizado).
export const enlaceWhatsApp = (telefono) => {
    const t = String(telefono || '');
    if (/^3\d{9}$/.test(t)) return `https://wa.me/57${t}`;
    if (/^\+\d{8,15}$/.test(t)) return `https://wa.me/${t.slice(1)}`;
    return null;
};

// Lo que pasa al recibir una solicitud (HU-02.1 · HU-03 · RN-04 · RN-06):
//   trampa llena  -> se responde como exito, sin guardar ni avisar (CB-05)
//   datos malos   -> { errores }, sin guardar
//   datos buenos  -> se guarda; la campanita y el correo salen despues, y si
//                    fallan la solicitud igual queda guardada (RN-06, CB-06, CB-07)
// deps: { guardar(datos) -> fila, idsEquipo() -> [ids], notificar({ ids, titulo, mensaje, ruta }),
//         enviarCorreo({ para, asunto, fila }) -> { enviado }, contacto, copia, registrar(error) }
export const procesarSolicitud = async (cuerpo, deps) => {
    if (esTrampa(cuerpo)) return { ok: true, trampa: true };

    const { errores, datos } = validarSolicitud(cuerpo);
    if (errores) return { ok: false, errores };

    const fila = await deps.guardar({ ...datos, autorizo_datos_en: new Date().toISOString() });

    const avisos = (async () => {
        const resultado = { campanita: 0, correo: null };
        try {
            const ids = await deps.idsEquipo();
            if (ids.length) {
                await deps.notificar({ ids, ...textoCampanita(fila), ruta: rutaDeSolicitud(fila.id) });
                resultado.campanita = ids.length;
            }
        } catch (err) {
            deps.registrar?.(err);
        }
        try {
            const para = destinosCorreo(deps.contacto, deps.copia);
            resultado.correo = para.length ? await deps.enviarCorreo({ para, asunto: asuntoCorreo(fila), fila }) : null;
        } catch (err) {
            deps.registrar?.(err);
        }
        return resultado;
    })();

    return { ok: true, fila, avisos };
};
