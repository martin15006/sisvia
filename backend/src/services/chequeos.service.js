import { supabase } from "../config/supabase.js";
import { obtenerScope } from "./scope.service.js";

// Trae todas las preguntas de aptitud activas indexadas por id para evaluacion rapida
// Incluye el texto de la pregunta para devolver mensajes claros al frontend
const obtenerMapaPreguntas = async () => {
    const { data, error } = await supabase
        .from("preguntas_aptitud")
        .select("id, pregunta, respuesta_apta")
        .eq("activo", true);
    if (error) throw error;
    return data.reduce((acc, p) => {
        acc[p.id] = { texto: p.pregunta, respuesta_apta: p.respuesta_apta };
        return acc;
    }, {});
};

// Evalua si las 5 respuestas del conductor lo califican como apto
// Devuelve fallas con info completa: id, texto, respuesta dada y esperada
const evaluarAptitud = async (respuestas) => {
    const mapa = await obtenerMapaPreguntas();
    const fallas = [];
    for (const r of respuestas) {
        const pregunta = mapa[r.pregunta_id];
        if (!pregunta) {
            fallas.push({
                pregunta_id: r.pregunta_id,
                pregunta: null,
                respuesta_dada: r.respuesta,
                respuesta_esperada: null,
                motivo: "pregunta_inexistente",
            });
        } else if (r.respuesta !== pregunta.respuesta_apta) {
            fallas.push({
                pregunta_id: r.pregunta_id,
                pregunta: pregunta.texto,
                respuesta_dada: r.respuesta,
                respuesta_esperada: pregunta.respuesta_apta,
                motivo: "respuesta_no_apta",
            });
        }
    }
    return { apto: fallas.length === 0, fallas, mapa };
};

// Registra un intento de chequeo que el sistema bloqueo (para auditoria y notificacion al admin).
// Si el vehiculo_id no existe en BD (viola FK), reintenta con null para que el intento
// quede registrado de todas formas. Asi nunca se pierde un evento de auditoria.
export const registrarIntentoBloqueado = async ({
    conductorId,
    vehiculoId,
    sedeId,
    razon,
    detalle,
}) => {
    const payload = {
        conductor_id: conductorId,
        vehiculo_id: vehiculoId || null,
        sede_id: sedeId || null,
        razon,
        detalle: detalle || null,
    };

    const { error } = await supabase.from("intentos_chequeo_bloqueado").insert(payload);
    if (!error) return;

    // Si la falla fue por la FK del vehiculo, reintentamos sin vehiculo_id
    const esFKVehiculo = error.message?.includes("vehiculo_id") || error.code === "23503";
    if (esFKVehiculo && payload.vehiculo_id !== null) {
        console.warn(
            `[intento bloqueado] vehiculo_id ${payload.vehiculo_id} no existe en BD, reintentando con null`
        );
        const { error: retry } = await supabase
            .from("intentos_chequeo_bloqueado")
            .insert({ ...payload, vehiculo_id: null });
        if (!retry) return;
        console.error("Error registrando intento bloqueado (retry):", retry.message);
        return;
    }

    console.error("Error registrando intento bloqueado:", error.message);
};

// Valida que el vehiculo exista, este activo y pertenezca a la sede del conductor
const verificarVehiculoParaChequeo = async (vehiculoId, sedeDelConductor, esPool = false) => {
    const { data: vehiculo, error } = await supabase
        .from("vehiculos")
        .select("id, placa, activo, sede_id, estado, nivel_criticidad, es_vip, soat_vencimiento, rtm_vencimiento, extintor_vencimiento")
        .eq("id", vehiculoId)
        .maybeSingle();

    if (error || !vehiculo) {
        return { valido: false, razon: "vehiculo_no_existe", detalle: "Vehiculo no encontrado" };
    }
    if (vehiculo.sede_id !== sedeDelConductor) {
        // No revelamos que existe en otra sede por seguridad
        return { valido: false, razon: "vehiculo_no_existe", detalle: "El vehiculo no pertenece a tu sede" };
    }
    // Regla del pool (docs/diseno-pool-vip.md): un vehiculo VIP solo lo opera un
    // conductor del pool, y un conductor del pool solo opera vehiculos VIP. Si no
    // coinciden, se trata como "no existe" para no revelar los vehiculos VIP a un
    // conductor normal (misma logica de seguridad que la sede ajena).
    if (vehiculo.es_vip !== (esPool === true)) {
        return { valido: false, razon: "vehiculo_no_existe", detalle: "El vehiculo no esta disponible para ti" };
    }
    if (!vehiculo.activo) {
        return {
            valido: false,
            razon: "vehiculo_desactivado",
            vehiculo,
            detalle: `El vehiculo ${vehiculo.placa} esta deshabilitado por el administrador`,
        };
    }
    return { valido: true, vehiculo };
};

