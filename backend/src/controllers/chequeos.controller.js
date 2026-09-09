import {
    obtenerCatalogoCompleto,
    obtenerVehiculosDisponibles,
    iniciarChequeo,
    guardarRespuestasChequeo,
    cerrarChequeo,
    listarChequeosParaAdmin,
    obtenerChequeoCompleto,
    listarIntentosBloqueados,
    obtenerChequeosDelConductor,
    registrarIntentoNoApto,
} from "../services/chequeos.service.js";
import { crearNotificacion } from "../services/notificaciones.service.js";
import { enviarCorreoFallaCritica } from "../services/email.service.js";
import { supabase } from "../config/supabase.js";

const ESTADOS_RESPUESTA_VALIDOS = ["cumple", "no_cumple", "no_aplica"];

// GET /api/chequeos/catalogo
// Devuelve categorias + items + preguntas de aptitud en una sola respuesta
export const getCatalogo = async (req, res) => {
    try {
        const catalogo = await obtenerCatalogoCompleto();
        res.json(catalogo);
    } catch (err) {
        console.error("Error obteniendo catalogo:", err);
        res.status(500).json({ error: "Error al obtener el catalogo del chequeo" });
    }
};

// GET /api/chequeos/vehiculos-disponibles?busqueda=OCJ
// Lista vehiculos activos de la sede del conductor con busqueda opcional por placa
export const getVehiculosDisponibles = async (req, res) => {
    try {
        const { busqueda } = req.query;
        const vehiculos = await obtenerVehiculosDisponibles(
            req.usuario.sede_id,
            busqueda || "",
            req.usuario.es_pool === true
        );
        res.json({ vehiculos, total: vehiculos.length });
    } catch (err) {
        console.error("Error listando vehiculos disponibles:", err);
        res.status(500).json({ error: err.message || "Error al listar vehiculos" });
    }
};

