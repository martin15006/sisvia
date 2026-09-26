// Controllers del catalogo del chequeo (pacto para-empresas, HU-12 a HU-14).
// Los permisos (base / propio / solo lectura) los decide el servicio con
// catalogoReglas.js; aca solo se validan los datos obligatorios.

import { listar, crear, actualizar, eliminar, cambiarBloqueo } from "../services/catalogoAdmin.service.js";
import { registrarActividad } from "../services/actividad.service.js";
import { nombreDeCatalogo } from "../services/actividadReglas.js";

// Los errores con status (403 sin permiso, 404, 400 nombre repetido) salen tal cual.
const responderError = (res, err, generico) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(generico, err);
    return res.status(500).json({ error: err.message || generico });
};

// Por cada tipo: clave de la respuesta, nombre para los mensajes y que se exige al crear.
const TIPOS = {
    categoria: {
        plural: "categorias", singular: "categoria", nombre: "Categoría",
        obligatorio: (b) => (!b.nombre || !b.nombre.trim() ? "El nombre es obligatorio" : null),
    },
    item: {
        plural: "items", singular: "item", nombre: "Ítem",
        obligatorio: (b) => (!b.categoria_id ? "categoria_id es obligatorio"
            : !b.descripcion || !b.descripcion.trim() ? "La descripcion es obligatoria" : null),
    },
    pregunta: {
        plural: "preguntas", singular: "pregunta", nombre: "Pregunta",
        obligatorio: (b) => (!b.pregunta || !b.pregunta.trim() ? "La pregunta es obligatoria"
            : !b.respuesta_apta ? "respuesta_apta es obligatoria ('si' o 'no')" : null),
    },
};

const handlers = (tipo) => {
    const t = TIPOS[tipo];
    // HU-19.2: el catalogo propio queda en la actividad de la empresa (el base,
    // que cambia el equipo SISVIA afuera, en su registro del equipo).
    const anotar = (req, res, accion, fila) => registrarActividad({
        usuario: req.usuario, res, tipo: "catalogo", accion,
        objetoId: fila?.id ?? null, objeto: nombreDeCatalogo(tipo, fila), detalles: { clase: tipo },
    });
    return {
        listar: async (req, res) => {
            try {
                const data = await listar(tipo, req.usuario);
                res.json({ [t.plural]: data, total: data.length });
            } catch (err) {
                responderError(res, err, `Error al listar ${t.plural}`);
            }
        },
        crear: async (req, res) => {
            try {
                const falta = t.obligatorio(req.body || {});
                if (falta) return res.status(400).json({ error: falta });
                const data = await crear(tipo, req.usuario, req.body);
                await anotar(req, res, "creado", data);
                res.status(201).json({ mensaje: `${t.nombre} creada`, [t.singular]: data });
            } catch (err) {
                responderError(res, err, `Error al crear ${t.singular}`);
            }
        },
        actualizar: async (req, res) => {
            try {
                const data = await actualizar(tipo, req.usuario, req.params.id, req.body || {});
                await anotar(req, res, "editado", data);
                res.json({ mensaje: `${t.nombre} actualizada`, [t.singular]: data });
            } catch (err) {
                responderError(res, err, `Error al actualizar ${t.singular}`);
            }
        },
        eliminar: async (req, res) => {
            try {
                const resultado = await eliminar(tipo, req.usuario, req.params.id);
                await anotar(req, res, resultado.tipo === "hard" ? "borrado" : "apagado", resultado.data);
                const mensaje = resultado.tipo === "hard"
                    ? `${t.nombre} eliminada permanentemente.`
                    : `${t.nombre} desactivada porque tiene historial en chequeos previos.`;
                res.json({ mensaje, tipo: resultado.tipo, [t.singular]: resultado.data });
            } catch (err) {
                responderError(res, err, `Error al eliminar ${t.singular}`);
            }
        },
    };
};

const categoria = handlers("categoria");
const item = handlers("item");
const pregunta = handlers("pregunta");

export const getCategorias = categoria.listar;
export const postCategoria = categoria.crear;
export const putCategoria = categoria.actualizar;
export const deleteCategoria = categoria.eliminar;
export const getItems = item.listar;
export const postItem = item.crear;
export const putItem = item.actualizar;
export const deleteItem = item.eliminar;
export const getPreguntas = pregunta.listar;
export const postPregunta = pregunta.crear;
export const putPregunta = pregunta.actualizar;
export const deletePregunta = pregunta.eliminar;

// POST /api/catalogo-admin/bloqueos/bloquear   { tipo, elemento_id }
// POST /api/catalogo-admin/bloqueos/desbloquear { tipo, elemento_id }
// HU-14: solo el superadmin dentro de una empresa. La contraseña y el registro
// los pone el middleware (RN-11); aca se suma que elemento fue.
export const postBloqueo = (bloquear) => async (req, res) => {
    try {
        const { tipo, elemento_id } = req.body || {};
        const { elemento, detalle } = await cambiarBloqueo(req.usuario, { tipo, elemento_id, bloquear });
        res.locals.auditoria = { elemento: detalle };
        res.json({
            mensaje: bloquear ? "Bloqueado para esta empresa" : "Desbloqueado para esta empresa",
            tipo,
            elemento_id: elemento.id,
            bloqueado: bloquear,
        });
    } catch (err) {
        responderError(res, err, "Error al cambiar el bloqueo");
    }
};