// Documentos legales del vehiculo que, vencidos, impiden circular. Devuelve el
// PRIMERO vencido { nombre, fechaLegible } o null si estan todos al dia.
const primerDocumentoVencido = (vehiculo) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const docs = [
        ["SOAT", vehiculo.soat_vencimiento],
        ["revisión técnico-mecánica (RTM)", vehiculo.rtm_vencimiento],
        ["extintor", vehiculo.extintor_vencimiento],
    ];
    for (const [nombre, fecha] of docs) {
        if (!fecha) continue;
        const v = new Date(fecha);
        v.setHours(0, 0, 0, 0);
        if (v < hoy) {
            return {
                nombre,
                fechaLegible: v.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }),
            };
        }
    }
    return null;
};

// Decide si este chequeo cuenta como "oficial" del dia (el primer preoperacional del dia para el vehiculo)
const esPrimerChequeoDelDia = async (vehiculoId, tipo) => {
    if (tipo !== "preoperacional") return false;

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    const { count, error } = await supabase
        .from("chequeos_preoperacionales")
        .select("id", { count: "exact", head: true })
        .eq("vehiculo_id", vehiculoId)
        .eq("tipo", "preoperacional")
        .gte("fecha", inicio.toISOString())
        .lte("fecha", fin.toISOString());

    if (error) {
        console.error("Error contando chequeos del dia:", error.message);
        return false;
    }
    return count === 0;
};

