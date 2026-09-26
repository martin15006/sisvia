// Servicio del catalogo del chequeo (admin) — pacto para-empresas, HU-12 a HU-14.
//
// Cada categoria, item y pregunta de aptitud es "base" (empresa_id vacio: lo
// maneja el superadmin desde afuera y lo ven todas las empresas) o "propio" de
// una empresa (lo maneja su Administrador de empresa, o el superadmin dentro de
// ella). Dentro de una empresa, el superadmin ademas bloquea elementos base.
// Soft delete (activo=false) para lo usado: no se rompen chequeos historicos.

import { supabase } from "../config/supabase.js";
import { rolEfectivo } from "./jerarquia.service.js";
import { empresaDelUsuario } from "./scope.service.js";
import { deLaEmpresa, baseODeLaEmpresa } from "./scopeReglas.js";
import {
    MENSAJES_CATALOGO,
    TIPOS_BLOQUEO,
    origenDe,
    setsDeBloqueos,
    permisoCatalogo,
} from "./catalogoReglas.js";

const TABLAS = {
    categoria: {
        tabla: "categorias_chequeo",
        campos: "id, nombre, descripcion, icono, orden, activo, empresa_id",
        orden: ["orden"],
    },
    item: {
        tabla: "items_chequeo",
        campos: "id, categoria_id, descripcion, descripcion_larga, orden, es_critico, aplica_a_tipos, activo, empresa_id",
        orden: ["categoria_id", "orden"],
    },
    pregunta: {
        tabla: "preguntas_aptitud",
        campos: "id, pregunta, respuesta_apta, orden, activo, empresa_id",
        orden: ["orden"],
    },
};

// Error con status HTTP, para que el controller lo devuelva tal cual.
const errorDe = (status, mensaje) => Object.assign(new Error(mensaje), { status });

// Quien pide y en que empresa esta mirando (null = el superadmin afuera: catalogo base).
const contexto = (usuario) => {
    const rol = rolEfectivo(usuario);
    return {
        rol,
        empresaId: empresaDelUsuario(usuario),
        empresaActiva: usuario.empresaActiva || null,
        empresaUsuario: usuario.empresa_id || null,
        superadminDentro: rol === "superadmin" && !!usuario.empresaActiva,
    };
};

const bloqueosDe = async (empresaId) => {
    if (!empresaId) return [];
    const { data, error } = await deLaEmpresa(supabase.from("bloqueos_catalogo").select("tipo, elemento_id"), empresaId);
    if (error) throw error;
    return data || [];
};

const permisoPara = (ctx, elemento = null) =>
    permisoCatalogo({ rol: ctx.rol, empresaActiva: ctx.empresaActiva, empresaUsuario: ctx.empresaUsuario, elemento });

const exigirPermiso = (ctx, elemento = null) => {
    const negado = permisoPara(ctx, elemento);
    if (negado) throw errorDe(negado.status, negado.mensaje);
};

// ---------------------------------------------------------------------------
// Listado (HU-12.2, HU-13.5, HU-14): cada elemento lleva de donde viene y que
// se puede hacer con el, para que la pantalla no decida permisos por su cuenta.
// ---------------------------------------------------------------------------
export const listar = async (tipo, usuario) => {
    const ctx = contexto(usuario);
    const t = TABLAS[tipo];
    let q = baseODeLaEmpresa(supabase.from(t.tabla).select(t.campos), ctx.empresaId);
    for (const col of t.orden) q = q.order(col, { ascending: true });
    const [{ data, error }, bloqueos, categorias] = await Promise.all([
        q,
        bloqueosDe(ctx.empresaId),
        tipo === "item"
            ? baseODeLaEmpresa(supabase.from("categorias_chequeo").select("id, activo, empresa_id"), ctx.empresaId)
            : Promise.resolve({ data: [] }),
    ]);
    if (error) throw error;
    const bloq = setsDeBloqueos(bloqueos);
    const catPorId = new Map((categorias.data || []).map((c) => [c.id, c]));

    return (data || []).flatMap((el) => {
        const origen = origenDe(el);
        let bloqueado = false;
        if (ctx.empresaId && origen === "base") {
            // Lo base apagado no lo ve ninguna empresa (HU-12.1 · CB-05).
            if (el.activo === false) return [];
            const cat = tipo === "item" ? catPorId.get(el.categoria_id) : null;
            if (cat && cat.activo === false) return [];
            bloqueado = bloq[tipo].has(el.id) || (tipo === "item" && bloq.categoria.has(el.categoria_id));
            // La empresa no ve lo bloqueado (HU-14.1); el superadmin adentro si, para desbloquearlo.
            if (bloqueado && !ctx.superadminDentro) return [];
        }
        return [{
            ...el,
            origen,
            editable: !permisoPara(ctx, el),
            bloqueado,
            // Un item base se bloquea solo; si lo bloquea su categoria, se desbloquea desde ella.
            puede_bloquear: ctx.superadminDentro && origen === "base"
                && !(tipo === "item" && bloq.categoria.has(el.categoria_id)),
        }];
    });
};

