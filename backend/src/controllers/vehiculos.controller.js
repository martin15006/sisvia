import { supabase } from "../config/supabase.js";
import {
    registrarAuditoriaVehiculo,
    obtenerVehiculoCompleto,
    subirArchivoACloudinary,
    eliminarDeCloudinary,
    extraerPublicId,
} from "../services/vehiculos.service.js";
import { obtenerScope, aplicarScope, puedeAccederSede } from "../services/scope.service.js";
import { normalizarPlaca, validarPlaca, validarColor } from "../utils/placa.js";
import { filtroEmpresa } from '../services/scopeReglas.js';
import { empresaDeSede } from '../services/scope.service.js';
import { verificarLimite } from '../services/empresas.service.js';
import { CODIGO_LIMITE } from '../services/limitesReglas.js';
import { choquePlaca, validarMotivoBaja, bloqueoPorBaja, MENSAJES_VEHICULO } from '../services/vehiculosReglas.js';

// RN-10: el vehiculo VIGENTE (no dado de baja) con esa placa, en todo SISVIA.
// A proposito sin filtro de empresa: la placa es unica entre todas.
const vigenteConPlaca = async (placa, excepto = null) => {
    let query = supabase.from("vehiculos").select("id, empresa_id").eq("placa", placa).eq("dado_de_baja", false);
    if (excepto) query = query.neq("id", excepto);
    const { data } = await query.limit(1);
    return data?.[0] || null;
};
// Dos altas a la vez con la misma placa: la segunda la frena el indice unico.
const esPlacaRepetida = (error) => error?.code === "23505";