// Inicia un chequeo: valida aptitud, valida vehiculo, crea cabecera + respuestas de aptitud
// Devuelve { exito, status, ... } para que el controller decida la respuesta HTTP
export const iniciarChequeo = async ({
    conductor,
    vehiculoId,
    tipo,
    kilometraje,
    respuestasAptitud,
}) => {
    // 0. Validar licencia vigente (Tarea #106).
    // Una licencia vencida es un bloqueo legal absoluto: el conductor no puede
    // operar el vehiculo aunque este apto y el vehiculo este disponible.
    // Se evalua primero por ser el impedimento mas fundamental.
    if (conductor.licencia_vencimiento) {
        // Comparar solo fechas (sin hora) para que "vence hoy" todavia sea valido.
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencimiento = new Date(conductor.licencia_vencimiento);
        vencimiento.setHours(0, 0, 0, 0);

        if (vencimiento < hoy) {
            await registrarIntentoBloqueado({
                conductorId: conductor.id,
                vehiculoId: null, // aun no validamos el vehiculo
                sedeId: conductor.sede_id,
                razon: "licencia_vencida",
                detalle: `Licencia vencida el ${conductor.licencia_vencimiento}`,
            });
            const fechaLegible = vencimiento.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
            return {
                exito: false,
                status: 403,
                error: `Tu licencia de conducción está vencida desde el ${fechaLegible}. Debes renovarla antes de operar un vehículo. Contacta al administrador del sistema.`,
                razon: "licencia_vencida",
            };
        }
    }

    // 1. Evaluar aptitud
    const evaluacion = await evaluarAptitud(respuestasAptitud);
    if (!evaluacion.apto) {
        const idsFallidos = evaluacion.fallas.map((f) => f.pregunta_id);
        await registrarIntentoBloqueado({
            conductorId: conductor.id,
            vehiculoId,
            sedeId: conductor.sede_id,
            razon: "conductor_no_apto",
            detalle: `Pregunta(s) no aptas: ${idsFallidos.join(", ")}`,
        });
        const cantidad = evaluacion.fallas.length;
        const mensaje = cantidad === 1
            ? "No estás en condiciones aptas para conducir. La pregunta que no fue apta se detalla en preguntas_fallidas."
            : `No estás en condiciones aptas para conducir. Las ${cantidad} preguntas que no fueron aptas se detallan en preguntas_fallidas.`;
        return {
            exito: false,
            status: 403,
            error: mensaje,
            razon: "conductor_no_apto",
            preguntas_fallidas: evaluacion.fallas,
        };
    }

    // 2. Verificar vehiculo
    const verif = await verificarVehiculoParaChequeo(vehiculoId, conductor.sede_id, conductor.es_pool === true);
    if (!verif.valido) {
        // Si el vehiculo no existe en BD, pasamos null para no violar la FK del log.
        // Si existe pero esta desactivado o es de otra sede, guardamos su ID.
        await registrarIntentoBloqueado({
            conductorId: conductor.id,
            vehiculoId: verif.vehiculo?.id || null,
            sedeId: conductor.sede_id,
            razon: verif.razon,
            detalle: verif.detalle,
        });
        return {
            exito: false,
            status: 403,
            error: verif.detalle,
            razon: verif.razon,
        };
    }

    // 2.5 Documentos del vehiculo vencidos (SOAT/RTM/extintor): bloquean el
    // PREOPERACIONAL — legalmente no puede circular. No bloquea el postoperacional
    // porque el recorrido ya ocurrio y hay que poder registrar el cierre.
    // Sin aviso al admin: el Coordinador ya se entera por el aviso diario de
    // vencimientos; aqui solo se le impide salir al conductor.
    if (tipo === "preoperacional") {
        const doc = primerDocumentoVencido(verif.vehiculo);
        if (doc) {
            return {
                exito: false,
                status: 403,
                error: `No puedes operar este vehículo: el ${doc.nombre} está vencido (desde el ${doc.fechaLegible}). Avísale al Coordinador de sede para que lo renueve.`,
                razon: "documento_vencido",
            };
        }
    }

    // 3. Calcular es_oficial
    const esOficial = await esPrimerChequeoDelDia(vehiculoId, tipo);

    // 4. Crear la cabecera del chequeo
    const { data: chequeo, error: errChequeo } = await supabase
        .from("chequeos_preoperacionales")
        .insert({
            vehiculo_id: vehiculoId,
            conductor_id: conductor.id,
            sede_id: conductor.sede_id,
            tipo,
            es_oficial: esOficial,
            kilometraje,
        })
        .select()
        .single();

    if (errChequeo) {
        throw new Error(`Error creando chequeo: ${errChequeo.message}`);
    }

    // 5. Guardar respuestas de aptitud (con rollback manual si falla)
    const respuestasInsert = respuestasAptitud.map((r) => ({
        chequeo_id: chequeo.id,
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        es_apto: r.respuesta === evaluacion.mapa[r.pregunta_id]?.respuesta_apta,
    }));

    const { error: errAptitud } = await supabase
        .from("respuestas_aptitud")
        .insert(respuestasInsert);

    if (errAptitud) {
        // Rollback: si fallo guardar aptitud, borrar la cabecera del chequeo
        await supabase
            .from("chequeos_preoperacionales")
            .delete()
            .eq("id", chequeo.id);
        throw new Error(`Error guardando respuestas de aptitud: ${errAptitud.message}`);
    }

    return {
        exito: true,
        chequeo,
        vehiculo: verif.vehiculo,
    };
};

