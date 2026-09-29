// Reglas PURAS de la Actividad de la empresa y del Registro del equipo
// (pacto para-empresas, HU-19 · HU-20.1 · RN-14 · CB-24). Sin base de datos,
// para probarlas con node --test.
//
// La tabla `actividad` la llena la base sola a partir de los registros de
// vehiculos, usuarios y empresas (migracion 2026-09-21); las sedes y el
// catalogo los escribe el backend con registrarActividad. Aca se decide que
// se cuenta y como se cuenta: cada fila, en palabras.

import { ETIQUETA_ROL } from './jerarquia.service.js';
import { escaparLike } from './empresasReglas.js';
import { lineaDeRespaldo } from './respaldoReglas.js';

export const MENSAJES_ACTIVIDAD = {
    soloAdminEmpresa: 'Solo el Administrador de empresa ve la actividad de la empresa.',
    soloDueno: 'Solo el dueño de SISVIA ve el registro del equipo.',
    tipoInvalido: 'Ese tipo de actividad no existe.',
    fechaInvalida: 'La fecha no es válida.',
    fechasAlReves: 'La fecha "desde" es posterior a "hasta".',
    paginaInvalida: 'La página pedida no es válida. Recarga la actividad.',
};

export const POR_PAGINA = 50;

// HU-19.4: los filtros por tipo. "sisvia" = lo que hizo el equipo SISVIA.
export const FILTROS_TIPO = {
    vehiculos: 'Vehículos',
    usuarios: 'Usuarios',
    sedes: 'Sedes',
    catalogo: 'Catálogo',
    sisvia: 'Equipo SISVIA',
};
const TIPO_DE_FILTRO = { vehiculos: 'vehiculo', usuarios: 'usuario', sedes: 'sede', catalogo: 'catalogo' };

// HU-19.5: la Actividad la ve el Administrador de empresa (y el equipo SISVIA
// dentro de la empresa, HU-16, que la ve como su Administrador).
export const puedeVerActividad = (usuario) =>
    usuario?.rol === 'admin_empresa' || (usuario?.rol === 'superadmin' && !!usuario?.empresaActiva);

// HU-20.2: el Registro del equipo, solo el dueño.
export const puedeVerRegistroEquipo = (usuario) => usuario?.rol === 'superadmin' && usuario?.es_dueno === true;

// El cargo con el que se muestra a alguien (las mismas etiquetas de la app).
export const cargoDe = (rol, esPool) =>
    rol === 'conductor' && esPool ? 'Pool de transporte' : (ETIQUETA_ROL[rol] || null);

// Lo que hace el equipo SISVIA dentro de una empresa ya queda en su registro de
// soporte (con contraseña, RN-11): ahi se suma el nombre de lo que toco, en vez
// de escribirlo dos veces (HU-19.3).
export const viajaEnSoporte = (usuario) => usuario?.rol === 'superadmin' && !!usuario?.empresaActiva;

// ----- Cada fila, en palabras (HU-19.1) -----

const conPlural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const VEHICULO = {
    creado: (p) => `Creó el vehículo ${p}`,
    actualizado: (p) => `Editó el vehículo ${p}`,
    desactivado: (p) => `Desactivó el vehículo ${p}`,
    reactivado: (p) => `Reactivó el vehículo ${p}`,
    eliminado: (p) => `Eliminó el vehículo ${p}`,
    foto_eliminada: (p) => `Eliminó una foto del vehículo ${p}`,
    runt_actualizado: (p) => `Subió el RUNT del vehículo ${p}`,
    runt_eliminado: (p) => `Eliminó el RUNT del vehículo ${p}`,
};

const PERSONA = {
    desactivado: (n) => `Desactivó a ${n}`,
    reactivado: (n) => `Reactivó a ${n}`,
    eliminado: (n) => `Eliminó a ${n}`,
    password_reseteado: (n) => `Reseteó la contraseña de ${n}`,
    cambio_correo: (n) => `Cambió el correo de ${n}`,
    cambio_cedula: (n) => `Cambió la cédula de ${n}`,
    // La marca de dueño (HU-20.5-7, enmienda 7: varios dueños)
    dio_marca: (n) => `Le dio la marca de dueño a ${n}`,
    traspaso_dueno: (n) => `Pasó la marca de dueño a ${n}`,
    dejo_marca: () => 'Se quitó la marca de dueño',
};

const EMPRESA = {
    creada: (e) => `Creó la empresa ${e}`,
    editada: (e) => `Editó los datos de la empresa ${e}`,
    desactivada: (e) => `Desactivó la empresa ${e}`,
    reactivada: (e) => `Reactivó la empresa ${e}`,
    entro: (e) => `Entró a la empresa ${e}`,
    exportada: (e) => `Exportó todo de ${e}`,
    eliminada: (e) => `Eliminó la empresa ${e}`,
};

// Solicitudes de cita de la portada (pacto portada-publica, enmienda 1: HU-04.5).
const SOLICITUD = {
    contactada: 'Marcó como contactada la solicitud de',
    borrada: 'Borró la solicitud de',
};

