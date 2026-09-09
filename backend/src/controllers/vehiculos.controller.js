import { supabase } from "../config/supabase.js";
import {
    registrarAuditoriaVehiculo,
    obtenerVehiculoCompleto,
    subirArchivoACloudinary,
    eliminarDeCloudinary,
    extraerPublicId,
} from "../services/vehiculos.service.js";
import { obtenerScope, aplicarScope, puedeAccederSede } from "../services/scope.service.js";

// Verifica que el vehiculo exista Y que el admin tenga la sede del vehiculo
// dentro de su scope territorial (Tarea #102). Recibe el usuario completo.
const verificarAccesoVehiculo = async (vehiculoId, usuario) => {
    const { data: existente } = await supabase
        .from("vehiculos")
        .select("sede_id, runt_url, placa")
        .eq("id", vehiculoId)
        .single();

    if (!existente) return { error: "Vehiculo no encontrado", status: 404 };

    const permitido = await puedeAccederSede(usuario, existente.sede_id);
    if (!permitido) {
        return { error: "No tienes acceso a este vehiculo", status: 403 };
    }

    return { vehiculo: existente };
};

export const listarVehiculos = async (req, res) => {
    try {
        const { estado, tipo, busqueda, activo } = req.query;

        let query = supabase
            .from("vehiculos")
            .select(`
                *,
                fotos:fotos_vehiculo (id, url, es_principal),
                sede:sede_id (
                    id,
                    nombre,
                    ciudad:ciudad_id (
                        id,
                        nombre,
                        departamento:departamento_id ( id, nombre )
                    )
                )
            `)
            .order("nivel_criticidad", { ascending: false })
            .order("placa", { ascending: true });

        // Filtrar por el scope territorial del admin (sede/ciudad/depto/region/nacional)
        const scope = await obtenerScope(req.usuario);
        query = aplicarScope(query, scope);

        if (estado) query = query.eq("estado", estado);
        if (tipo) query = query.eq("tipo", tipo);
        if (activo !== undefined) query = query.eq("activo", activo === "true");

        if (busqueda) {
            query = query.or(
                `placa.ilike.%${busqueda}%,marca.ilike.%${busqueda}%,linea.ilike.%${busqueda}%`
            );
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json({ vehiculos: data });
    } catch (err) {
        console.error("Error listando vehiculos:", err);
        res.status(500).json({ error: "Error al listar vehiculos" });
    }
};

export const obtenerVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const vehiculo = await obtenerVehiculoCompleto(id);

        if (!vehiculo) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, vehiculo.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        res.json({ vehiculo });
    } catch (err) {
        console.error("Error obteniendo vehiculo:", err);
        res.status(500).json({ error: "Error al obtener vehiculo" });
    }
};

export const crearVehiculo = async (req, res) => {
    try {
        const {
            placa,
            vin,
            marca,
            linea,
            tipo,
            modelo_anio,
            color,
            kilometraje_actual,
            soat_vencimiento,
            rtm_vencimiento,
            extintor_vencimiento,
            ultimo_cambio_aceite,
            estado = "operativo",
            nivel_criticidad = 0,
            notas,
        } = req.body;

        if (!placa || !marca || !tipo) {
            return res.status(400).json({
                error: "placa, marca y tipo son obligatorios",
            });
        }

        const { data: existente } = await supabase
            .from("vehiculos")
            .select("id")
            .eq("placa", placa)
            .maybeSingle();

        if (existente) {
            return res.status(400).json({
                error: "Ya existe un vehiculo con esa placa",
            });
        }

        // Sede del vehiculo (multinivel #102/#116): el Coordinador de sede
        // hereda SU sede; el Director Regional/Nacional lo elige y debe estar
        // dentro de su scope. (El alias 'admin' con sede tambien hereda el suyo.)
        const sedeFinal = req.usuario.sede_id || req.body.sede_id;
        if (!sedeFinal) {
            return res.status(400).json({
                error: "Debes indicar la sede del vehículo.",
            });
        }
        if (!(await puedeAccederSede(req.usuario, sedeFinal))) {
            return res.status(403).json({
                error: "No puedes crear vehículos en esa sede (fuera de tu área).",
            });
        }

        const { data: nuevoVehiculo, error: errInsert } = await supabase
            .from("vehiculos")
            .insert({
                placa,
                vin,
                marca,
                linea,
                tipo,
                modelo_anio,
                color,
                kilometraje_actual,
                soat_vencimiento: soat_vencimiento || null,
                rtm_vencimiento: rtm_vencimiento || null,
                extintor_vencimiento: extintor_vencimiento || null,
                ultimo_cambio_aceite: ultimo_cambio_aceite || null,
                estado,
                nivel_criticidad,
                notas,
                sede_id: sedeFinal,
                // Vehiculo VIP / de direccion (Pool, ver docs/diseno-pool-vip.md):
                // solo lo pueden marcar los Directores (Regional / Nacional).
                es_vip: ["superadmin", "admin_departamental"].includes(req.usuario.rol)
                    ? req.body.es_vip === true
                    : false,
            })
            .select()
            .single();

        if (errInsert) {
            return res.status(500).json({ error: errInsert.message });
        }

        await registrarAuditoriaVehiculo({
            vehiculoId: nuevoVehiculo.id,
            accionPorId: req.usuario.id,
            accion: "creado",
            detalles: { placa, marca, tipo },
        });

        res.status(201).json({ vehiculo: nuevoVehiculo });
    } catch (err) {
        console.error("Error creando vehiculo:", err);
        res.status(500).json({ error: "Error al crear vehiculo" });
    }
};