// Valida que el chequeo exista, sea del conductor, y este abierto (no cerrado)
// Devuelve el chequeo o un error apropiado
const obtenerChequeoEditable = async (chequeoId, conductorId) => {
    const { data: chequeo, error } = await supabase
        .from("chequeos_preoperacionales")
        .select("id, vehiculo_id, conductor_id, sede_id, tipo, cerrado")
        .eq("id", chequeoId)
        .maybeSingle();

    if (error || !chequeo) {
        return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
    }
    if (chequeo.conductor_id !== conductorId) {
        return { error: { status: 403, mensaje: "Este chequeo no te pertenece" } };
    }
    if (chequeo.cerrado) {
        return { error: { status: 409, mensaje: "El chequeo ya esta cerrado, no se puede modificar" } };
    }
    return { chequeo };
};

// Guarda respuestas del chequeo. Permite envios parciales (1 a 39 respuestas)
// Hace upsert por (chequeo_id, item_id) para que se puedan ir guardando progresivamente
export const guardarRespuestasChequeo = async ({ chequeoId, conductorId, respuestas }) => {
    const verificacion = await obtenerChequeoEditable(chequeoId, conductorId);
    if (verificacion.error) return verificacion;

    // Construir filas para upsert
    const filas = respuestas.map((r) => ({
        chequeo_id: chequeoId,
        item_id: r.item_id,
        estado: r.estado,
        observacion: r.observacion || null,
    }));

    const { data, error } = await supabase
        .from("respuestas_chequeo")
        .upsert(filas, { onConflict: "chequeo_id,item_id" })
        .select("id, item_id, estado, observacion");

    if (error) {
        return { error: { status: 500, mensaje: `Error guardando respuestas: ${error.message}` } };
    }

    // Contar el total acumulado de respuestas del chequeo
    const { count } = await supabase
        .from("respuestas_chequeo")
        .select("id", { count: "exact", head: true })
        .eq("chequeo_id", chequeoId);

    return {
        respuestas_guardadas: data,
        total_acumulado: count,
        total_esperado: 39,
    };
};

// Orden de severidad de los estados para comparar resultados
const NIVEL_ESTADO = {
    operativo: 1,
    observacion: 2,
    alerta: 3,
    critico: 4,
    no_operativo: 5,
};

// Calcula el resultado final del chequeo a partir de las respuestas
const calcularResultado = (respuestas, itemsCriticosSet) => {
    let cumple = 0;
    let noCumple = 0;
    let noAplica = 0;
    let tieneFallaCritica = false;

    for (const r of respuestas) {
        if (r.estado === "cumple") cumple += 1;
        else if (r.estado === "no_cumple") {
            noCumple += 1;
            if (itemsCriticosSet.has(r.item_id)) tieneFallaCritica = true;
        } else if (r.estado === "no_aplica") noAplica += 1;
    }

    let estado;
    let criticidad;
    if (tieneFallaCritica) {
        estado = "no_operativo";
        criticidad = 95;
    } else if (noCumple === 0) {
        estado = "operativo";
        criticidad = 10;
    } else if (noCumple <= 3) {
        estado = "observacion";
        criticidad = 30;
    } else if (noCumple <= 7) {
        estado = "alerta";
        criticidad = 50;
    } else if (noCumple <= 15) {
        estado = "critico";
        criticidad = 75;
    } else {
        estado = "no_operativo";
        criticidad = 95;
    }

    return {
        items_cumple_count: cumple,
        items_no_cumple_count: noCumple,
        items_no_aplica_count: noAplica,
        tiene_falla_critica: tieneFallaCritica,
        resultado_estado: estado,
        resultado_criticidad: criticidad,
    };
};

