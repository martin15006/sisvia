// Reglas PURAS del modulo Empresas (pacto para-empresas, HU-01 y HU-03).
// Sin base de datos, para probarlas con node --test.
import { validarLimite } from './limitesReglas.js';
import { normalizarDocumento, validarDocumento } from '../utils/documento.js';
import { normalizarTelefono, validarTelefono } from '../utils/telefono.js';

// Textos exactos del SRS (RNF-08).
export const MENSAJES_EMPRESA = {
    nombreRepetido: 'Ya existe una empresa con ese nombre',
    correoRepetido: 'Ese correo ya está registrado en SISVIA',
    cedulaRepetida: 'Esa cédula ya está registrada en SISVIA',
    desactivada: 'Tu empresa está desactivada. Comunícate con SISVIA.',
    sinDueno: 'La empresa no puede quedar sin Administrador de empresa. Crea otro antes de hacer este cambio.',
};

// Codigo que acompaña al 403 de empresa desactivada, para que el frontend
// cierre la sesion sin depender del texto.
export const CODIGO_EMPRESA_DESACTIVADA = 'empresa_desactivada';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Datos de la empresa (alta y edicion). `parcial` = edicion: solo valida lo que llega.
// Devuelve { error } o { datos } ya limpios para guardar.
export const validarDatosEmpresa = (body = {}, { parcial = false } = {}) => {
    const datos = {};
    const llega = (campo) => !parcial || body[campo] !== undefined;

    if (llega('nombre')) {
        const nombre = texto(body.nombre).replace(/\s+/g, ' ');
        if (!nombre) return { error: 'El nombre de la empresa es obligatorio.' };
        datos.nombre = nombre;
    }
    for (const campo of ['limite_sedes', 'limite_vehiculos']) {
        if (!llega(campo)) continue;
        const error = validarLimite(body[campo]);
        if (error) return { error };
        datos[campo] = Number(body[campo]);
    }
    if (llega('nit')) datos.nit = texto(body.nit) || null;
    if (llega('ciudad_id')) datos.ciudad_id = body.ciudad_id || null;
    if (llega('telefono')) {
        const error = validarTelefono(body.telefono);
        if (error) return { error };
        datos.telefono = normalizarTelefono(body.telefono);
    }
    if (llega('correo')) {
        const correo = texto(body.correo).toLowerCase();
        if (correo && !CORREO.test(correo)) return { error: 'El correo de contacto no es válido.' };
        datos.correo = correo || null;
    }
    return { datos };
};

// Datos del Administrador de empresa del alta (HU-01.2).
export const validarAdminEmpresa = (admin = {}) => {
    const nombre_completo = texto(admin.nombre_completo).replace(/\s+/g, ' ');
    const email = texto(admin.email).toLowerCase();
    if (!nombre_completo || !admin.cedula || !email) {
        return { error: 'Nombre completo, cédula y correo del administrador son obligatorios.' };
    }
    if (!CORREO.test(email)) return { error: 'El correo del administrador no es válido.' };
    const errorDocumento = validarDocumento(admin.cedula);
    if (errorDocumento) return { error: errorDocumento };
    const errorTelefono = validarTelefono(admin.telefono);
    if (errorTelefono) return { error: errorTelefono };
    return {
        datos: {
            nombre_completo,
            email,
            cedula: normalizarDocumento(admin.cedula),
            telefono: normalizarTelefono(admin.telefono),
        },
    };
};

// ¿El error de Supabase Auth es "ese correo ya existe"?
export const esCorreoRepetido = (error) =>
    !!error && (error.code === 'email_exists' || /already (been )?registered/i.test(error.message || ''));

// Para un filtro ilike exacto: escapa los comodines de LIKE.
export const escaparLike = (valor) => valor.replace(/[\\%_]/g, (c) => '\\' + c);

// CB-17: ¿el cambio deja a la empresa sin Administrador de empresa activo?
// accion: 'eliminar' | 'desactivar' | 'cambiar_rol' (con rolNuevo).
export const dejaSinDueno = ({ objetivo, accion, rolNuevo = null, adminsActivos }) => {
    if (objetivo?.rol !== 'admin_empresa' || objetivo?.activo === false) return false;
    const loSaca = accion === 'eliminar' || accion === 'desactivar'
        || (accion === 'cambiar_rol' && !!rolNuevo && rolNuevo !== 'admin_empresa');
    return loSaca && adminsActivos <= 1;
};

// HU-05 · RN-06: eliminar una empresa. Solo desactivada, con un respaldo de los
// ultimos 30 dias y escribiendo su nombre exacto. Devuelve el motivo por el que
// NO se puede (el primero que falte) o null.
export const DIAS_RESPALDO = 30;
export const MENSAJES_ELIMINAR = {
    activa: 'Primero desactiva la empresa.',
    sinRespaldo: 'Antes de eliminar, genera el respaldo con «Exportar todo» y envíaselo a la empresa.',
    nombreDistinto: 'El nombre no coincide: no se borró nada.',
};
export const motivoNoEliminar = ({ empresa, nombreEscrito, ahora = new Date() }) => {
    if (empresa.activa) return MENSAJES_ELIMINAR.activa;
    const respaldo = empresa.ultimo_respaldo_en ? new Date(empresa.ultimo_respaldo_en) : null;
    if (!respaldo || new Date(ahora) - respaldo > DIAS_RESPALDO * 24 * 60 * 60 * 1000) return MENSAJES_ELIMINAR.sinRespaldo;
    if (nombreEscrito !== empresa.nombre) return MENSAJES_ELIMINAR.nombreDistinto;
    return null;
};
