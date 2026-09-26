// Endpoints geograficos: regiones, departamentos, ciudades y sedes.
//
// Multinivel (#102): cada listado se filtra por el SCOPE territorial del admin
// que consulta (scope.service.js). Asi, al crear un usuario, los selectores de
// territorio solo muestran lo que ese admin puede asignar:
//   - superadmin            -> todo el pais
//   - admin_departamental   -> su departamento (sus ciudades / sedes)
//   - admin_sede / admin  -> su sede
//
// Los filtros opcionales (?region_id=, ?departamento_id=, ?ciudad_id=) permiten
// que el frontend encadene los selectores (region -> depto -> ciudad -> sede).

import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { verificarToken, soloAdmin, requiereRol } from "../middlewares/auth.middleware.js";
import { obtenerScope } from "../services/scope.service.js";
import { empresaDelUsuario } from "../services/scope.service.js";
import { filtroEmpresa } from "../services/scopeReglas.js";
import { empresaDeSede } from "../services/scope.service.js";
import { verificarLimite } from "../services/empresas.service.js";
import { CODIGO_LIMITE } from "../services/limitesReglas.js";
import { registrarActividad } from "../services/actividad.service.js";

const router = Router();

router.use(verificarToken);
router.use(soloAdmin);

// UUID imposible: fuerza "0 resultados" cuando un admin no tiene scope en ese nivel.
const UUID_IMPOSIBLE = "00000000-0000-0000-0000-000000000000";

// Aplica .in('id', ids) salvo que el scope sea global (superadmin ve todo).
const filtrarPorScope = (query, scope, ids, { geografiaCompartida = false } = {}) => {
    if (scope.tipo === "global") return query;
    // Regiones, departamentos y ciudades son de todos (RN-02): el Administrador de
    // empresa los ve completos para poder abrir una sede en cualquier ciudad.
    if (geografiaCompartida && scope.todaLaEmpresa) return query;
    return query.in("id", ids.length > 0 ? ids : [UUID_IMPOSIBLE]);
};

// GET /api/geo/regiones
// Regiones dentro del scope (en la practica, solo el superadmin las necesita,
// porque solo el crea admins regionales).
router.get("/regiones", async (req, res) => {
    try {
        const scope = await obtenerScope(req.usuario);
        let q = supabase.from("regiones").select("id, nombre").order("nombre", { ascending: true });
        q = filtrarPorScope(q, scope, scope.regionIds || [], { geografiaCompartida: true });
        const { data, error } = await q;
        if (error) throw error;
        res.json({ regiones: data || [] });
    } catch (err) {
        console.error("Error listando regiones:", err);
        res.status(500).json({ error: err.message || "Error al listar regiones" });
    }
});

// GET /api/geo/departamentos?region_id=...
router.get("/departamentos", async (req, res) => {
    try {
        const { region_id } = req.query;
        const scope = await obtenerScope(req.usuario);
        let q = supabase
            .from("departamentos")
            .select("id, nombre, region_id")
            .order("nombre", { ascending: true });
        if (region_id) q = q.eq("region_id", region_id);
        q = filtrarPorScope(q, scope, scope.departamentoIds || [], { geografiaCompartida: true });
        const { data, error } = await q;
        if (error) throw error;
        res.json({ departamentos: data || [] });
    } catch (err) {
        console.error("Error listando departamentos:", err);
        res.status(500).json({ error: err.message || "Error al listar departamentos" });
    }
});

// GET /api/geo/ciudades?departamento_id=...
// Supabase devuelve como maximo 1.000 filas por consulta y Colombia tiene 1.122
// municipios: la lista completa se pide por paginas.
const PAGINA = 1000;
const traerTodas = async (armar) => {
    const filas = [];
    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await armar().range(desde, desde + PAGINA - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < PAGINA) return filas;
    }
};

router.get("/ciudades", async (req, res) => {
    try {
        const { departamento_id } = req.query;
        const scope = await obtenerScope(req.usuario);
        const armar = () => {
            let q = supabase
                .from("ciudades")
                .select("id, nombre, departamento_id")
                .order("nombre", { ascending: true })
                .order("id", { ascending: true }); // orden estable entre paginas
            if (departamento_id) q = q.eq("departamento_id", departamento_id);
            return filtrarPorScope(q, scope, scope.ciudadIds || [], { geografiaCompartida: true });
        };
        res.json({ ciudades: await traerTodas(armar) });
    } catch (err) {
        console.error("Error listando ciudades:", err);
        res.status(500).json({ error: err.message || "Error al listar ciudades" });
    }
});