// Cierra un chequeo: valida que tenga las 39 respuestas, calcula el resultado,
// guarda los counts, y actualiza el estado del vehiculo si el resultado es peor.
// Si el resultado es mejor que el estado actual, devuelve una sugerencia para el admin.
export const cerrarChequeo = async ({ chequeoId, conductorId, notasGenerales }) => {
    const verificacion = await obtenerChequeoEditable(chequeoId, conductorId);
    if (verificacion.error) return verificacion;
    const { chequeo } = verificacion;

    // Obtener respuestas del chequeo
    const { data: respuestas, error: errRes } = await supabase
        .from("respuestas_chequeo")
        .select("item_id, estado")
        .eq("chequeo_id", chequeoId);

    if (errRes) {
        return { error: { status: 500, mensaje: `Error obteniendo respuestas: ${errRes.message}` } };
    }

    // Verificar que esten las 39 respuestas (o el numero aplicable segun excepciones del vehiculo)
    const { data: excepciones } = await supabase
        .from("excepciones_items_vehiculo")
        .select("item_id")
        .eq("vehiculo_id", chequeo.vehiculo_id);

    const itemsExcluidos = new Set((excepciones || []).map((e) => e.item_id));
    const totalEsperado = 39 - itemsExcluidos.size;

    if (respuestas.length < totalEsperado) {
        return {
            error: {
                status: 400,
                mensaje: `Faltan respuestas. Se esperaban ${totalEsperado} y solo se han registrado ${respuestas.length}`,
            },
        };
    }

    // Traer ids de items criticos para calcular falla critica
    const { data: itemsCriticos } = await supabase
        .from("items_chequeo")
        .select("id")
        .eq("es_critico", true);

    const setCriticos = new Set((itemsCriticos || []).map((i) => i.id));

    // Calcular el resultado final
    const resultado = calcularResultado(respuestas, setCriticos);

    // Contar criticos que quedaron en NO CUMPLE (para mostrarselo al conductor)
    const itemsCriticosNoCumple = respuestas.filter(
        (r) => r.estado === "no_cumple" && setCriticos.has(r.item_id)
    ).length;

    // Cerrar el chequeo con el resultado calculado
    const { data: chequeoCerrado, error: errCierre } = await supabase
        .from("chequeos_preoperacionales")
        .update({
            ...resultado,
            cerrado: true,
            fecha_cierre: new Date().toISOString(),
            notas_generales: notasGenerales || null,
        })
        .eq("id", chequeoId)
        .select()
        .single();

    if (errCierre) {
        return { error: { status: 500, mensaje: `Error cerrando chequeo: ${errCierre.message}` } };
    }

    // Comparar con estado actual del vehiculo
    const { data: vehiculo } = await supabase
        .from("vehiculos")
        .select("id, placa, estado, nivel_criticidad")
        .eq("id", chequeo.vehiculo_id)
        .single();

    const nivelActual = NIVEL_ESTADO[vehiculo.estado] || 1;
    const nivelNuevo = NIVEL_ESTADO[resultado.resultado_estado];

    let actualizacionVehiculo = null;
    let sugerenciaAdmin = null;

    if (nivelNuevo > nivelActual) {
        // El chequeo da un resultado PEOR → actualizar vehiculo automaticamente
        await supabase
            .from("vehiculos")
            .update({
                estado: resultado.resultado_estado,
                nivel_criticidad: resultado.resultado_criticidad,
            })
            .eq("id", vehiculo.id);

        actualizacionVehiculo = {
            estado_anterior: vehiculo.estado,
            estado_nuevo: resultado.resultado_estado,
            criticidad_anterior: vehiculo.nivel_criticidad,
            criticidad_nueva: resultado.resultado_criticidad,
        };
    } else if (nivelNuevo < nivelActual) {
        // El chequeo da un resultado MEJOR → NO actualizar, sugerir al admin
        sugerenciaAdmin = {
            mensaje: `El chequeo del vehículo ${vehiculo.placa} sugiere mejorar el estado de ${vehiculo.estado} a ${resultado.resultado_estado}. Revisa y decide si aplicar el cambio.`,
            estado_actual: vehiculo.estado,
            estado_sugerido: resultado.resultado_estado,
            criticidad_actual: vehiculo.nivel_criticidad,
            criticidad_sugerida: resultado.resultado_criticidad,
        };
    }

    return {
        chequeo: chequeoCerrado,
        vehiculo: {
            id: vehiculo.id,
            placa: vehiculo.placa,
        },
        items_criticos_no_cumple: itemsCriticosNoCumple,
        actualizacion_vehiculo: actualizacionVehiculo,
        sugerencia_admin: sugerenciaAdmin,
    };
};