const SEDE = {
    creada: (s) => `Creó la sede ${s}`,
    editada: (s) => `Editó la sede ${s}`,
    desactivada: (s) => `Desactivó la sede ${s}`,
    reactivada: (s) => `Reactivó la sede ${s}`,
};

// Catalogo propio: que clase de elemento es y como se nombra.
export const CLASES_CATALOGO = {
    categoria: 'la categoría',
    item: 'el ítem',
    pregunta: 'la pregunta de aptitud',
};
const CATALOGO = {
    creado: 'Creó',
    editado: 'Editó',
    apagado: 'Desactivó',
    borrado: 'Eliminó',
};

// El nombre de un elemento del catalogo, segun su clase.
export const nombreDeCatalogo = (clase, fila) =>
    (clase === 'categoria' ? fila?.nombre : clase === 'item' ? fila?.descripcion : fila?.pregunta) || '';

const LIMITES = { limite_sedes: 'sedes', limite_vehiculos: 'vehículos' };
const cambioDePlan = (empresa, detalles) => {
    const partes = Object.entries(LIMITES)
        .filter(([campo]) => detalles?.[campo])
        .map(([campo, que]) => `${que} ${detalles[campo].antes} → ${detalles[campo].despues}`);
    return `Cambió el plan de ${empresa}${partes.length ? `: ${partes.join(' · ')}` : ''}`;
};

const describirPersona = (f) => {
    const nombre = f.objeto || 'alguien';
    const d = f.detalles && typeof f.detalles === 'object' && !Array.isArray(f.detalles) ? f.detalles : {};
    if (f.accion === 'creado') {
        const cargo = cargoDe(d.rol, d.es_pool === true);
        return `Creó a ${nombre}${cargo ? ` · ${cargo}` : ''}`;
    }
    if (f.accion === 'actualizado') {
        if (d.rol && d.rol_anterior && d.rol !== d.rol_anterior) {
            return `Cambió el rol de ${nombre}: ${cargoDe(d.rol_anterior) || d.rol_anterior} → ${cargoDe(d.rol) || d.rol}`;
        }
        return `Editó a ${nombre}`;
    }
    return (PERSONA[f.accion] || ((n) => `Cambió a ${n}`))(nombre);
};

export const describirActividad = (f) => {
    const d = f?.detalles && typeof f.detalles === 'object' && !Array.isArray(f.detalles) ? f.detalles : {};

    // Un cambio del equipo SISVIA dentro de la empresa (su registro de soporte).
    if (f?.accion === 'soporte') {
        const que = d.que || 'Hizo un cambio';
        return f.objeto ? `${que} · ${f.objeto}` : que;
    }

    switch (f?.tipo) {
        case 'vehiculo': {
            const placa = f.objeto || 'sin placa';
            if (f.accion === 'baja_traspaso') {
                return `Dio de baja por traspaso el vehículo ${placa}${d.motivo ? ` · Motivo: ${d.motivo}` : ''}`;
            }
            if (f.accion === 'fotos_agregadas') {
                return Number.isInteger(d.cantidad)
                    ? `Subió ${conPlural(d.cantidad, 'foto', 'fotos')} al vehículo ${placa}`
                    : `Subió fotos al vehículo ${placa}`;
            }
            return (VEHICULO[f.accion] || ((p) => `Cambió el vehículo ${p}`))(placa);
        }
        case 'usuario':
        case 'equipo':
            return describirPersona(f);
        case 'sede':
            return (SEDE[f.accion] || ((s) => `Cambió la sede ${s}`))(f.objeto || 'sin nombre');
        case 'catalogo': {
            const verbo = CATALOGO[f.accion] || 'Cambió';
            const clase = CLASES_CATALOGO[d.clase] || 'un elemento del catálogo';
            const extra = f.accion === 'apagado' ? ' (tiene historial en chequeos)' : '';
            return `${verbo} ${clase} «${f.objeto || ''}»${extra}`;
        }
        case 'empresa': {
            const empresa = f.empresa_nombre || f.objeto || 'la empresa';
            if (f.accion === 'limites') return cambioDePlan(empresa, d);
            return (EMPRESA[f.accion] || (() => `${f.accion} · ${empresa}`))(empresa);
        }
        case 'solicitud':
            return `${SOLICITUD[f.accion] || 'Cambió la solicitud de'} ${f.objeto || 'una empresa'}${d.ciudad ? ` · ${d.ciudad}` : ''}`;
        default:
            return f?.accion || '';
    }
};

// Lo que viaja al navegador: quien, que en palabras y cuando (HU-19.1). Los
// detalles crudos no salen (pueden traer datos que la pantalla no necesita).
// conRespaldo: solo en el Registro del equipo, la linea "IP … · navegador" (HU-07 · RN-07).
export const filaParaMostrar = (f, { conRespaldo = false } = {}) => ({
    id: f.id,
    cuando: f.created_at,
    quien: f.actor_nombre,
    cargo: f.actor_cargo,
    de_sisvia: f.de_sisvia === true,
    tipo: f.tipo,
    texto: describirActividad(f),
    empresa: f.empresa_nombre || null,
    ...(conRespaldo ? { respaldo: lineaDeRespaldo(f) } : {}),
});