export const actualizarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existente } = await supabase
            .from("vehiculos")
            .select("sede_id")
            .eq("id", id)
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        const { sede_id: _, id: __, created_at: ___, es_vip, ...datos } = req.body;

        // El marcado VIP / de direccion solo lo cambian los Directores; para el
        // resto se ignora (no se toca el valor existente).
        if (es_vip !== undefined &&
            ["superadmin", "admin_departamental"].includes(req.usuario.rol)) {
            datos.es_vip = es_vip === true;
        }

        const { data, error } = await supabase
            .from("vehiculos")
            .update(datos)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "actualizado",
            detalles: Object.keys(datos),
        });

        res.json({ vehiculo: data });
    } catch (err) {
        console.error("Error actualizando vehiculo:", err);
        res.status(500).json({ error: "Error al actualizar vehiculo" });
    }
};

export const desactivarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existente } = await supabase
            .from("vehiculos")
            .select("sede_id, placa")
            .eq("id", id)
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        const { error } = await supabase
            .from("vehiculos")
            .update({ activo: false })
            .eq("id", id);

        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "desactivado",
            detalles: { placa: existente.placa },
        });

        res.json({ mensaje: "Vehiculo desactivado" });
    } catch (err) {
        console.error("Error desactivando vehiculo:", err);
        res.status(500).json({ error: "Error al desactivar vehiculo" });
    }
};

export const reactivarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        // Cargar el vehiculo para verificar que existe y que el actor tiene acceso
        // a su sede (mismo patron que desactivar/eliminar). Sin esto, un admin
        // podria reactivar vehiculos de OTRA sede (IDOR).
        const { data: existente } = await supabase
            .from("vehiculos")
            .select("sede_id, placa")
            .eq("id", id)
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        const { error } = await supabase
            .from("vehiculos")
            .update({ activo: true })
            .eq("id", id);

        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "reactivado",
            detalles: { placa: existente.placa },
        });

        res.json({ mensaje: "Vehiculo reactivado" });
    } catch (err) {
        console.error("Error reactivando vehiculo:", err);
        res.status(500).json({ error: "Error al reactivar vehiculo" });
    }
};

export const eliminarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existente } = await supabase
            .from("vehiculos")
            .select("sede_id, placa, runt_url")
            .eq("id", id)
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        const { data: fotos } = await supabase
            .from("fotos_vehiculo")
            .select("url")
            .eq("vehiculo_id", id);

        if (fotos && fotos.length > 0) {
            await Promise.all(
                fotos.map((foto) =>
                    eliminarDeCloudinary(extraerPublicId(foto.url), "image")
                )
            );
        }

        if (existente.runt_url) {
            await eliminarDeCloudinary(
                extraerPublicId(existente.runt_url),
                existente.runt_url.includes("/raw/") ? "raw" : "image"
            );
        }

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "eliminado",
            detalles: {
                placa: existente.placa,
                fotos_eliminadas: fotos?.length || 0,
                runt_eliminado: !!existente.runt_url,
            },
        });

        const { error } = await supabase
            .from("vehiculos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        res.json({ mensaje: "Vehiculo eliminado permanentemente" });
    } catch (err) {
        console.error("Error eliminando vehiculo:", err);
        res.status(500).json({ error: "Error al eliminar vehiculo" });
    }
};