// Dado un admin, devuelve los sede_id que tiene permitido ver segun su rol.
// Delega en el helper compartido scope.service.js (una sola fuente de verdad para
// todo el sistema). Mantiene el contrato historico de esta funcion:
//   - null  = sin filtro (superadmin, ve todas las sedes)
//   - array = lista de sede_id que puede ver
const obtenerSedesVisiblesParaAdmin = async (usuario) => {
    const scope = await obtenerScope(usuario);
    return scope.tipo === "global" ? null : scope.sedeIds;
};

// Lista chequeos visibles para el admin segun su scope, con filtros opcionales
export const listarChequeosParaAdmin = async ({
    usuario,
    fechaDesde,
    fechaHasta,
    placa,
    resultadoEstado,
    soloOficiales,
    soloCerrados,
    pagina = 1,
    limite = 20,
}) => {
    const sedesVisibles = await obtenerSedesVisiblesParaAdmin(usuario);

    let query = supabase
        .from("chequeos_preoperacionales")
        .select(`
            id, fecha, tipo, es_oficial, kilometraje, cerrado, fecha_cierre,
            abandonado, abandonado_en, motivo_abandono,
            resultado_estado, resultado_criticidad,
            items_cumple_count, items_no_cumple_count, items_no_aplica_count,
            tiene_falla_critica,
            vehiculo:vehiculos (id, placa, marca, linea, tipo, modelo_anio),
            conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (id, nombre_completo, cedula, foto_url)
        `, { count: "exact" })
        .order("fecha", { ascending: false });

    if (sedesVisibles !== null) {
        if (sedesVisibles.length === 0) {
            return { chequeos: [], total: 0, pagina, limite };
        }
        query = query.in("sede_id", sedesVisibles);
    }

    if (fechaDesde) query = query.gte("fecha", fechaDesde);
    if (fechaHasta) query = query.lte("fecha", fechaHasta);
    if (resultadoEstado) query = query.eq("resultado_estado", resultadoEstado);
    if (soloOficiales === "true") query = query.eq("es_oficial", true);
    if (soloCerrados === "true") query = query.eq("cerrado", true);

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;
    query = query.range(desde, hasta);

    const { data, error, count } = await query;
    if (error) throw error;

    // Filtro por placa post-query (es un campo dentro del join).
    // Tolerante: ignora espacios, mayusculas y caracteres no alfanumericos
    // (ej: "ABC 123" y "ABC123" matchean igual)
    let chequeos = data;
    const filtroPlaca = normalizarPlaca(placa);
    if (filtroPlaca) {
        chequeos = chequeos.filter((c) =>
            normalizarPlaca(c.vehiculo?.placa).includes(filtroPlaca)
        );
    }

    return { chequeos, total: count, pagina, limite };
};

