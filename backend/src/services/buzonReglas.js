// Reglas PURAS del buzon: "Escribir a SISVIA" (pacto para-empresas, HU-18 ·
// RN-12 · RN-13 · CB-18 · CB-19). Sin base de datos, para node --test.
// En pantalla se llama "Soporte"; en el codigo, buzon ("soporte" ya es de HU-16).

export const TIPOS_BUZON = {
    falla: 'Algo falla',
    duda: 'Tengo una duda',
    cupo: 'Necesito más cupo del plan',
    traspaso: 'Traspaso de un vehículo',
    idea: 'Una idea',
};

export const ESTADOS_BUZON = { nuevo: 'Nuevo', en_revision: 'En revisión', resuelto: 'Resuelto' };

export const MENSAJE_MAX = 2000;
export const ADJUNTO_MAX = 5 * 1024 * 1024; // 5 MB

export const MENSAJES_BUZON = {
    soloAdmin: 'Solo el Administrador de empresa puede escribirle a SISVIA.',
    adjuntoInvalido: 'El archivo debe ser una imagen JPG o PNG, o un PDF, de hasta 5 MB.',
    subidaFallida: 'No se pudo subir el archivo. Intenta de nuevo o envía el mensaje sin él.',
    enviado: 'Mensaje enviado a SISVIA. Te avisamos en la campanita cuando respondan.',
    resuelto: 'Resuelto. ¿Sigue pasando? Escribe un mensaje nuevo.',
    tipoInvalido: 'Elige qué tipo de mensaje es.',
    sinTexto: 'Escribe el mensaje.',
    muyLargo: 'El mensaje puede tener hasta 2.000 caracteres.',
    soloSisviaResuelve: 'Solo el equipo SISVIA marca un mensaje como resuelto.',
};

// RN-12: solo el Administrador de empresa le escribe a SISVIA.
export const puedeEscribir = (rol) => rol === 'admin_empresa';

// El texto de un mensaje o de una respuesta: obligatorio y hasta 2.000 caracteres.
export const validarTexto = (texto) => {
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (!limpio) return { error: MENSAJES_BUZON.sinTexto };
    if (limpio.length > MENSAJE_MAX) return { error: MENSAJES_BUZON.muyLargo };
    return { texto: limpio };
};

export const validarMensaje = ({ tipo, mensaje } = {}) => {
    if (!Object.hasOwn(TIPOS_BUZON, tipo)) return { error: MENSAJES_BUZON.tipoInvalido };
    const t = validarTexto(mensaje);
    return t.error ? t : { datos: { tipo, mensaje: t.texto } };
};

// HU-18.2: JPG, PNG o PDF de hasta 5 MB. Ademas del tipo que dice el navegador,
// se miran los primeros bytes: un archivo cualquiera no pasa por llamarse .pdf.
const FIRMAS = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
};
export const validarAdjunto = ({ mimetype, size, inicio } = {}) => {
    const firmas = FIRMAS[mimetype];
    if (!firmas || !Number.isInteger(size) || size < 1 || size > ADJUNTO_MAX) return MENSAJES_BUZON.adjuntoInvalido;
    const bytes = inicio ? [...inicio] : [];
    const coincide = firmas.some((f) => f.every((b, i) => bytes[i] === b));
    return coincide ? null : MENSAJES_BUZON.adjuntoInvalido;
};

// En Cloudinary las imagenes van como "image" y el PDF como "raw".
export const recursoDeAdjunto = (mimetype) => (mimetype === 'application/pdf' ? 'raw' : 'image');

// RN-13: Nuevo -> En revision cuando SISVIA lo abre -> Resuelto (lo marca SISVIA).
export const estadoAlAbrir = (estado, rolLector) => (rolLector === 'superadmin' && estado === 'nuevo' ? 'en_revision' : estado);
// Un mensaje resuelto no se reabre: ya nadie responde en ese hilo.
export const puedeResponder = (estado) => estado !== 'resuelto';

// A quien se avisa de una respuesta (HU-18.5 · CB-19):
//   de SISVIA  -> a quien escribio; si ya no esta activo, a los Administradores activos de su empresa
//   de empresa -> al equipo SISVIA
export const destinatariosDeRespuesta = ({ deSisvia, autor, adminsActivos = [], equipoSisvia = [] }) => {
    if (!deSisvia) return [...new Set(equipoSisvia)];
    if (autor?.id && autor.activo) return [autor.id];
    return [...new Set(adminsActivos)];
};

// Bandeja del equipo SISVIA (HU-18.4): los nuevos primero, despues en revision y
// al final los resueltos; dentro de cada grupo, lo que se movio ultimo arriba.
const ORDEN_ESTADO = { nuevo: 0, en_revision: 1, resuelto: 2 };
export const ordenarBandeja = (mensajes) => [...mensajes].sort((a, b) =>
    (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9)
    || String(b.actualizado_en).localeCompare(String(a.actualizado_en)));

// HU-18.3 · HU-18.7: la pantalla desde donde se escribio. Solo una ruta interna
// de la app ("/admin/vehiculos"), para que "Ver en la empresa" nunca lleve afuera.
export const limpiarPantalla = (ruta) => {
    const r = typeof ruta === 'string' ? ruta.trim() : '';
    return /^\/(?!\/)[A-Za-z0-9/_\-?=&.%]{0,299}$/.test(r) ? r : null;
};

// "Chrome 140 · Windows": lo justo para entender una falla, sin guardar la cadena entera.
export const describirNavegador = (agente) => {
    const ua = String(agente || '');
    const version = (re) => ua.match(re)?.[1]?.split('.')[0];
    const navegador =
        (version(/Edg\/([\d.]+)/) && `Edge ${version(/Edg\/([\d.]+)/)}`)
        || (version(/OPR\/([\d.]+)/) && `Opera ${version(/OPR\/([\d.]+)/)}`)
        || (version(/SamsungBrowser\/([\d.]+)/) && `Samsung Internet ${version(/SamsungBrowser\/([\d.]+)/)}`)
        || (version(/Firefox\/([\d.]+)/) && `Firefox ${version(/Firefox\/([\d.]+)/)}`)
        || (version(/Chrome\/([\d.]+)/) && `Chrome ${version(/Chrome\/([\d.]+)/)}`)
        || (/Safari\//.test(ua) && version(/Version\/([\d.]+)/) && `Safari ${version(/Version\/([\d.]+)/)}`)
        || 'Navegador desconocido';
    const sistema = /Android/.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
            : /Windows/.test(ua) ? 'Windows'
                : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
                    : /Linux/.test(ua) ? 'Linux' : 'sistema desconocido';
    return `${navegador} · ${sistema}`;
};