// POST /api/chequeos/iniciar
// Body: { vehiculo_id, tipo, kilometraje, respuestas_aptitud: [{pregunta_id, respuesta}, ...] }
// Valida aptitud + vehiculo, crea cabecera del chequeo + guarda respuestas de aptitud
export const postIniciarChequeo = async (req, res) => {
    try {
        const { vehiculo_id, tipo, kilometraje, respuestas_aptitud } = req.body;

        if (!vehiculo_id) {
            return res.status(400).json({ error: "vehiculo_id es obligatorio" });
        }
        if (!tipo || !["preoperacional", "postoperacional"].includes(tipo)) {
            return res.status(400).json({ error: "tipo debe ser 'preoperacional' o 'postoperacional'" });
        }
        if (typeof kilometraje !== "number" || kilometraje < 0) {
            return res.status(400).json({ error: "kilometraje debe ser un numero positivo" });
        }
        if (!Array.isArray(respuestas_aptitud) || respuestas_aptitud.length !== 5) {
            return res.status(400).json({ error: "Se requieren las 5 respuestas de aptitud" });
        }
        for (const r of respuestas_aptitud) {
            if (!r.pregunta_id || !["si", "no"].includes(r.respuesta)) {
                return res.status(400).json({
                    error: "Cada respuesta debe tener pregunta_id y respuesta ('si' o 'no')",
                });
            }
        }

        const resultado = await iniciarChequeo({
            conductor: req.usuario,
            vehiculoId: vehiculo_id,
            tipo,
            kilometraje,
            respuestasAptitud: respuestas_aptitud,
        });

        if (!resultado.exito) {
            // Bloque C paso 2: notificar al admin del intento bloqueado.
            // Razones: conductor_no_apto, vehiculo_desactivado, vehiculo_no_existe.
            try {
                const razon = resultado.razon;
                const nombreConductor = req.usuario.nombre_completo;
                const sedeId = req.usuario.sede_id;

                const config = {
                    conductor_no_apto: {
                        tipo: 'intento_bloqueado_aptitud',
                        titulo: `${nombreConductor} no pasó la aptitud`,
                        mensaje: 'Intento de chequeo bloqueado: el conductor declaro no estar en condiciones aptas.',
                    },
                    vehiculo_desactivado: {
                        tipo: 'intento_bloqueado_vehiculo',
                        titulo: `${nombreConductor} intentó usar un vehículo desactivado`,
                        mensaje: 'Intento de chequeo bloqueado: el vehiculo esta desactivado por el admin.',
                    },
                    vehiculo_no_existe: {
                        tipo: 'intento_bloqueado_vehiculo',
                        titulo: `${nombreConductor} intentó usar un vehículo inexistente`,
                        mensaje: 'Intento de chequeo bloqueado: el vehiculo no existe o no es de la sede.',
                    },
                    licencia_vencida: {
                        tipo: 'licencia_vencida',
                        titulo: `${nombreConductor} tiene la licencia vencida`,
                        mensaje: 'Intento de chequeo bloqueado: la licencia de conduccion del conductor esta vencida. Debe renovarla.',
                    },
                }[razon];

                if (config) {
                    // La licencia vencida lleva al perfil del conductor (para
                    // renovar/actualizar la fecha); los demas intentos llevan a la
                    // pagina de intentos bloqueados.
                    const urlDestino = razon === 'licencia_vencida'
                        ? `/admin/usuarios/${req.usuario.id}`
                        : '/admin/chequeos/intentos-bloqueados';
                    await crearNotificacion({
                        tipo: config.tipo,
                        titulo: config.titulo,
                        mensaje: config.mensaje,
                        url_destino: urlDestino,
                        sede_id: sedeId,
                        conductor_id: req.usuario.id,
                        vehiculo_id: vehiculo_id || null,
                        soloSede: true, // se queda en la sede; hacia arriba se escala a mano
                    });
                }
            } catch (notifErr) {
                console.warn('[notificaciones] no se pudo crear notif de intento bloqueado:', notifErr.message);
            }

            return res.status(resultado.status).json({
                error: resultado.error,
                razon: resultado.razon,
                preguntas_fallidas: resultado.preguntas_fallidas,
            });
        }

        res.status(201).json({
            mensaje: "Chequeo iniciado correctamente",
            chequeo: resultado.chequeo,
            vehiculo: {
                id: resultado.vehiculo.id,
                placa: resultado.vehiculo.placa,
                estado_actual: resultado.vehiculo.estado,
                nivel_criticidad: resultado.vehiculo.nivel_criticidad,
            },
        });
    } catch (err) {
        console.error("Error iniciando chequeo:", err);
        res.status(500).json({ error: err.message || "Error al iniciar el chequeo" });
    }
};

// PUT /api/chequeos/:id/respuestas
// Body: { respuestas: [{ item_id, estado, observacion }] }
// Permite envios parciales (1 a 39 respuestas), hace upsert por (chequeo_id, item_id)
export const putRespuestasChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { respuestas } = req.body;

        if (!Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({ error: "Se requiere al menos una respuesta" });
        }

        for (const r of respuestas) {
            if (!r.item_id || typeof r.item_id !== "number") {
                return res.status(400).json({ error: "Cada respuesta debe tener item_id numerico" });
            }
            if (!ESTADOS_RESPUESTA_VALIDOS.includes(r.estado)) {
                return res.status(400).json({
                    error: `Estado invalido. Valores permitidos: ${ESTADOS_RESPUESTA_VALIDOS.join(", ")}`,
                });
            }
            if (r.estado === "no_cumple" && (!r.observacion || !r.observacion.trim())) {
                return res.status(400).json({
                    error: `El item ${r.item_id} fue marcado como NO CUMPLE pero no tiene observacion. La observacion es obligatoria cuando NO CUMPLE.`,
                });
            }
        }

        const resultado = await guardarRespuestasChequeo({
            chequeoId: id,
            conductorId: req.usuario.id,
            respuestas,
        });

        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        res.json({
            mensaje: `${resultado.respuestas_guardadas.length} respuesta(s) guardada(s)`,
            respuestas_guardadas: resultado.respuestas_guardadas,
            total_acumulado: resultado.total_acumulado,
            total_esperado: resultado.total_esperado,
            completo: resultado.total_acumulado >= resultado.total_esperado,
        });
    } catch (err) {
        console.error("Error guardando respuestas:", err);
        res.status(500).json({ error: err.message || "Error al guardar respuestas" });
    }
};