// ---------------------------------------------------------------------------
// Validaciones de datos
// ---------------------------------------------------------------------------

// CB-08: una categoria no repite el nombre de una base ni de otra de su empresa.
// Una base nueva no repite ninguna (asi ninguna empresa ve dos con el mismo nombre).
const nombreDeCategoriaOcupado = async (ctx, nombre, excepto = null) => {
    let q = supabase.from("categorias_chequeo").select("id, nombre, empresa_id");
    if (ctx.empresaId) q = baseODeLaEmpresa(q, ctx.empresaId);
    const { data, error } = await q;
    if (error) throw error;
    const buscado = nombre.trim().toLowerCase();
    return (data || []).some((c) => c.id !== excepto && c.nombre.trim().toLowerCase() === buscado);
};

// La categoria de un item: base (para items base o propios) o propia de la misma empresa.
const validarCategoriaDeItem = async (ctx, categoriaId, empresaDelItem) => {
    const { data: cat } = await supabase.from("categorias_chequeo").select("id, empresa_id, activo").eq("id", categoriaId).maybeSingle();
    const sirve = cat && (cat.empresa_id === null || (empresaDelItem && cat.empresa_id === empresaDelItem));
    if (!sirve) throw errorDe(400, MENSAJES_CATALOGO.categoriaNoValida);
    if (ctx.empresaId && cat.empresa_id === null) {
        const bloq = setsDeBloqueos(await bloqueosDe(ctx.empresaId));
        if (bloq.categoria.has(cat.id) && !ctx.superadminDentro) throw errorDe(400, MENSAJES_CATALOGO.categoriaNoValida);
    }
};

const TIPOS_VEHICULO = ["automovil", "motocicleta", "motocarro", "camion", "camioneta", "tractocamion", "microbus", "buseta", "bus"];
// Vacio = aplica a todos los vehiculos (HU-15.3).
const limpiarTipos = (tipos) => {
    if (!Array.isArray(tipos)) return null;
    const validos = tipos.filter((t) => TIPOS_VEHICULO.includes(t));
    return validos.length ? validos : null;
};

const obtener = async (tipo, id) => {
    const t = TABLAS[tipo];
    const { data, error } = await supabase.from(t.tabla).select(t.campos).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw errorDe(404, "Elemento no encontrado");
    return data;
};

// ---------------------------------------------------------------------------
// Crear, editar y eliminar
// ---------------------------------------------------------------------------
export const crear = async (tipo, usuario, datos) => {
    const ctx = contexto(usuario);
    exigirPermiso(ctx);
    const empresa_id = ctx.empresaId; // null = base (superadmin afuera)
    const t = TABLAS[tipo];
    let fila;

    if (tipo === "categoria") {
        if (await nombreDeCategoriaOcupado(ctx, datos.nombre)) throw errorDe(400, MENSAJES_CATALOGO.nombreRepetido);
        fila = { nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null, icono: datos.icono ?? "", orden: datos.orden || 999 };
    } else if (tipo === "item") {
        await validarCategoriaDeItem(ctx, datos.categoria_id, empresa_id);
        fila = {
            categoria_id: datos.categoria_id,
            descripcion: datos.descripcion.trim(),
            descripcion_larga: datos.descripcion_larga?.trim() || null,
            orden: datos.orden || 999,
            es_critico: !!datos.es_critico,
            aplica_a_tipos: limpiarTipos(datos.aplica_a_tipos),
        };
    } else {
        if (!["si", "no"].includes(datos.respuesta_apta)) throw errorDe(400, "respuesta_apta debe ser 'si' o 'no'");
        fila = { pregunta: datos.pregunta.trim(), respuesta_apta: datos.respuesta_apta, orden: datos.orden || 999 };
    }

    const { data, error } = await supabase.from(t.tabla).insert({ ...fila, activo: true, empresa_id }).select(t.campos).single();
    if (error) {
        if (error.code === "23505") throw errorDe(400, MENSAJES_CATALOGO.nombreRepetido);
        throw error;
    }
    return data;
};

export const actualizar = async (tipo, usuario, id, datos) => {
    const ctx = contexto(usuario);
    const actual = await obtener(tipo, id);
    exigirPermiso(ctx, actual);
    const t = TABLAS[tipo];
    const cambios = {};

    if (tipo === "categoria") {
        if (datos.nombre !== undefined) {
            if (await nombreDeCategoriaOcupado(ctx, datos.nombre, actual.id)) throw errorDe(400, MENSAJES_CATALOGO.nombreRepetido);
            cambios.nombre = datos.nombre.trim();
        }
        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion?.trim() || null;
        if (datos.icono !== undefined) cambios.icono = datos.icono;
    } else if (tipo === "item") {
        if (datos.categoria_id !== undefined && datos.categoria_id !== actual.categoria_id) {
            await validarCategoriaDeItem(ctx, datos.categoria_id, actual.empresa_id);
            cambios.categoria_id = datos.categoria_id;
        }
        if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim();
        if (datos.descripcion_larga !== undefined) cambios.descripcion_larga = datos.descripcion_larga?.trim() || null;
        if (datos.es_critico !== undefined) cambios.es_critico = !!datos.es_critico;
        if (datos.aplica_a_tipos !== undefined) cambios.aplica_a_tipos = limpiarTipos(datos.aplica_a_tipos);
    } else {
        if (datos.pregunta !== undefined) cambios.pregunta = datos.pregunta.trim();
        if (datos.respuesta_apta !== undefined) {
            if (!["si", "no"].includes(datos.respuesta_apta)) throw errorDe(400, "respuesta_apta debe ser 'si' o 'no'");
            cambios.respuesta_apta = datos.respuesta_apta;
        }
    }
    if (datos.orden !== undefined) cambios.orden = datos.orden;
    if (datos.activo !== undefined) cambios.activo = datos.activo === true;

    const { data, error } = await supabase.from(t.tabla).update(cambios).eq("id", id).select(t.campos).single();
    if (error) {
        if (error.code === "23505") throw errorDe(400, MENSAJES_CATALOGO.nombreRepetido);
        throw error;
    }
    return data;
};

