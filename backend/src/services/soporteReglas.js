// Reglas PURAS del superadmin dentro de una empresa (pacto para-empresas,
// HU-16 · RN-11 · HU-06.6). Sin base de datos, para probarlas con node --test.
//
// El superadmin "entra" a una empresa mandando su id en X-Empresa-Activa. Adentro
// ve esa empresa como su Administrador; todo lo que cambia pide su contraseña
// (X-Confirmar-Password) y queda registrado. Afuera no cambia datos de empresas.

export const HEADER_EMPRESA = 'x-empresa-activa';
export const HEADER_CONFIRMACION = 'x-confirmar-password';

// Textos exactos (RNF-08). "Contraseña incorrecta" es el de HU-16.3.
export const MENSAJES_SOPORTE = {
    confirmar: 'Confirma con tu contraseña para hacer cambios dentro de la empresa.',
    contrasenaIncorrecta: 'Contraseña incorrecta',
    entraPrimero: 'Entra a la empresa para hacer cambios en sus datos.',
    empresaNoEncontrada: 'La empresa a la que entraste ya no existe.',
};

export const CODIGOS_SOPORTE = {
    confirmar: 'confirmar_password',
    contrasenaIncorrecta: 'contrasena_incorrecta',
    entraPrimero: 'entra_a_la_empresa',
    empresaNoEncontrada: 'empresa_activa_invalida',
    bloqueada: 'confirmacion_bloqueada',
};