// POST /api/chequeos/:id/cerrar
// Body opcional: { notas_generales }
// Calcula resultado, cierra el chequeo, actualiza estado del vehiculo si es peor,
// o devuelve sugerencia al admin si el resultado es mejor
export const postCerrarChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { notas_generales } = req.body || {};

        const resultado = await cerrarChequeo({
            chequeoId: id,
            conductorId: req.usuario.id,
            notasGenerales: notas_generales,
        });

        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }

        // Bloque C paso 2: notificar al admin de TODO chequeo completado.
        // El tipo de notificacion lleva el estado del resultado (chequeo_operativo,
        // chequeo_observacion, etc.) para que el frontend pueda colorear el icono
        // segun el semaforo: verde/azul/amarillo/rojo/gris.
        try {
            const ch = resultado.chequeo;
            const veh = resultado.vehiculo;
            const estado = ch?.resultado_estado;

            // Texto legible por estado
            const ESTADO_TEXTO = {
                operativo: 'OPERATIVO',
                observacion: 'EN OBSERVACIÓN',
                alerta: 'EN ALERTA',
                critico: 'CRÍTICO',
                no_operativo: 'NO OPERATIVO',
            };

            if (estado && ESTADO_TEXTO[estado]) {
                const placa = veh?.placa || 'sin placa';
                const nombreConductor = req.usuario.nombre_completo || 'Un conductor';
                const tituloEstado = ESTADO_TEXTO[estado];

                await crearNotificacion({
                    tipo: `chequeo_${estado}`, // chequeo_operativo, chequeo_observacion, ...
                    titulo: `${nombreConductor} completó un chequeo`,
                    mensaje: `Vehículo ${placa} quedó ${tituloEstado}.`,
                    url_destino: `/admin/chequeos/${id}`,
                    sede_id: ch?.sede_id,
                    chequeo_id: id,
                    vehiculo_id: ch?.vehiculo_id,
                    conductor_id: ch?.conductor_id,
                    soloSede: true, // se queda en la sede; hacia arriba se escala a mano
                });

                // Falla critica (vehiculo NO OPERATIVO) -> correo inmediato a los
                // admins de la sede. Fire-and-forget: no demora la respuesta del cierre.
                if (estado === 'no_operativo') {
                    enviarCorreoFallaCritica({
                        sedeId: ch?.sede_id,
                        placa,
                        conductor: nombreConductor,
                        criticidad: ch?.resultado_criticidad,
                        fecha: ch?.fecha,
                        chequeoId: id,
                    }).catch((e) => console.warn('[correo] falla critica no enviada:', e.message));
                }
            }
        } catch (notifErr) {
            console.warn('[notificaciones] no se pudo crear notif de cierre:', notifErr.message);
        }

        res.json({
            mensaje: "Chequeo cerrado correctamente",
            chequeo: resultado.chequeo,
            vehiculo: resultado.vehiculo,
            items_criticos_no_cumple: resultado.items_criticos_no_cumple,
            actualizacion_vehiculo: resultado.actualizacion_vehiculo,
            sugerencia_admin: resultado.sugerencia_admin,
        });
    } catch (err) {
        console.error("Error cerrando chequeo:", err);
        res.status(500).json({ error: err.message || "Error al cerrar el chequeo" });
    }
};

