import { supabase } from "../config/supabase.js";
import { rolEfectivo } from "../services/jerarquia.service.js";
import { suplenciaVigenteDePool, sedesCubiertosDeSuplencia } from "../services/suplencias.service.js";

export const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Token normal en header Authorization. Como fallback aceptamos token en body
        // SOLO para el endpoint de abandono — navigator.sendBeacon no soporta headers
        // y necesitamos detectar el cierre de pestaña en medio del chequeo (Tarea #104).
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (
            req.body &&
            typeof req.body.token === 'string' &&
            req.path.endsWith('/abandonar')
        ) {
            token = req.body.token;
            // Limpiar el token del body para que el controller no lo vea
            delete req.body.token;
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return res.status(401).json({ error: 'Token invalido o expirado' });
        }

        // Join con sedes para que cualquier endpoint pueda usar
        // perfil.sede_nombre sin hacer otra query.
        const { data: perfil, error: errPerfil } = await supabase
            .from('usuarios')
            .select(`
                *,
                sedes:sede_id (
                    id,
                    nombre
                )
            `)
            .eq('id', data.user.id)
            .single();

        if (errPerfil || !perfil) {
            return res.status(401).json({ error: 'Perfil de usuarios no encontrado' });
        }

        if (!perfil.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        perfil.email = data.user.email;
        // Aplanar el join: el join devuelve la sede como objeto anidado, pero
        // es mas comodo exponer solo el nombre como campo plano.
        perfil.sede_nombre = perfil.sedes?.nombre || null;
        delete perfil.sedes;

        // Pool · Paso 2: si es un conductor del pool, adjuntar su suplencia VIGENTE
        // (si la tiene) para que rolEfectivo() lo trate como admin_sede de su sede.
        perfil.suplencia = null;
        perfil.suplenciaSedes = [];   // sedes que CUBRE la suplencia (Fase B)
        perfil.sedeActiva = null;     // cual esta gestionando ahora (selector)
        if (perfil.rol === 'conductor' && perfil.es_pool === true && perfil.sede_id) {
            perfil.suplencia = await suplenciaVigenteDePool(perfil.id);
            if (perfil.suplencia) {
                perfil.suplenciaSedes = await sedesCubiertosDeSuplencia(perfil.suplencia);
                const ids = perfil.suplenciaSedes.map((c) => c.id);
                // El "sede activa" llega por header (lo manda el selector del frontend).
                // Si es valido (esta entre los cubiertos), lo usamos. Si la suplencia cubre
                // un solo sede, ese es el activo por defecto. Si cubre varios y no se
                // eligio ninguno, queda null (el pool debe elegir uno antes de gestionar).
                const headerSede = req.headers['x-sede-activo'];
                if (headerSede && ids.includes(headerSede)) {
                    perfil.sedeActiva = headerSede;
                } else if (ids.length === 1) {
                    perfil.sedeActiva = ids[0];
                }
            }
        }

        req.usuario = perfil;
        req.token = token;
        next();
    } catch (err) {
        console.error('Error verificando token:', err);
        res.status(500).json({ error: 'Error verificando token' });
    }
};

// Roles considerados "admin" en cualquiera de los niveles de la jerarquía
const ROLES_ADMIN = [
    'admin',
    'admin_sede',
    'admin_departamental',
    'superadmin',
];

// Guard genérico: pasa si el rol del usuario está en la lista permitida
export const requiereRol = (...rolesPermitidos) => (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(rolEfectivo(req.usuario))) {
        return res
            .status(403)
            .json({ error: 'No tienes permisos para realizar esta accion' });
    }
    next();
};

export const soloAdmin = (req, res, next) => {
    if (!req.usuario || !ROLES_ADMIN.includes(rolEfectivo(req.usuario))) {
        return res
            .status(403)
            .json({ error: 'Solo administradores pueden hacer esta accion' });
    }
    next();
};

export const soloConductor = (req, res, next) => {
    if (req.usuario?.rol !== 'conductor') {
        return res
            .status(403)
            .json({ error: 'Solo conductores pueden hacer esta accion' });
    }
    next();
};

export const adminOConductor = (req, res, next) => {
    const rol = rolEfectivo(req.usuario);
    if (!rol || (rol !== 'conductor' && !ROLES_ADMIN.includes(rol))) {
        return res
            .status(403)
            .json({ error: 'No tienes permisos para realizar esta accion' });
    }
    next();
};