// GET /api/geo/sedes?ciudad_id=...&incluir_inactivos=true
// Devuelve la lista de sedes activas DENTRO del scope, con datos
// de ciudad y departamento para mostrar el contexto al admin en el dropdown.
// `incluir_inactivos=true` lo usa la pantalla de gestion de geografia (para
// poder reactivar sedes); los selectores normales solo ven activos.
router.get("/sedes", async (req, res) => {
    try {
        const { ciudad_id, incluir_inactivos } = req.query;
        const scope = await obtenerScope(req.usuario);
        let q = supabase
            .from("sedes")
            .select(`
                id, nombre, direccion, activo,
                ciudad:ciudades (
                    id, nombre,
                    departamento:departamentos (id, nombre)
                )
            `)
            .order("nombre", { ascending: true });
        if (incluir_inactivos !== "true") q = q.eq("activo", true);
        if (ciudad_id) q = q.eq("ciudad_id", ciudad_id);
        q = filtrarPorScope(q, scope, scope.sedeIds || []);

        const { data, error } = await q;
        if (error) throw error;

        // Aplanar la respuesta para que sea mas comoda en el frontend
        const sedes = (data || []).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            direccion: c.direccion,
            activo: c.activo,
            ciudad_id: c.ciudad?.id || null,
            ciudad: c.ciudad?.nombre || null,
            departamento_id: c.ciudad?.departamento?.id || null,
            departamento: c.ciudad?.departamento?.nombre || null,
        }));

        res.json({ sedes, total: sedes.length });
    } catch (err) {
        console.error("Error listando sedes:", err);
        res.status(500).json({ error: err.message || "Error al listar sedes" });
    }
});

// ============================================================================
// ESCRITURA (gestion de geografia, #116) — Administrador general y Director Regional
// ============================================================================
// Regiones y departamentos son la division fija de Colombia: NO se editan.
// Lo administrable es: agregar ciudades/municipios y crear/editar/activar
// sedes. No hay DELETE: las sedes se desactivan (preserva
// historial de vehiculos/chequeos); las ciudades solo se crean.
//
// Quien puede escribir:
//   - superadmin (Administrador general): en todo el pais.
//   - admin_departamental (Director Regional): SOLO dentro de su propio
//     departamento (su Regional). Se valida con el scope en cada endpoint.

// POST /api/geo/ciudades  { nombre, departamento_id }
router.post("/ciudades", requiereRol("superadmin"), async (req, res) => {
    try {
        const { nombre, departamento_id } = req.body;
        const nombreLimpio = (nombre || "").trim();
        if (!nombreLimpio || !departamento_id) {
            return res.status(400).json({ error: "El nombre y el departamento son obligatorios" });
        }

        // Scope: un Director Regional solo crea ciudades en SU departamento.
        const scope = await obtenerScope(req.usuario);
        if (scope.tipo !== "global" && !(scope.departamentoIds || []).includes(departamento_id)) {
            return res.status(403).json({ error: "Solo puedes crear ciudades en tu propia regional." });
        }

        const { data, error } = await supabase
            .from("ciudades")
            .insert({ nombre: nombreLimpio, departamento_id })
            .select("id, nombre, departamento_id")
            .single();

        if (error) {
            // 23505 = violacion de UNIQUE(nombre, departamento_id)
            if (error.code === "23505") {
                return res.status(400).json({ error: "Esa ciudad ya existe en ese departamento" });
            }
            // 23503 = FK invalida (departamento inexistente)
            if (error.code === "23503") {
                return res.status(400).json({ error: "El departamento seleccionado no existe" });
            }
            throw error;
        }

        res.status(201).json({ ciudad: data });
    } catch (err) {
        console.error("Error creando ciudad:", err);
        res.status(500).json({ error: err.message || "Error al crear la ciudad" });
    }
});