// GET /api/chequeos?fecha_desde=...&fecha_hasta=...&placa=...&resultado_estado=...&solo_oficiales=true&solo_cerrados=true&pagina=1&limite=20
// Lista chequeos visibles segun el scope del admin
export const getChequeos = async (req, res) => {
    try {
        const {
            fecha_desde,
            fecha_hasta,
            placa,
            resultado_estado,
            solo_oficiales,
            solo_cerrados,
            pagina,
            limite,
        } = req.query;

        const resultado = await listarChequeosParaAdmin({
            usuario: req.usuario,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta,
            placa,
            resultadoEstado: resultado_estado,
            soloOficiales: solo_oficiales,
            soloCerrados: solo_cerrados,
            pagina: pagina ? parseInt(pagina, 10) : 1,
            limite: limite ? parseInt(limite, 10) : 20,
        });

        res.json(resultado);
    } catch (err) {
        console.error("Error listando chequeos:", err);
        res.status(500).json({ error: err.message || "Error al listar chequeos" });
    }
};

// GET /api/chequeos/:id
// Devuelve el chequeo completo con cabecera + respuestas + aptitud + vehiculo + conductor + fotos
export const getChequeoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await obtenerChequeoCompleto(id, req.usuario);
        if (resultado.error) {
            return res.status(resultado.error.status).json({ error: resultado.error.mensaje });
        }
        res.json(resultado);
    } catch (err) {
        console.error("Error obteniendo chequeo:", err);
        res.status(500).json({ error: err.message || "Error al obtener el chequeo" });
    }
};

// POST /api/chequeos/aptitud-no-apta
// Body: { respuestas_aptitud: [{pregunta_id, respuesta}] }
// Registra el intento bloqueado cuando el conductor responde no apto en la pantalla
// de aptitud (antes de seleccionar vehiculo). Devuelve detalle de las preguntas fallidas.
export const postAptitudNoApta = async (req, res) => {
    try {
        const { respuestas_aptitud } = req.body;

        if (!Array.isArray(respuestas_aptitud) || respuestas_aptitud.length !== 5) {
            return res.status(400).json({ error: "Se requieren las 5 respuestas de aptitud" });
        }

        const resultado = await registrarIntentoNoApto({
            conductor: req.usuario,
            respuestasAptitud: respuestas_aptitud,
        });

        if (resultado.apto) {
            return res.status(400).json({
                error: "Este endpoint es solo para registrar respuestas no aptas. Las tuyas son aptas, continua al endpoint /iniciar.",
            });
        }

        res.json({
            mensaje: "Intento bloqueado registrado. Se notifico al administrador.",
            preguntas_fallidas: resultado.fallas,
        });
    } catch (err) {
        console.error("Error registrando aptitud no apta:", err);
        res.status(500).json({ error: err.message || "Error al registrar el intento" });
    }
};

// GET /api/chequeos/mios?limite=10
// Lista los chequeos del propio conductor logueado (para el dashboard del conductor)
export const getMisChequeos = async (req, res) => {
    try {
        const limite = req.query.limite ? parseInt(req.query.limite, 10) : 10;
        const chequeos = await obtenerChequeosDelConductor(req.usuario.id, limite);
        res.json({ chequeos, total: chequeos.length });
    } catch (err) {
        console.error("Error obteniendo mis chequeos:", err);
        res.status(500).json({ error: err.message || "Error al obtener tus chequeos" });
    }
};

// GET /api/chequeos/intentos-bloqueados?fecha_desde=...&fecha_hasta=...&razon=...&solo_no_notificados=true&pagina=1&limite=20
// Lista intentos de chequeo bloqueados (no apto, vehiculo desactivado, etc.) visibles para el admin
export const getIntentosBloqueados = async (req, res) => {
    try {
        const {
            fecha_desde,
            fecha_hasta,
            razon,
            solo_no_notificados,
            pagina,
            limite,
        } = req.query;

        const resultado = await listarIntentosBloqueados({
            usuario: req.usuario,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta,
            razon,
            soloNoNotificados: solo_no_notificados,
            pagina: pagina ? parseInt(pagina, 10) : 1,
            limite: limite ? parseInt(limite, 10) : 20,
        });

        res.json(resultado);
    } catch (err) {
        console.error("Error listando intentos bloqueados:", err);
        res.status(500).json({ error: err.message || "Error al listar intentos bloqueados" });
    }
};