// Devuelve un chequeo con TODO: cabecera, respuestas con items, aptitud con preguntas, fotos
export const obtenerChequeoCompleto = async (chequeoId, usuario) => {
    const sedesVisibles = await obtenerSedesVisiblesParaAdmin(usuario);

    // Cabecera con joins basicos
    let query = supabase
        .from("chequeos_preoperacionales")
        .select(`
            *,
            vehiculo:vehiculos (
                id, placa, marca, linea, tipo, modelo_anio, color, vin,
                estado, nivel_criticidad, runt_url,
                fotos:fotos_vehiculo (id, url, es_principal)
            ),
            conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey (
                id, nombre_completo, cedula, telefono, foto_url,
                licencia_numero, licencia_categoria, licencia_vencimiento
            )
        `)
        .eq("id", chequeoId);

    // Scope: si no es superadmin, solo puede ver chequeos de sus sedes
    if (sedesVisibles !== null) {
        if (sedesVisibles.length === 0) {
            return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
        }
        query = query.in("sede_id", sedesVisibles);
    }

    const { data: chequeo, error } = await query.maybeSingle();
    if (error || !chequeo) {
        return { error: { status: 404, mensaje: "Chequeo no encontrado" } };
    }

    // Respuestas de aptitud con texto de la pregunta
    const { data: respuestasAptitud } = await supabase
        .from("respuestas_aptitud")
        .select(`
            id, respuesta, es_apto,
            pregunta:preguntas_aptitud (id, pregunta, respuesta_apta, orden)
        `)
        .eq("chequeo_id", chequeoId);

    // Respuestas del checklist con item + categoria + fotos
    const { data: respuestasChequeo } = await supabase
        .from("respuestas_chequeo")
        .select(`
            id, estado, observacion,
            item:items_chequeo (
                id, descripcion, orden, es_critico,
                categoria:categorias_chequeo (id, nombre, icono, orden)
            ),
            fotos:fotos_chequeo (id, url, descripcion, fecha_subida, preservar_siempre, fecha_borrado_programado)
        `)
        .eq("chequeo_id", chequeoId);

    // Ordenar respuestas por orden del item
    const respuestasOrdenadas = (respuestasChequeo || []).sort(
        (a, b) => (a.item?.orden || 0) - (b.item?.orden || 0)
    );
    const aptitudOrdenada = (respuestasAptitud || []).sort(
        (a, b) => (a.pregunta?.orden || 0) - (b.pregunta?.orden || 0)
    );

    return {
        chequeo: {
            ...chequeo,
            respuestas_aptitud: aptitudOrdenada,
            respuestas_chequeo: respuestasOrdenadas,
        },
    };
};

// Lista intentos de chequeo bloqueados visibles para el admin
export const listarIntentosBloqueados = async ({
    usuario,
    fechaDesde,
    fechaHasta,
    razon,
    soloNoNotificados,
    pagina = 1,
    limite = 20,
}) => {
    const sedesVisibles = await obtenerSedesVisiblesParaAdmin(usuario);

    let query = supabase
        .from("intentos_chequeo_bloqueado")
        .select(`
            id, razon, detalle, fecha, notificado_admin,
            conductor:usuarios!intentos_chequeo_bloqueado_conductor_id_fkey (id, nombre_completo, cedula),
            vehiculo:vehiculos (id, placa, marca, linea)
        `, { count: "exact" })
        .order("fecha", { ascending: false });

    if (sedesVisibles !== null) {
        if (sedesVisibles.length === 0) {
            return { intentos: [], total: 0, pagina, limite };
        }
        query = query.in("sede_id", sedesVisibles);
    }

    if (fechaDesde) query = query.gte("fecha", fechaDesde);
    if (fechaHasta) query = query.lte("fecha", fechaHasta);
    if (razon) query = query.eq("razon", razon);
    if (soloNoNotificados === "true") query = query.eq("notificado_admin", false);

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;
    query = query.range(desde, hasta);

    const { data, error, count } = await query;
    if (error) throw error;

    return { intentos: data, total: count, pagina, limite };
};

// Registra un intento bloqueado cuando el conductor responde no apto en la pantalla de aptitud
// (todavia no ha seleccionado vehiculo, asi que vehiculo_id queda null)
export const registrarIntentoNoApto = async ({ conductor, respuestasAptitud }) => {
    const evaluacion = await evaluarAptitud(respuestasAptitud);

    if (evaluacion.apto) {
        return { apto: true, fallas: [] };
    }

    const idsFallidos = evaluacion.fallas.map((f) => f.pregunta_id);
    await registrarIntentoBloqueado({
        conductorId: conductor.id,
        vehiculoId: null,
        sedeId: conductor.sede_id,
        razon: "conductor_no_apto",
        detalle: `Pregunta(s) no aptas: ${idsFallidos.join(", ")}`,
    });

    return { apto: false, fallas: evaluacion.fallas };
};