const tieneRespuestas = async (tabla, columna, ids) => {
    if (!ids.length) return false;
    const { count, error } = await supabase.from(tabla).select("id", { count: "exact", head: true }).in(columna, ids);
    if (error) throw error;
    return (count || 0) > 0;
};

// HU-13.3-4: lo usado en algun chequeo solo se apaga; lo que nunca se uso, se borra.
export const eliminar = async (tipo, usuario, id) => {
    const ctx = contexto(usuario);
    const actual = await obtener(tipo, id);
    exigirPermiso(ctx, actual);
    const t = TABLAS[tipo];

    const apagar = async () => {
        const { data, error } = await supabase.from(t.tabla).update({ activo: false }).eq("id", id).select(t.campos).single();
        if (error) throw error;
        return { tipo: "soft", data, motivo: "tiene_historial" };
    };
    const borrar = async () => {
        const { data, error } = await supabase.from(t.tabla).delete().eq("id", id).select(t.campos).single();
        if (error) throw error;
        return { tipo: "hard", data };
    };

    if (tipo === "item") return (await tieneRespuestas("respuestas_chequeo", "item_id", [actual.id])) ? apagar() : borrar();
    if (tipo === "pregunta") return (await tieneRespuestas("respuestas_aptitud", "pregunta_id", [actual.id])) ? apagar() : borrar();

    // Categoria: solo se borra si no tiene items de nadie con historial y no hay
    // items de otras empresas adentro. Si se apaga, se apagan sus items del mismo
    // catalogo (los propios de las empresas en una categoria base no se tocan).
    const { data: items, error } = await supabase.from("items_chequeo").select("id, empresa_id").eq("categoria_id", id);
    if (error) throw error;
    const mismos = (items || []).filter((i) => i.empresa_id === actual.empresa_id);
    const ajenos = (items || []).length - mismos.length;
    if (ajenos > 0 || (await tieneRespuestas("respuestas_chequeo", "item_id", mismos.map((i) => i.id)))) {
        if (mismos.length) await supabase.from("items_chequeo").update({ activo: false }).in("id", mismos.map((i) => i.id));
        return apagar();
    }
    if (mismos.length) {
        const { error: errItems } = await supabase.from("items_chequeo").delete().in("id", mismos.map((i) => i.id));
        if (errItems) throw errItems;
    }
    return borrar();
};

// ---------------------------------------------------------------------------
// HU-14: el superadmin, dentro de una empresa, le bloquea o desbloquea un
// elemento base. Devuelve una linea para el registro de la empresa (RNF-05).
// ---------------------------------------------------------------------------
export const cambiarBloqueo = async (usuario, { tipo, elemento_id, bloquear }) => {
    const ctx = contexto(usuario);
    if (!ctx.superadminDentro) throw errorDe(403, "Solo el equipo SISVIA, dentro de la empresa, bloquea elementos base.");
    if (!TIPOS_BLOQUEO.includes(tipo)) throw errorDe(400, "Tipo de elemento no válido");
    const elemento = await obtener(tipo, elemento_id);
    if (elemento.empresa_id) throw errorDe(400, "Solo se bloquean elementos del catálogo base.");

    if (bloquear) {
        const { error } = await supabase.from("bloqueos_catalogo").upsert(
            { empresa_id: ctx.empresaId, tipo, elemento_id: elemento.id, bloqueado_por: usuario.id },
            { onConflict: "empresa_id,tipo,elemento_id", ignoreDuplicates: true }
        );
        if (error) throw error;
    } else {
        const { error } = await deLaEmpresa(supabase.from("bloqueos_catalogo").delete(), ctx.empresaId)
            .eq("tipo", tipo).eq("elemento_id", elemento.id);
        if (error) throw error;
    }
    const nombre = elemento.nombre || elemento.descripcion || elemento.pregunta;
    const etiqueta = { categoria: "Categoría", item: "Ítem", pregunta: "Pregunta de aptitud" }[tipo];
    return { elemento, detalle: `${etiqueta}: ${nombre}` };
};
