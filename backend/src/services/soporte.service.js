// El superadmin dentro de una empresa (pacto para-empresas, HU-16 · RN-11 · HU-06.6).
// Lo llama verificarToken en cada pedido; las reglas viven en soporteReglas.js.
import { supabase, crearClienteAuth } from '../config/supabase.js';
import { auditarEmpresa } from './empresas.service.js';
import { respaldoDelPedido } from '../middlewares/contextoPedido.js';
import { estadoBloqueo, registrarFallo, limpiarIntentos } from './loginIntentos.service.js';
import {
    HEADER_EMPRESA,
    HEADER_CONFIRMACION,
    MENSAJES_SOPORTE,
    CODIGOS_SOPORTE,
    esUuid,
    esEscritura,
    limpia,
    necesitaConfirmacion,
    requiereEntrar,
    esAltaDeUsuario,
    idUsuarioDeRuta,
    describirAccion,
    mensajeBloqueo,
} from './soporteReglas.js';

// La empresa a la que el superadmin dice haber entrado (header), o null si no mando
// ninguna. `false` si mando una que no existe.
export const empresaActivaDelPedido = async (req) => {
    const pedida = req.headers[HEADER_EMPRESA];
    if (!pedida) return null;
    if (!esUuid(pedida)) return false;
    const { data } = await supabase.from('empresas').select('id, nombre').eq('id', pedida).maybeSingle();
    return data || false;
};

// Verifica la contraseña con un cliente DESECHABLE (CL-10) y cierra esa sesion
// suelta (scope local: no toca la sesion con la que el superadmin esta trabajando).
// Usa el mismo contador de intentos que el login: 5 fallos seguidos bloquean 15 min
// (HU-16.5). Devuelve null si la contraseña sirve, o { error, bloqueada }.
// Tambien la usa el traspaso de la marca de dueño (HU-20.5).
export const verificarContrasena = async (email, password) => {
    const bloqueo = await estadoBloqueo(email);
    if (bloqueo.bloqueado) return { error: mensajeBloqueo(bloqueo.minutosRestantes), bloqueada: true };
    const cliente = crearClienteAuth();
    const { data, error } = await cliente.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
        const fallo = await registrarFallo(email);
        return fallo.recienBloqueado
            ? { error: mensajeBloqueo(fallo.minutos), bloqueada: true }
            : { error: MENSAJES_SOPORTE.contrasenaIncorrecta, bloqueada: false };
    }
    limpiarIntentos(email);
    cliente.auth.signOut({ scope: 'local' }).catch(() => {});
    return null;
};

const negar = (res, clave, extra = {}) => {
    res.status(403).json({ error: MENSAJES_SOPORTE[clave], codigo: CODIGOS_SOPORTE[clave], ...extra });
    return true;
};

// Controla un pedido del superadmin. Devuelve true si ya respondio (y el pedido
// no sigue); false si puede seguir.
export const controlarSuperadmin = async (req, res) => {
    const usuario = req.usuario;
    if (usuario?.rol !== 'superadmin') return false;

    const metodo = req.method;
    const ruta = req.originalUrl;
    const datos = { rol: 'superadmin', metodo, ruta, empresaActiva: usuario.empresaActiva };

    // HU-06.6: afuera de una empresa no cambia sus datos.
    if (requiereEntrar(datos)) return negar(res, 'entraPrimero');
    if (!usuario.empresaActiva && esEscritura(metodo)) {
        // Afuera se crean solo usuarios del equipo SISVIA...
        if (esAltaDeUsuario(metodo, ruta) && req.body?.rol !== 'superadmin') return negar(res, 'entraPrimero');
        // ...y solo se tocan los del equipo (los de una empresa, entrando a ella).
        const idAfectado = idUsuarioDeRuta(ruta);
        if (idAfectado) {
            const { data: afectado } = await supabase.from('usuarios').select('empresa_id').eq('id', idAfectado).maybeSingle();
            if (afectado?.empresa_id) return negar(res, 'entraPrimero');
        }
    }

    // HU-16.2-3 · RN-11: adentro, cada cambio pide la contraseña y queda registrado.
    if (!necesitaConfirmacion(datos)) return false;

    const accion = describirAccion(metodo, ruta);
    const contexto = { accion: accion.pedido, empresa: usuario.empresaActivaNombre };
    // HU-16.5: si la cuenta ya esta bloqueada, ni se pide la contraseña.
    const bloqueo = await estadoBloqueo(usuario.email);
    if (bloqueo.bloqueado) {
        res.status(403).json({ error: mensajeBloqueo(bloqueo.minutosRestantes), codigo: CODIGOS_SOPORTE.bloqueada, ...contexto });
        return true;
    }

    const cruda = req.headers[HEADER_CONFIRMACION];
    if (!cruda) return negar(res, 'confirmar', contexto);

    let password = cruda;
    try { password = decodeURIComponent(cruda); } catch { /* ya venia sin codificar */ }
    const fallo = await verificarContrasena(usuario.email, password);
    if (fallo) {
        const codigo = fallo.bloqueada ? CODIGOS_SOPORTE.bloqueada : CODIGOS_SOPORTE.contrasenaIncorrecta;
        res.status(403).json({ error: fallo.error, codigo, ...contexto });
        return true;
    }

    // Se registra solo si el cambio de verdad se hizo. La IP y el navegador se toman
    // ahora: al terminar la respuesta ya no se esta dentro del pedido (HU-07).
    const respaldo = respaldoDelPedido();
    res.on('finish', () => {
        if (res.statusCode >= 400) return;
        auditarEmpresa({
            empresa: { id: usuario.empresaActiva, nombre: usuario.empresaActivaNombre },
            actorId: usuario.id,
            respaldo,
            accion: 'soporte',
            // res.locals.auditoria: lo que el handler quiera sumar (por ejemplo, que elemento bloqueo)
            detalles: { que: accion.hecho, metodo, ruta: limpia(ruta), ...(res.locals.auditoria || {}) },
        });
    });
    return false;
};