// Lista los chequeos del propio conductor logueado (para el dashboard del conductor)
export const obtenerChequeosDelConductor = async (conductorId, limite = 10) => {
    const { data, error } = await supabase
        .from("chequeos_preoperacionales")
        .select(`
            id, fecha, tipo, es_oficial, cerrado, fecha_cierre,
            resultado_estado, resultado_criticidad, tiene_falla_critica,
            kilometraje,
            vehiculo:vehiculos (id, placa, marca, linea, tipo)
        `)
        .eq("conductor_id", conductorId)
        .order("fecha", { ascending: false })
        .limit(limite);

    if (error) throw error;
    return data;
};

// Lista los vehiculos activos de la sede del conductor para que pueda seleccionar
// La busqueda por placa es tolerante: ignora espacios, mayusculas y caracteres no alfanumericos
// (ej: "ABC 123", "ABC123", "abc-123" todos matchean con la placa "ABC 123")
// esPool = ¿el conductor es del pool? Regla de manejo (ver docs/diseno-pool-vip.md):
//   - pool          -> SOLO vehiculos VIP (especiales / de direccion)
//   - conductor norm -> SOLO vehiculos no-VIP (la flota normal)
export const obtenerVehiculosDisponibles = async (sedeId, busqueda = "", esPool = false) => {
    if (!sedeId) {
        throw new Error("El conductor no tiene sede asignada");
    }

    const { data, error } = await supabase
        .from("vehiculos")
        .select(`
            id, placa, marca, linea, tipo, modelo_anio, color,
            estado, nivel_criticidad, kilometraje_actual, es_vip,
            fotos:fotos_vehiculo (id, url, es_principal)
        `)
        .eq("sede_id", sedeId)
        .eq("activo", true)
        .eq("es_vip", esPool === true)
        .order("placa", { ascending: true });

    if (error) throw error;

    // Si no hay busqueda, devolver todo
    const filtro = normalizarPlaca(busqueda);
    if (!filtro) return data;

    // Filtrar en JS normalizando ambos lados (la lista de la sede es corta)
    return data.filter((v) => normalizarPlaca(v.placa).includes(filtro));
};

// Helper: deja solo letras y numeros, en mayusculas (para comparar placas)
const normalizarPlaca = (texto = "") => {
    return String(texto).toUpperCase().replace(/[^A-Z0-9]/g, "");
};

// Devuelve el catalogo completo: categorias con sus items + preguntas de aptitud
// En una sola llamada para que el frontend lo cargue de una vez
export const obtenerCatalogoCompleto = async () => {
    const [resCategorias, resItems, resPreguntas] = await Promise.all([
        supabase
            .from("categorias_chequeo")
            .select("id, nombre, descripcion, icono, orden")
            .eq("activo", true)
            .order("orden", { ascending: true }),
        supabase
            .from("items_chequeo")
            .select("id, categoria_id, descripcion, descripcion_larga, orden, es_critico, aplica_a_tipos")
            .eq("activo", true)
            .order("orden", { ascending: true }),
        supabase
            .from("preguntas_aptitud")
            .select("id, pregunta, respuesta_apta, orden")
            .eq("activo", true)
            .order("orden", { ascending: true }),
    ]);

    if (resCategorias.error) throw resCategorias.error;
    if (resItems.error) throw resItems.error;
    if (resPreguntas.error) throw resPreguntas.error;

    // Agrupar items por categoria_id
    const itemsPorCategoria = resItems.data.reduce((acc, item) => {
        if (!acc[item.categoria_id]) acc[item.categoria_id] = [];
        acc[item.categoria_id].push({
            id: item.id,
            descripcion: item.descripcion,
            descripcion_larga: item.descripcion_larga,
            orden: item.orden,
            es_critico: item.es_critico,
            aplica_a_tipos: item.aplica_a_tipos,
        });
        return acc;
    }, {});

    const categorias = resCategorias.data.map((cat) => ({
        ...cat,
        items: itemsPorCategoria[cat.id] || [],
    }));

    return {
        categorias,
        preguntas_aptitud: resPreguntas.data,
        meta: {
            total_categorias: categorias.length,
            total_items: resItems.data.length,
            total_items_criticos: resItems.data.filter((i) => i.es_critico).length,
            total_preguntas: resPreguntas.data.length,
        },
    };
};