// ----- Filtros (HU-19.4 · HU-20.1) -----

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFechaReal = (s) => {
    if (!FECHA.test(s)) return false;
    const [a, m, d] = s.split('-').map(Number);
    const f = new Date(Date.UTC(a, m - 1, d));
    return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
};

// Colombia no cambia la hora en el año: medianoche alla = 05:00 UTC.
export const inicioDelDiaColombia = (fecha) => new Date(`${fecha}T00:00:00-05:00`).toISOString();
const diaSiguiente = (fecha) => {
    const [a, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// La marca de tiempo tal cual la devuelve la base (con microsegundos): pasarla
// por Date la cortaria a milisegundos y la pagina siguiente repetiria o saltaria filas.
const MARCA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

// "Ver más": la ultima fila vista, para pedir las que siguen.
export const cursorDe = (fila) => (fila ? `${fila.created_at}|${fila.id}` : null);
export const leerCursor = (texto) => {
    if (texto === undefined || texto === null || texto === '') return { cursor: null };
    const [cuando, id, ...sobra] = String(texto).split('|');
    if (sobra.length || !MARCA.test(cuando || '') || !UUID.test(id || '')) return { error: MENSAJES_ACTIVIDAD.paginaInvalida };
    return { cursor: { cuando, id } };
};

const texto = (v, max) => {
    const t = typeof v === 'string' ? v.trim() : '';
    return t ? t.slice(0, max) : null;
};

// Lee y valida los filtros de la query. Devuelve { filtros } o { error }.
// equipo = true para el Registro del equipo (filtra por empresa, no por tipo).
export const leerFiltros = (query = {}, { equipo = false } = {}) => {
    const filtros = { tipo: null, persona: texto(query.persona, 100), desde: null, hasta: null, empresa: null, cursor: null };

    if (!equipo && query.tipo) {
        if (!Object.prototype.hasOwnProperty.call(FILTROS_TIPO, query.tipo)) return { error: MENSAJES_ACTIVIDAD.tipoInvalido };
        filtros.tipo = query.tipo;
    }
    if (equipo) filtros.empresa = texto(query.empresa, 100);

    for (const campo of ['desde', 'hasta']) {
        const valor = query[campo];
        if (valor === undefined || valor === '') continue;
        if (!esFechaReal(String(valor))) return { error: MENSAJES_ACTIVIDAD.fechaInvalida };
        filtros[campo] = String(valor);
    }
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) return { error: MENSAJES_ACTIVIDAD.fechasAlReves };

    const { cursor, error } = leerCursor(query.despues_de);
    if (error) return { error };
    filtros.cursor = cursor;
    return { filtros };
};

// Lo que hay que pedirle a la base, sin la base: la lista de condiciones que el
// servicio aplica a la consulta. Asi se prueba que nunca se cuela otra empresa.
//   alcance: { empresaId } para la Actividad, o { equipo: true } para el registro.
export const condicionesDeConsulta = (alcance, filtros) => {
    const c = [];
    if (alcance?.equipo) {
        c.push(['eq', 'de_sisvia', true]);
    } else {
        // La empresa pasa por el filtro único (RNF-03): sin empresa, nada (nunca "todas").
        c.push(['deLaEmpresa', alcance?.empresaId || null]);
        c.push(['neq', 'tipo', 'equipo']);
    }
    if (filtros.tipo === 'sisvia') c.push(['eq', 'de_sisvia', true]);
    else if (filtros.tipo) c.push(['eq', 'tipo', TIPO_DE_FILTRO[filtros.tipo]]);
    if (filtros.persona) c.push(['ilike', 'actor_nombre', `%${escaparLike(filtros.persona)}%`]);
    if (filtros.empresa) c.push(['ilike', 'empresa_nombre', `%${escaparLike(filtros.empresa)}%`]);
    if (filtros.desde) c.push(['gte', 'created_at', inicioDelDiaColombia(filtros.desde)]);
    if (filtros.hasta) c.push(['lt', 'created_at', inicioDelDiaColombia(diaSiguiente(filtros.hasta))]);
    if (filtros.cursor) {
        const { cuando, id } = filtros.cursor;
        c.push(['or', `created_at.lt."${cuando}",and(created_at.eq."${cuando}",id.lt.${id})`]);
    }
    return c;
};


// Arma la pagina: se piden POR_PAGINA + 1 filas para saber si hay mas.
export const armarPagina = (filas, opciones = {}) => {
    const pagina = (filas || []).slice(0, POR_PAGINA);
    const hayMas = (filas || []).length > POR_PAGINA;
    return {
        actividad: pagina.map((f) => filaParaMostrar(f, opciones)),
        siguiente: hayMas ? cursorDe(pagina[pagina.length - 1]) : null,
    };
};