// HU-16.5: tras 5 contraseñas malas seguidas la cuenta se bloquea (como en el login).
export const mensajeBloqueo = (minutos) =>
    `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v) => typeof v === 'string' && UUID.test(v);

export const esEscritura = (metodo) => !['GET', 'HEAD', 'OPTIONS'].includes(String(metodo).toUpperCase());

// Ruta sin la query: "/api/vehiculos/abc?x=1" -> "/api/vehiculos/abc"
export const limpia = (ruta) => String(ruta || '').split('?')[0].replace(/\/+$/, '');

// Lo que es del propio superadmin, no de la empresa: su cuenta, sus avisos, el
// modulo Empresas, la subida de una imagen suelta (el dato se guarda despues,
// en otra llamada que si se confirma), el buzon de Soporte (HU-18 · RN-12:
// responder no pide contrasena ni entrar a la empresa) y lo del equipo SISVIA
// (HU-20: el traspaso de la marca pide su contraseña por su cuenta), y las
// solicitudes de cita de la portada (pacto portada-publica: no son de ninguna empresa).
const PROPIAS = ['/api/auth', '/api/notificaciones', '/api/empresas', '/api/upload', '/api/buzon', '/api/equipo', '/api/solicitudes'];
const esPropia = (ruta) => PROPIAS.some((p) => ruta === p || ruta.startsWith(p + '/'));

// HU-16.2 · RN-11: ¿este pedido del superadmin, dentro de una empresa, pide contraseña?
export const necesitaConfirmacion = ({ rol, metodo, ruta, empresaActiva }) =>
    rol === 'superadmin' && !!empresaActiva && esEscritura(metodo) && !esPropia(limpia(ruta));

// HU-06.6: datos que son de una empresa. Afuera, el superadmin no los cambia
// (los usuarios se deciden aparte: los del equipo SISVIA si se crean afuera).
const DE_EMPRESA = ['/api/vehiculos', '/api/geo/sedes', '/api/suplencias', '/api/chequeos', '/api/respuestas'];
export const requiereEntrar = ({ rol, metodo, ruta, empresaActiva }) => {
    if (rol !== 'superadmin' || empresaActiva || !esEscritura(metodo)) return false;
    const r = limpia(ruta);
    return DE_EMPRESA.some((p) => r === p || r.startsWith(p + '/'));
};

// ¿Es el alta de un usuario? (afuera, solo se crean los del equipo SISVIA)
export const esAltaDeUsuario = (metodo, ruta) =>
    String(metodo).toUpperCase() === 'POST' && limpia(ruta) === '/api/usuarios';

// Id del usuario afectado en /api/usuarios/:id/... (null si es el alta o no hay id).
export const idUsuarioDeRuta = (ruta) => {
    const partes = limpia(ruta).split('/');   // ['', 'api', 'usuarios', ':id', ...]
    return partes[2] === 'usuarios' && esUuid(partes[3]) ? partes[3] : null;
};

// ----- Que se hizo, en palabras (para el pedido de contraseña y el registro) -----

const OBJETOS = {
    vehiculos: 'un vehículo',
    usuarios: 'un usuario',
    'geo/sedes': 'una sede',
    'geo/ciudades': 'una ciudad',
    suplencias: 'una suplencia',
    'catalogo-admin/categorias': 'una categoría del chequeo',
    'catalogo-admin/items': 'un ítem del chequeo',
    'catalogo-admin/preguntas-aptitud': 'una pregunta de aptitud',
    'catalogo-admin/bloqueos': 'un elemento del catálogo base',
    chequeos: 'un chequeo',
    respuestas: 'un chequeo',
};

// [ultimo tramo de la ruta, metodo o '*'] -> [infinitivo, pasado]
const ACCIONES_ESPECIALES = [
    ['desactivar', '*', 'desactivar', 'Desactivó'],
    ['reactivar', '*', 'reactivar', 'Reactivó'],
    ['fotos', 'POST', 'subir fotos a', 'Subió fotos a'],
    ['fotos', 'DELETE', 'eliminar una foto de', 'Eliminó una foto de'],
    ['principal', '*', 'cambiar la foto principal de', 'Cambió la foto principal de'],
    ['runt', 'POST', 'subir el RUNT de', 'Subió el RUNT de'],
    ['runt', 'DELETE', 'eliminar el RUNT de', 'Eliminó el RUNT de'],
    ['resetear-password', '*', 'resetear la contraseña de', 'Reseteó la contraseña de'],
    ['cambiar-correo', '*', 'cambiar el correo de', 'Cambió el correo de'],
    ['cambiar-cedula', '*', 'cambiar la cédula de', 'Cambió la cédula de'],
    ['bloquear', '*', 'bloquear', 'Bloqueó'],
    ['desbloquear', '*', 'desbloquear', 'Desbloqueó'],
    ['baja', '*', 'dar de baja por traspaso', 'Dio de baja por traspaso'],
];
const POR_METODO = {
    POST: ['crear', 'Creó'],
    PATCH: ['editar', 'Editó'],
    PUT: ['editar', 'Editó'],
    DELETE: ['eliminar', 'Eliminó'],
};

// { pedido: 'crear un vehículo', hecho: 'Creó un vehículo' }
export const describirAccion = (metodo, ruta) => {
    const m = String(metodo).toUpperCase();
    const tramos = limpia(ruta).replace(/^\/api\//, '').split('/').filter(Boolean);
    // Modulos con sub-recursos: geo/sedes, catalogo-admin/items...
    const base = ['geo', 'catalogo-admin'].includes(tramos[0]) ? `${tramos[0]}/${tramos[1]}` : (tramos[0] || '');
    const objeto = OBJETOS[base] || 'datos de la empresa';

    // El tramo que dice la accion: el ultimo que no es un id.
    const partesBase = base.split('/');
    const accion = [...tramos].reverse().find((t) => !esUuid(t) && !partesBase.includes(t));
    const especial = ACCIONES_ESPECIALES.find(([t, met]) => t === accion && (met === '*' || met === m));
    const [pedido, hecho] = especial ? [especial[2], especial[3]] : (POR_METODO[m] || ['cambiar', 'Cambió']);
    return { pedido: `${pedido} ${objeto}`, hecho: `${hecho} ${objeto}` };
};