export const subirFotos = async (req, res) => {
    try {
        const { id } = req.params;

        const acceso = await verificarAccesoVehiculo(id, req.usuario);
        if (acceso.error) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No se recibieron archivos" });
        }

        const { count } = await supabase
            .from("fotos_vehiculo")
            .select("*", { count: "exact", head: true })
            .eq("vehiculo_id", id);

        const ordenInicial = count || 0;

        const fotosCreadas = [];
        for (let i = 0; i < req.files.length; i++) {
            const archivo = req.files[i];
            const resultado = await subirArchivoACloudinary(
                archivo.buffer,
                "vehiculos",
                "image"
            );

            const { data: nuevaFoto, error: errInsert } = await supabase
                .from("fotos_vehiculo")
                .insert({
                    vehiculo_id: id,
                    url: resultado.secure_url,
                    descripcion: archivo.originalname,
                    es_principal: ordenInicial === 0 && i === 0,
                    orden: ordenInicial + i,
                })
                .select()
                .single();

            if (errInsert) {
                await eliminarDeCloudinary(resultado.public_id, "image");
                throw errInsert;
            }

            fotosCreadas.push(nuevaFoto);
        }

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "fotos_agregadas",
            detalles: { cantidad: fotosCreadas.length },
        });

        res.status(201).json({ fotos: fotosCreadas });
    } catch (err) {
        console.error("Error subiendo fotos:", err);
        res.status(500).json({ error: "Error al subir fotos" });
    }
};

export const eliminarFoto = async (req, res) => {
    try {
        const { id, foto_id } = req.params;

        const acceso = await verificarAccesoVehiculo(id, req.usuario);
        if (acceso.error) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        const { data: foto } = await supabase
            .from("fotos_vehiculo")
            .select("url, es_principal")
            .eq("id", foto_id)
            .eq("vehiculo_id", id)
            .single();

        if (!foto) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }

        await eliminarDeCloudinary(extraerPublicId(foto.url), "image");

        const { error } = await supabase
            .from("fotos_vehiculo")
            .delete()
            .eq("id", foto_id);

        if (error) throw error;

        if (foto.es_principal) {
            const { data: siguiente } = await supabase
                .from("fotos_vehiculo")
                .select("id")
                .eq("vehiculo_id", id)
                .order("orden", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (siguiente) {
                await supabase
                    .from("fotos_vehiculo")
                    .update({ es_principal: true })
                    .eq("id", siguiente.id);
            }
        }

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "foto_eliminada",
        });

        res.json({ mensaje: "Foto eliminada" });
    } catch (err) {
        console.error("Error eliminando foto:", err);
        res.status(500).json({ error: "Error al eliminar foto" });
    }
};

export const marcarFotoPrincipal = async (req, res) => {
    try {
        const { id, foto_id } = req.params;

        const acceso = await verificarAccesoVehiculo(id, req.usuario);
        if (acceso.error) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        await supabase
            .from("fotos_vehiculo")
            .update({ es_principal: false })
            .eq("vehiculo_id", id);

        const { error } = await supabase
            .from("fotos_vehiculo")
            .update({ es_principal: true })
            .eq("id", foto_id)
            .eq("vehiculo_id", id);

        if (error) throw error;

        res.json({ mensaje: "Foto marcada como principal" });
    } catch (err) {
        console.error("Error marcando foto principal:", err);
        res.status(500).json({ error: "Error al marcar foto principal" });
    }
};

export const subirRunt = async (req, res) => {
    try {
        const { id } = req.params;

        const acceso = await verificarAccesoVehiculo(id, req.usuario);
        if (acceso.error) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No se recibio archivo" });
        }

        if (acceso.vehiculo.runt_url) {
            await eliminarDeCloudinary(
                extraerPublicId(acceso.vehiculo.runt_url),
                acceso.vehiculo.runt_url.includes("/raw/") ? "raw" : "image"
            );
        }

        const placaLimpia = acceso.vehiculo.placa.replace(/\s+/g, "_");
        const publicIdLegible = `runt_${placaLimpia}`;

        const resultado = await subirArchivoACloudinary(
            req.file.buffer,
            "runt",
            "image",
            "pdf",
            publicIdLegible
        );

        const { error } = await supabase
            .from("vehiculos")
            .update({ runt_url: resultado.secure_url })
            .eq("id", id);

        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "runt_actualizado",
        });

        res.json({ runt_url: resultado.secure_url });
    } catch (err) {
        console.error("Error subiendo RUNT:", err);
        res.status(500).json({ error: "Error al subir RUNT" });
    }
};

export const eliminarRunt = async (req, res) => {
    try {
        const { id } = req.params;

        const acceso = await verificarAccesoVehiculo(id, req.usuario);
        if (acceso.error) {
            return res.status(acceso.status).json({ error: acceso.error });
        }

        if (acceso.vehiculo.runt_url) {
            await eliminarDeCloudinary(
                extraerPublicId(acceso.vehiculo.runt_url),
                "raw"
            );
        }

        const { error } = await supabase
            .from("vehiculos")
            .update({ runt_url: null })
            .eq("id", id);

        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "runt_eliminado",
        });

        res.json({ mensaje: "RUNT eliminado" });
    } catch (err) {
        console.error("Error eliminando RUNT:", err);
        res.status(500).json({ error: "Error al eliminar RUNT" });
    }
};
