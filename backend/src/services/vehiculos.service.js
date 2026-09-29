import { supabase } from "../config/supabase.js";
import { cloudinary } from "../config/cloudinary.js";
import { filtroEmpresa } from './scopeReglas.js';
import { insertarConRespaldo } from './respaldo.service.js';

export const registrarAuditoriaVehiculo = async ({
    vehiculoId,
    accionPorId,
    accion,
    detalles = {},
}) => {
    // Con la IP y el navegador si lo hace el equipo SISVIA (enmienda 1 de portada-publica, HU-07).
    await insertarConRespaldo("auditoria_vehiculos", {
        vehiculo_id: vehiculoId,
        accion_por_id: accionPorId,
        accion,
        detalles,
    });
};

export const obtenerVehiculoCompleto = async (id, usuario = null) => {
    const { data: vehiculo, error } = await supabase
        .from("vehiculos")
        .select(`
            *,
            baja_usuario:baja_por ( nombre_completo ),
            sede:sedes (
                id,
                nombre,
                direccion,
                ciudad:ciudades (
                    id,
                    nombre,
                    departamento:departamentos (
                        id,
                        nombre,
                        region:regiones (
                            id,
                            nombre
                        )
                    )
                )
            ),
            fotos:fotos_vehiculo (
                id,
                url,
                descripcion,
                es_principal,
                orden
            )
        `)
        .eq("id", id).match((usuario ? filtroEmpresa(usuario) : {}))
        .maybeSingle(); // sin fila -> null (el controlador responde 404), no un error

    if (error) throw error;
    return vehiculo;
};

export const subirArchivoACloudinary = (buffer, folder, resourceType = "auto", formato = null, publicId = null) => {
    return new Promise((resolve, reject) => {
        const esPdf = formato === "pdf";

        const opciones = {
            folder: `sisvia/${folder}`,
            resource_type: resourceType,
            ...(formato && { format: formato }),
            ...(publicId && { public_id: publicId, overwrite: true, invalidate: true }),
        };

        if (resourceType === "image" && !esPdf) {
            opciones.transformation = [
                { width: 1600, height: 1600, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
            ];
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            opciones,
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export const eliminarDeCloudinary = async (publicId, resourceType = "image") => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error("Error eliminando de Cloudinary:", err);
    }
};

export const extraerPublicId = (url) => {
    if (!url) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/);
    return match ? match[1] : null;
};
