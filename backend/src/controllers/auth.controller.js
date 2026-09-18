import { supabase, crearClienteAuth } from "../config/supabase.js";
import { resolverIdentificador, obtenerPerfil } from "../services/auth.service.js";
import { crearNotificacion } from "../services/notificaciones.service.js";
import { suplenciaVigenteDePool, sedesCubiertosDeSuplencia } from "../services/suplencias.service.js";
import { estadoBloqueo, registrarFallo, limpiarIntentos } from "../services/loginIntentos.service.js";
import { normalizarTelefono, validarTelefono } from '../utils/telefono.js';

// Helper: ¿la fecha de vencimiento (YYYY-MM-DD) ya paso? Compara solo fechas.
const licenciaEstaVencida = (fechaVencimiento) => {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const v = new Date(fechaVencimiento);
    v.setHours(0, 0, 0, 0);
    return v < hoy;
};


export const login = async (req, res) => {
    try {
        const { identificador, password } = req.body;

        if (!identificador || !password) {
            return res.status(400).json({
                error: 'Identificador y contraseñas son obligatorios',
            });
        }

        const email = await resolverIdentificador(identificador);
        if (!email) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        // Anti fuerza bruta: si la cuenta esta bloqueada por intentos fallidos,
        // ni siquiera intentamos el login hasta que pase el tiempo. (Fail-soft:
        // si la tabla aun no existe, esto devuelve no-bloqueado y el login sigue.)
        const bloqueo = await estadoBloqueo(email);
        if (bloqueo.bloqueado) {
            const m = bloqueo.minutosRestantes;
            return res.status(429).json({
                error: `Demasiados intentos fallidos. Tu cuenta esta bloqueada temporalmente; intenta de nuevo en ${m} minuto${m === 1 ? '' : 's'}.`,
            });
        }

        // Cliente desechable: signInWithPassword ensucia el cliente que lo corre.
        const { data, error } = await crearClienteAuth().auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // Contraseña incorrecta: contamos el fallo. Si llega a 5 seguidos,
            // la cuenta queda bloqueada 15 minutos.
            const fallo = await registrarFallo(email);
            if (fallo.recienBloqueado) {
                return res.status(429).json({
                    error: `Demasiados intentos fallidos. Tu cuenta quedo bloqueada por seguridad; intenta de nuevo en ${fallo.minutos} minutos.`,
                });
            }
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        // Login correcto: reiniciamos el contador de intentos fallidos.
        // Fire-and-forget (la funcion es fail-soft): no demora ni rompe el login.
        limpiarIntentos(email);

        const perfil = await obtenerPerfil(data.user.id);

        // Llegamos aqui solo si la contraseña fue correcta (signInWithPassword OK).
        // Si la cuenta esta desactivada, devolvemos 403 con mensaje claro para que
        // el usuario sepa por que no puede entrar (no es un typo de contraseña).
        if (!perfil.activo) {
            return res.status(403).json({
                error: 'Tu cuenta esta desactivada. Contacta al administrador del sistema para reactivarla.',
            });
        }

        // Pool · Paso 2: adjuntar la suplencia VIGENTE para que el front sepa de una
        // (sin esperar a /auth/me) que este conductor esta supliendo al Coordinador.
        perfil.suplencia = null;
        perfil.suplenciaSedes = [];
        perfil.sedeActiva = null;
        if (perfil.rol === 'conductor' && perfil.es_pool === true && perfil.sede_id) {
            perfil.suplencia = await suplenciaVigenteDePool(perfil.id);
            if (perfil.suplencia) {
                perfil.suplenciaSedes = await sedesCubiertosDeSuplencia(perfil.suplencia);
                // Si cubre un solo sede, ese es el activo de una; si cubre varios,
                // queda null hasta que el pool elija uno en el selector.
                if (perfil.suplenciaSedes.length === 1) {
                    perfil.sedeActiva = perfil.suplenciaSedes[0].id;
                }
            }
        }

        // Si un conductor inicia sesion con la licencia vencida, avisar al admin.
        // Limite: maximo 5 avisos por dia por conductor (dedupeHoras=24, maxPorVentana=5)
        // para que el admin lo vea varias veces sin saturarse si el conductor entra
        // muchas veces. Fire-and-forget: no bloquea ni falla el login.
        if (perfil.rol === 'conductor' && licenciaEstaVencida(perfil.licencia_vencimiento)) {
            const fechaLegible = new Date(perfil.licencia_vencimiento).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'long', year: 'numeric',
            });
            crearNotificacion({
                tipo: 'licencia_vencida',
                titulo: `${perfil.nombre_completo} inició sesión con la licencia vencida`,
                mensaje: `Su licencia venció el ${fechaLegible}. Necesita renovarla para poder operar vehículos.`,
                url_destino: `/admin/usuarios/${perfil.id}`,
                sede_id: perfil.sede_id,
                conductor_id: perfil.id,
                dedupeHoras: 24,
                maxPorVentana: 5,
                soloSede: true, // se queda en la sede; hacia arriba se escala a mano
            }).catch((e) => console.warn('[notificaciones] login licencia vencida:', e.message));
        }

        res.json({
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expira_en: data.session.expires_in,
            usuario: {
                id: perfil.id,
                cedula: perfil.cedula,
                nombre_completo: perfil.nombre_completo,
                // El email vive en Supabase Auth (no en la tabla usuarios); lo tomamos
                // del usuario autenticado para que "Mi perfil" lo muestre desde el login.
                email: data.user.email,
                telefono: perfil.telefono,
                rol: perfil.rol,
                debe_cambiar_password: perfil.debe_cambiar_password,
                foto_url: perfil.foto_url,
                sede_id: perfil.sede_id,
                sede_nombre: perfil.sede_nombre,
                es_pool: perfil.es_pool === true,
                suplencia: perfil.suplencia || null,
                suplencia_sedes: perfil.suplenciaSedes || [],
                sede_activa: perfil.sedeActiva || null,
                licencia_numero: perfil.licencia_numero,
                licencia_categoria: perfil.licencia_categoria,
                licencia_vencimiento: perfil.licencia_vencimiento,
            },
        });
    } catch (err) {
        console.error('Error en login: ', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerActual = (req, res) => {
    res.json({
        usuario: {
            id: req.usuario.id,
            cedula: req.usuario.cedula,
            nombre_completo: req.usuario.nombre_completo,
            telefono: req.usuario.telefono,
            email: req.usuario.email,
            rol: req.usuario.rol,
            foto_url: req.usuario.foto_url,
            debe_cambiar_password: req.usuario.debe_cambiar_password,
            licencia_numero: req.usuario.licencia_numero,
            licencia_categoria: req.usuario.licencia_categoria,
            licencia_vencimiento: req.usuario.licencia_vencimiento,
            sede_id: req.usuario.sede_id,
            sede_nombre: req.usuario.sede_nombre,
            es_pool: req.usuario.es_pool === true,
            suplencia: req.usuario.suplencia || null,
            suplencia_sedes: req.usuario.suplenciaSedes || [],
            sede_activa: req.usuario.sedeActiva || null,
        },
    });
};

// PATCH /api/auth/mi-perfil
// Permite que CUALQUIER usuario logueado (admin o conductor) edite SUS PROPIOS
// datos personales seguros: nombre_completo, telefono, foto_url.
//
// IMPORTANTE: NO permite cambiar cedula, email, rol, sede_id, activo,
// debe_cambiar_password ni licencia. Esos datos solo los puede tocar:
//   - un admin de rango superior (cedula/correo via ModalVerificacionAdmin)
//   - el sistema (debe_cambiar_password al cambiar la contraseña)
//   - el admin de la sede (datos del conductor desde UsuariosAdmin)
export const actualizarMiPerfil = async (req, res) => {
    try {
        const { nombre_completo, telefono, foto_url } = req.body;

        // Construir solo con campos seguros que vinieron en el body.
        // Asi un PATCH parcial es valido (solo cambiar la foto, por ejemplo).
        const cambios = {};
        if (nombre_completo !== undefined) {
            const limpio = String(nombre_completo).trim();
            if (!limpio) {
                return res.status(400).json({ error: 'El nombre no puede estar vacio' });
            }
            cambios.nombre_completo = limpio;
        }
        if (telefono !== undefined) {
            const errorTelefono = validarTelefono(telefono);
            if (errorTelefono) return res.status(400).json({ error: errorTelefono });
            cambios.telefono = normalizarTelefono(telefono);
        }
        if (foto_url !== undefined) {
            cambios.foto_url = foto_url || null;
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: 'No hay nada que actualizar' });
        }

        cambios.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('usuarios')
            .update(cambios)
            .eq('id', req.usuario.id)
            .select()
            .single();

        if (error) {
            console.error('Error actualizando mi perfil:', error);
            return res.status(500).json({ error: 'Error al actualizar el perfil' });
        }

        res.json({
            mensaje: 'Perfil actualizado correctamente',
            usuario: {
                id: data.id,
                cedula: data.cedula,
                nombre_completo: data.nombre_completo,
                telefono: data.telefono,
                email: req.usuario.email,
                rol: data.rol,
                foto_url: data.foto_url,
                debe_cambiar_password: data.debe_cambiar_password,
                licencia_numero: data.licencia_numero,
                licencia_categoria: data.licencia_categoria,
                licencia_vencimiento: data.licencia_vencimiento,
                sede_id: data.sede_id,
                sede_nombre: req.usuario.sede_nombre,
            },
        });
    } catch (err) {
        console.error('Error en actualizarMiPerfil:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const cambiarPassword = async (req, res) => {
    try {
        const { password_actual, password_nueva, password_confirmacion } = req.body;

        // En primer login el flujo es distinto: el usuario tiene una password temporal
        // que apunto pero ya no recuerda. Solo se le pide la nueva.
        // En cambio voluntario (debe_cambiar_password=false) si se pide la actual
        // como verificacion de identidad.
        const esPrimerLogin = req.usuario.debe_cambiar_password === true;

        // Validaciones basicas
        if (!password_nueva || !password_confirmacion) {
            return res.status(400).json({
                error: "La nueva contraseña y su confirmación son obligatorias",
            });
        }

        if (!esPrimerLogin && !password_actual) {
            return res.status(400).json({
                error: "Debes ingresar tu contraseña actual",
            });
        }

        if (password_nueva !== password_confirmacion) {
            return res.status(400).json({
                error: "Las contraseñas nuevas no coinciden",
            });
        }

        if (password_nueva.length < 8) {
            return res.status(400).json({
                error: "La contraseña nueva debe tener al menos 8 caracteres",
            });
        }

        // Solo en cambio voluntario verificamos la contraseña actual
        if (!esPrimerLogin) {
            if (password_nueva === password_actual) {
                return res.status(400).json({
                    error: "La nueva contraseña debe ser diferente a la actual",
                });
            }

            const { error: errLogin } = await crearClienteAuth().auth.signInWithPassword({
                email: req.usuario.email,
                password: password_actual,
            });

            if (errLogin) {
                return res.status(401).json({ error: "Contraseña actual incorrecta" });
            }
        }

        // Cambiar la password via Admin API
        const { error: errUpdate } = await supabase.auth.admin.updateUserById(
            req.usuario.id,
            { password: password_nueva }
        );

        if (errUpdate) {
            return res
                .status(500)
                .json({ error: "Error al actualizar la contraseña" });
        }

        // Marcar debe_cambiar_password = false en la tabla usuarios
        await supabase
            .from("usuarios")
            .update({ debe_cambiar_password: false })
            .eq("id", req.usuario.id);

        // IMPORTANTE: Supabase Auth invalida los tokens activos cuando se cambia
        // la contraseña. Si simplemente respondieramos OK, la siguiente peticion
        // del frontend devolveria 401 y el usuario seria desconectado.
        //
        // Solucion: hacer un login fresco con la nueva contraseña y devolver el
        // nuevo token. El frontend lo reemplaza en localStorage y sigue navegando
        // sin interrupcion.
        const { data: sesionNueva, error: errLoginNuevo } = await crearClienteAuth().auth
            .signInWithPassword({
                email: req.usuario.email,
                password: password_nueva,
            });

        if (errLoginNuevo) {
            // Caso raro: el cambio funciono pero no podemos generar token nuevo.
            // El frontend debera redirigir al login con un mensaje claro.
            return res.json({
                mensaje: "Contraseña actualizada. Por favor inicia sesión de nuevo.",
                requiere_relogin: true,
            });
        }

        res.json({
            mensaje: "Contraseña actualizada correctamente",
            token: sesionNueva.session.access_token,
            refresh_token: sesionNueva.session.refresh_token,
            expira_en: sesionNueva.session.expires_in,
        });
    } catch (err) {
        console.error("Error cambiando password:", err);
        res.status(500).json({ error: "Error al cambiar la contraseña" });
    }

};