// POST /api/geo/sedes  { nombre, ciudad_id, direccion? }
router.post("/sedes", requiereRol("superadmin", "admin_empresa"), async (req, res) => {
    try {
        const { nombre, ciudad_id, direccion } = req.body;
        const nombreLimpio = (nombre || "").trim();
        if (!nombreLimpio || !ciudad_id) {
            return res.status(400).json({ error: "El nombre y la ciudad son obligatorios" });
        }

        // Scope: un Director Regional solo crea sedes en una ciudad de su depto.
        const scope = await obtenerScope(req.usuario);
        if (scope.tipo !== "global" && !scope.todaLaEmpresa) {
            return res.status(403).json({ error: "Las sedes las crea el Administrador de empresa." });
        }

        // La sede es de la empresa de quien la crea (el superadmin, de la empresa
        // a la que entro: HU-16; afuera no crea sedes).
        const empresaNueva = empresaDelUsuario(req.usuario);

        // La tabla no tiene UNIQUE(nombre, ciudad_id): verificar duplicado a mano (dentro de la empresa)
        const { data: existente } = await supabase
            .from("sedes")
            .select("id")
            .eq("ciudad_id", ciudad_id)
            .ilike("nombre", nombreLimpio)
            .match(filtroEmpresa(req.usuario))
            .maybeSingle();
        if (existente) {
            return res.status(400).json({ error: "Ya existe una sede con ese nombre en esa ciudad" });
        }

        // HU-02.2 · RN-03: la sede nueva no puede pasar el limite de la empresa.
        const limite = await verificarLimite(empresaNueva, "sedes");
        if (limite) return res.status(403).json({ error: limite, codigo: CODIGO_LIMITE });

        const { data, error } = await supabase
            .from("sedes")
            .insert({ nombre: nombreLimpio, ciudad_id, direccion: (direccion || "").trim() || null, ...(empresaNueva ? { empresa_id: empresaNueva } : {}) })
            .select("id, nombre, ciudad_id, direccion, activo")
            .single();

        if (error) {
            if (error.code === "23503") {
                return res.status(400).json({ error: "La ciudad seleccionada no existe" });
            }
            throw error;
        }

        // HU-19.2: queda en la actividad de la empresa.
        await registrarActividad({ usuario: req.usuario, res, tipo: "sede", accion: "creada", objetoId: data.id, objeto: data.nombre });
        res.status(201).json({ sede: data });
    } catch (err) {
        console.error("Error creando sede:", err);
        res.status(500).json({ error: err.message || "Error al crear la sede" });
    }
});

// PATCH /api/geo/sedes/:id  { nombre?, direccion?, activo? }
router.patch("/sedes/:id", requiereRol("superadmin", "admin_empresa"), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, activo } = req.body;

        // Scope: un Director Regional solo edita sedes de su regional.
        const scope = await obtenerScope(req.usuario);
        // Una sede de otra empresa responde como si no existiera (RN-01).
        if (scope.tipo !== "global" && !(scope.sedeIds || []).includes(id)) {
            return res.status(404).json({ error: "Sede no encontrada" });
        }

        const cambios = {};
        if (nombre !== undefined) {
            const nombreLimpio = (nombre || "").trim();
            if (!nombreLimpio) {
                return res.status(400).json({ error: "El nombre no puede quedar vacio" });
            }
            cambios.nombre = nombreLimpio;
        }
        if (direccion !== undefined) cambios.direccion = (direccion || "").trim() || null;
        if (activo !== undefined) cambios.activo = activo === true;

        // Como estaba antes: para el limite y para contar el cambio en la actividad.
        const { data: actual } = await supabase.from("sedes").select("activo").eq("id", id).maybeSingle();

        // HU-02.2 · RN-03: reactivar una sede tambien cuenta para el limite.
        if (cambios.activo === true) {
            if (actual && !actual.activo) {
                const limite = await verificarLimite(await empresaDeSede(id), "sedes");
                if (limite) return res.status(403).json({ error: limite, codigo: CODIGO_LIMITE });
            }
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: "No hay cambios para aplicar" });
        }

        const { data, error } = await supabase
            .from("sedes")
            .update(cambios)
            .eq("id", id)
            .select("id, nombre, ciudad_id, direccion, activo")
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Sede no encontrado" });

        // HU-19.2: queda en la actividad de la empresa.
        const accion = actual && cambios.activo === false && actual.activo ? "desactivada"
            : actual && cambios.activo === true && !actual.activo ? "reactivada" : "editada";
        await registrarActividad({ usuario: req.usuario, res, tipo: "sede", accion, objetoId: data.id, objeto: data.nombre });
        res.json({ sede: data });
    } catch (err) {
        console.error("Error actualizando sede:", err);
        res.status(500).json({ error: err.message || "Error al actualizar la sede" });
    }
});

export default router;