// POST /api/chequeos/:id/abandonar
// Marca un chequeo en curso como abandonado por el conductor (Tarea #104).
// Disparadores:
//   - inactividad: el frontend detecto 2 minutos sin clicks/touch
//   - cerro_pestana: onbeforeunload del navegador
//   - cerro_sesion: el conductor pulso cerrar sesion (no aplica hoy porque
//     las pantallas del flujo no tienen ese boton, pero queda preparado)
//
// Reglas:
//   - Solo el dueño del chequeo (conductor) o un admin pueden marcarlo.
//   - No se puede abandonar un chequeo ya cerrado.
//   - Si ya estaba abandonado, devuelve 200 silencioso (idempotente).
//
// Al marcarlo, crea una notificacion para los admins de la sede (Bloque C paso 2).
export const postAbandonarChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const usuario = req.usuario;

        const motivosValidos = ['inactividad', 'cerro_sesion', 'cerro_pestana', 'manual'];
        const motivoFinal = motivosValidos.includes(motivo) ? motivo : 'inactividad';

        // Cargar el chequeo + datos para la notificacion en un solo query
        const { data: chequeo, error: errLoad } = await supabase
            .from('chequeos_preoperacionales')
            .select(`
                id, conductor_id, cerrado, abandonado, sede_id, vehiculo_id,
                vehiculo:vehiculo_id ( placa ),
                conductor:conductor_id ( nombre_completo )
            `)
            .eq('id', id)
            .single();

        if (errLoad || !chequeo) {
            return res.status(404).json({ error: 'Chequeo no encontrado' });
        }

        const esConductorDueno = chequeo.conductor_id === usuario.id;
        const esAdmin = usuario.rol !== 'conductor';
        if (!esConductorDueno && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permiso para abandonar este chequeo' });
        }

        if (chequeo.cerrado) {
            return res.status(400).json({ error: 'No se puede abandonar un chequeo ya cerrado' });
        }

        if (chequeo.abandonado) {
            return res.json({ mensaje: 'El chequeo ya estaba marcado como abandonado' });
        }

        const motivoAplicado = esAdmin ? 'manual' : motivoFinal;
        const ahora = new Date().toISOString();
        const { error: errUpdate } = await supabase
            .from('chequeos_preoperacionales')
            .update({
                abandonado: true,
                abandonado_en: ahora,
                motivo_abandono: motivoAplicado,
                updated_at: ahora,
            })
            .eq('id', id);

        if (errUpdate) {
            console.error('Error marcando chequeo como abandonado:', errUpdate);
            return res.status(500).json({ error: 'Error al marcar el chequeo' });
        }

        // Crear notificacion para los admins de la sede (Bloque C).
        // Falla silenciosa: si la tabla notificaciones no existe todavia o falla la
        // insercion, no rompemos el flujo principal del abandono.
        try {
            const nombreConductor = chequeo.conductor?.nombre_completo || 'Un conductor';
            const placa = chequeo.vehiculo?.placa || 'sin placa';
            const motivoTexto = {
                inactividad: 'por inactividad de 2 minutos',
                cerro_pestana: 'al cerrar la pestaña del navegador',
                cerro_sesion: 'al cerrar sesion',
                manual: 'cancelado manualmente por un administrador',
            }[motivoAplicado] || '';

            await crearNotificacion({
                tipo: 'chequeo_abandonado',
                titulo: `${nombreConductor} abandonó un chequeo`,
                mensaje: `Vehículo ${placa} · ${motivoTexto}`,
                url_destino: `/admin/chequeos/${id}`,
                sede_id: chequeo.sede_id,
                chequeo_id: id,
                vehiculo_id: chequeo.vehiculo_id,
                conductor_id: chequeo.conductor_id,
            });
        } catch (notifErr) {
            console.warn('[notificaciones] no se pudo crear notificacion de abandono:', notifErr.message);
        }

        res.json({ mensaje: 'Chequeo marcado como abandonado' });
    } catch (err) {
        console.error('Error en postAbandonarChequeo:', err);
        res.status(500).json({ error: err.message || 'Error al abandonar el chequeo' });
    }
};