// Verifica que el vehiculo exista Y que el admin tenga la sede del vehiculo
// dentro de su scope territorial (Tarea #102). Recibe el usuario completo.
const verificarAccesoVehiculo = async (vehiculoId, usuario) => {
    const { data: existente } = await supabase
        .from("vehiculos")
        .select("sede_id, runt_url, placa, dado_de_baja")
        .eq("id", vehiculoId).match(filtroEmpresa(usuario))
        .single();

    if (!existente) return { error: "Vehiculo no encontrado", status: 404 };

    const permitido = await puedeAccederSede(usuario, existente.sede_id);
    if (!permitido) {
        return { error: "No tienes acceso a este vehiculo", status: 403 };
    }
    const baja = bloqueoPorBaja(existente);
    if (baja) return { error: baja, status: 400 };

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
        const vehiculo = await obtenerVehiculoCompleto(id, req.usuario);

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
            placa: placaRecibida,
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

        if (!placaRecibida || !marca || !tipo) {
            return res.status(400).json({
                error: "placa, marca y tipo son obligatorios",
            });
        }

        const placa = normalizarPlaca(placaRecibida);
        const errorPlaca = validarPlaca(placa, tipo) || validarColor(color);
        if (errorPlaca) {
            return res.status(400).json({ error: errorPlaca });
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

        const empresaVehiculo = await empresaDeSede(sedeFinal);

        // HU-17.1 · RN-10: la placa no puede estar vigente en ninguna empresa.
        const choque = choquePlaca(await vigenteConPlaca(placa), empresaVehiculo);
        if (choque) return res.status(400).json(choque);

        // HU-02.3 · RN-03: el vehiculo nuevo no puede pasar el limite de la empresa.
        const limite = await verificarLimite(empresaVehiculo, "vehiculos");
        if (limite) return res.status(403).json({ error: limite, codigo: CODIGO_LIMITE });

        const { data: nuevoVehiculo, error: errInsert } = await supabase
            .from("vehiculos")
            .insert({
                empresa_id: empresaVehiculo,
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
                es_vip: ["superadmin", "admin_empresa", "admin_departamental"].includes(req.usuario.rol)
                    ? req.body.es_vip === true
                    : false,
            })
            .select()
            .single();

        if (esPlacaRepetida(errInsert)) {
            return res.status(400).json(choquePlaca(await vigenteConPlaca(placa), empresaVehiculo) || { error: MENSAJES_VEHICULO.placaEnSisvia });
        }
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
            .select("sede_id, placa, tipo, empresa_id, dado_de_baja")
            .eq("id", id).match(filtroEmpresa(req.usuario))
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        const baja = bloqueoPorBaja(existente);
        if (baja) return res.status(400).json({ error: baja });

        // Fuera de la edicion: la empresa (RN-01), el estado activo (se cambia con
        // desactivar/reactivar, que respetan el limite de RN-03) y la baja (HU-17).
        const {
            sede_id: _, id: __, created_at: ___, es_vip,
            empresa_id: _e, activo: _a, dado_de_baja: _b, baja_motivo: _bm, baja_en: _be, baja_por: _bp,
            ...datos
        } = req.body;

        // El marcado VIP / de direccion solo lo cambian los Directores; para el
        // resto se ignora (no se toca el valor existente).
        if (es_vip !== undefined &&
            ["superadmin", "admin_empresa", "admin_departamental"].includes(req.usuario.rol)) {
            datos.es_vip = es_vip === true;
        }

        // Placa y tipo se validan juntos: cambiar solo el tipo tambien puede
        // dejar una placa que no corresponde.
        if (datos.placa !== undefined || datos.tipo !== undefined) {
            if (datos.placa !== undefined) datos.placa = normalizarPlaca(datos.placa);
            const errorPlaca = validarPlaca(datos.placa ?? existente.placa, datos.tipo ?? existente.tipo);
            if (errorPlaca) return res.status(400).json({ error: errorPlaca });
        }
        const errorColor = validarColor(datos.color);
        if (errorColor) return res.status(400).json({ error: errorColor });

        // HU-17.1 · RN-10: cambiar la placa a una vigente en SISVIA tampoco.
        if (datos.placa !== undefined && datos.placa !== existente.placa) {
            const choque = choquePlaca(await vigenteConPlaca(datos.placa, id), existente.empresa_id, id);
            if (choque) return res.status(400).json(choque);
        }

        const { data, error } = await supabase
            .from("vehiculos")
            .update(datos)
            .eq("id", id)
            .select()
            .single();

        if (esPlacaRepetida(error)) return res.status(400).json({ error: MENSAJES_VEHICULO.placaEnSisvia });
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
            .select("sede_id, placa, dado_de_baja")
            .eq("id", id).match(filtroEmpresa(req.usuario))
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }
        const baja = bloqueoPorBaja(existente);
        if (baja) return res.status(400).json({ error: baja });

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
            .select("sede_id, placa, activo, empresa_id, dado_de_baja")
            .eq("id", id).match(filtroEmpresa(req.usuario))
            .maybeSingle();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }

        // HU-17.4: dado de baja por traspaso, no vuelve.
        const baja = bloqueoPorBaja(existente);
        if (baja) return res.status(400).json({ error: baja });

        // HU-02.3 · RN-03: reactivar tambien cuenta para el limite.
        if (!existente.activo) {
            const limite = await verificarLimite(existente.empresa_id, "vehiculos");
            if (limite) return res.status(403).json({ error: limite, codigo: CODIGO_LIMITE });
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
            .select("sede_id, placa, runt_url, dado_de_baja")
            .eq("id", id).match(filtroEmpresa(req.usuario))
            .single();

        if (!existente) {
            return res.status(404).json({ error: "Vehiculo no encontrado" });
        }

        if (!(await puedeAccederSede(req.usuario, existente.sede_id))) {
            return res.status(403).json({
                error: "No tienes acceso a este vehiculo",
            });
        }
        const baja = bloqueoPorBaja(existente);
        if (baja) return res.status(400).json({ error: baja });

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

// PATCH /api/vehiculos/:id/baja  { motivo }
// HU-17.2-3 · RN-11: solo el equipo SISVIA, dentro de la empresa. La contraseña y
// el registro (quien y cuando) los pone el middleware (soporte.service.js); aca
// se suma la placa y el motivo. El vehiculo sale de la flota (activo = false),
// la empresa conserva sus chequeos y la placa queda libre (RN-10).
export const darDeBajaVehiculo = async (req, res) => {
    try {
        if (req.usuario.rol !== "superadmin") {
            return res.status(403).json({ error: MENSAJES_VEHICULO.soloSisvia });
        }
        const errorMotivo = validarMotivoBaja(req.body?.motivo);
        if (errorMotivo) return res.status(400).json({ error: errorMotivo });
        const motivo = req.body.motivo.trim();

        const { id } = req.params;
        const { data: existente } = await supabase
            .from("vehiculos")
            .select("placa, dado_de_baja")
            .eq("id", id).match(filtroEmpresa(req.usuario))
            .maybeSingle();
        if (!existente) return res.status(404).json({ error: "Vehiculo no encontrado" });
        const baja = bloqueoPorBaja(existente);
        if (baja) return res.status(400).json({ error: baja });

        const { error } = await supabase
            .from("vehiculos")
            .update({
                dado_de_baja: true,
                activo: false,
                baja_motivo: motivo,
                baja_en: new Date().toISOString(),
                baja_por: req.usuario.id,
            })
            .eq("id", id);
        if (error) throw error;

        await registrarAuditoriaVehiculo({
            vehiculoId: id,
            accionPorId: req.usuario.id,
            accion: "baja_traspaso",
            detalles: { placa: existente.placa, motivo },
        });
        res.locals.auditoria = { elemento: `${existente.placa} · Motivo: ${motivo}` };

        res.json({ mensaje: `Vehículo ${existente.placa} dado de baja por traspaso` });
    } catch (err) {
        console.error("Error dando de baja el vehiculo:", err);
        res.status(500).json({ error: "Error al dar de baja el vehículo" });
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
            .eq("id", foto_id).match(filtroEmpresa(req.usuario))
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
            .eq("id", id).match(filtroEmpresa(req.usuario));

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
            .eq("id", id).match(filtroEmpresa(req.usuario));

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
