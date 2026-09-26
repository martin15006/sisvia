import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MENSAJES_ACTIVIDAD,
    POR_PAGINA,
    FILTROS_TIPO,
    puedeVerActividad,
    puedeVerRegistroEquipo,
    viajaEnSoporte,
    describirActividad,
    filaParaMostrar,
    nombreDeCatalogo,
    leerFiltros,
    leerCursor,
    cursorDe,
    condicionesDeConsulta,
    inicioDelDiaColombia,
    armarPagina,
} from "../src/services/actividadReglas.js";

const EMPRESA = "aaaaaaaa-0000-4000-8000-000000000001";
const ID = "bbbbbbbb-0000-4000-8000-000000000002";

test("HU-19.5 · solo el Administrador de empresa (y el equipo SISVIA adentro) ve la Actividad: texto exacto", () => {
    assert.equal(puedeVerActividad({ rol: "admin_empresa" }), true);
    assert.equal(puedeVerActividad({ rol: "superadmin", empresaActiva: EMPRESA }), true);
    for (const u of [{ rol: "superadmin" }, { rol: "admin_departamental" }, { rol: "admin_sede" }, { rol: "admin" }, { rol: "conductor" }, { rol: "conductor", es_pool: true, suplencia: {} }, null]) {
        assert.equal(puedeVerActividad(u), false, JSON.stringify(u));
    }
    assert.equal(MENSAJES_ACTIVIDAD.soloAdminEmpresa, "Solo el Administrador de empresa ve la actividad de la empresa.");
});

test("HU-20.2 · solo el dueño ve el Registro del equipo: texto exacto", () => {
    assert.equal(puedeVerRegistroEquipo({ rol: "superadmin", es_dueno: true }), true);
    assert.equal(puedeVerRegistroEquipo({ rol: "superadmin", es_dueno: false }), false);
    assert.equal(puedeVerRegistroEquipo({ rol: "superadmin" }), false);
    assert.equal(puedeVerRegistroEquipo({ rol: "admin_empresa", es_dueno: true }), false, "la marca sola no alcanza");
    assert.equal(MENSAJES_ACTIVIDAD.soloDueno, "Solo el dueño de SISVIA ve el registro del equipo.");
});

test("HU-19.3 · lo del equipo SISVIA adentro viaja en su registro de soporte, no se escribe dos veces", () => {
    assert.equal(viajaEnSoporte({ rol: "superadmin", empresaActiva: EMPRESA }), true);
    assert.equal(viajaEnSoporte({ rol: "superadmin" }), false, "afuera (catálogo base) se escribe directo");
    assert.equal(viajaEnSoporte({ rol: "admin_empresa", empresaActiva: EMPRESA }), false);
});

test("HU-19.1 · vehículos, en palabras", () => {
    const v = (accion, detalles = {}) => describirActividad({ tipo: "vehiculo", accion, objeto: "ABC123", detalles });
    assert.equal(v("creado"), "Creó el vehículo ABC123");
    assert.equal(v("actualizado", ["color"]), "Editó el vehículo ABC123");
    assert.equal(v("desactivado"), "Desactivó el vehículo ABC123");
    assert.equal(v("reactivado"), "Reactivó el vehículo ABC123");
    assert.equal(v("eliminado"), "Eliminó el vehículo ABC123");
    assert.equal(v("fotos_agregadas", { cantidad: 1 }), "Subió 1 foto al vehículo ABC123");
    assert.equal(v("fotos_agregadas", { cantidad: 3 }), "Subió 3 fotos al vehículo ABC123");
    assert.equal(v("foto_eliminada"), "Eliminó una foto del vehículo ABC123");
    assert.equal(v("runt_actualizado"), "Subió el RUNT del vehículo ABC123");
    assert.equal(v("runt_eliminado"), "Eliminó el RUNT del vehículo ABC123");
    assert.equal(v("baja_traspaso", { motivo: "Vendido a Transportes Sur" }), "Dio de baja por traspaso el vehículo ABC123 · Motivo: Vendido a Transportes Sur");
});

test("HU-19.1 · usuarios, en palabras: el ejemplo del criterio, el cambio de rol y lo demás", () => {
    const u = (accion, detalles = {}, tipo = "usuario") => describirActividad({ tipo, accion, objeto: "Ana Pérez", detalles });
    assert.equal(u("creado", { rol: "admin_sede" }), "Creó a Ana Pérez · Coordinador de sede");
    assert.equal(u("creado", { rol: "conductor", es_pool: true }), "Creó a Ana Pérez · Pool de transporte");
    assert.equal(u("actualizado", { rol: "admin_sede", rol_anterior: "conductor" }), "Cambió el rol de Ana Pérez: Conductor → Coordinador de sede");
    assert.equal(u("actualizado", { rol: "conductor", telefono: "300" }), "Editó a Ana Pérez", "sin rol anterior no se inventa un cambio");
    assert.equal(u("actualizado", { rol: "conductor", rol_anterior: "conductor" }), "Editó a Ana Pérez");
    assert.equal(u("desactivado"), "Desactivó a Ana Pérez");
    assert.equal(u("reactivado"), "Reactivó a Ana Pérez");
    assert.equal(u("eliminado"), "Eliminó a Ana Pérez");
    assert.equal(u("password_reseteado"), "Reseteó la contraseña de Ana Pérez");
    assert.equal(u("cambio_correo"), "Cambió el correo de Ana Pérez");
    assert.equal(u("cambio_cedula"), "Cambió la cédula de Ana Pérez");
    assert.equal(u("traspaso_dueno", {}, "equipo"), "Pasó la marca de dueño a Ana Pérez");
    assert.equal(u("dio_marca", {}, "equipo"), "Le dio la marca de dueño a Ana Pérez");
    assert.equal(u("dejo_marca", {}, "equipo"), "Se quitó la marca de dueño");
});

test("HU-19.2 · sedes y catálogo propio, en palabras", () => {
    const s = (accion) => describirActividad({ tipo: "sede", accion, objeto: "Sede Norte" });
    assert.equal(s("creada"), "Creó la sede Sede Norte");
    assert.equal(s("editada"), "Editó la sede Sede Norte");
    assert.equal(s("desactivada"), "Desactivó la sede Sede Norte");
    assert.equal(s("reactivada"), "Reactivó la sede Sede Norte");
    const c = (accion, clase, objeto) => describirActividad({ tipo: "catalogo", accion, objeto, detalles: { clase } });
    assert.equal(c("creado", "categoria", "Luces"), "Creó la categoría «Luces»");
    assert.equal(c("editado", "item", "Revisar frenos"), "Editó el ítem «Revisar frenos»");
    assert.equal(c("apagado", "item", "Revisar frenos"), "Desactivó el ítem «Revisar frenos» (tiene historial en chequeos)");
    assert.equal(c("borrado", "pregunta", "¿Dormiste bien?"), "Eliminó la pregunta de aptitud «¿Dormiste bien?»");
    assert.equal(nombreDeCatalogo("categoria", { nombre: "Luces" }), "Luces");
    assert.equal(nombreDeCatalogo("item", { descripcion: "Frenos" }), "Frenos");
    assert.equal(nombreDeCatalogo("pregunta", { pregunta: "¿Bien?" }), "¿Bien?");
});

test("HU-19.3 · lo del equipo SISVIA: la empresa, el plan y cada cambio con contraseña", () => {
    const e = (accion, detalles = {}) => describirActividad({ tipo: "empresa", accion, empresa_nombre: "Transportes Sur", objeto: "Transportes Sur", detalles });
    assert.equal(e("creada"), "Creó la empresa Transportes Sur");
    assert.equal(e("entro"), "Entró a la empresa Transportes Sur");
    assert.equal(e("exportada"), "Exportó todo de Transportes Sur");
    assert.equal(e("desactivada"), "Desactivó la empresa Transportes Sur");
    assert.equal(e("reactivada"), "Reactivó la empresa Transportes Sur");
    assert.equal(e("eliminada"), "Eliminó la empresa Transportes Sur");
    assert.equal(e("limites", { limite_sedes: { antes: 3, despues: 5 }, limite_vehiculos: { antes: 10, despues: 20 } }),
        "Cambió el plan de Transportes Sur: sedes 3 → 5 · vehículos 10 → 20");
    // Su registro de soporte, con lo que toco si se sabe
    assert.equal(describirActividad({ tipo: "sede", accion: "soporte", objeto: "Sede Norte", detalles: { que: "Editó una sede" } }), "Editó una sede · Sede Norte");
    assert.equal(describirActividad({ tipo: "empresa", accion: "soporte", objeto: null, detalles: { que: "Activó una suplencia" } }), "Activó una suplencia");
});

test("HU-19.1 · CB-24 · a la pantalla va quién, su cargo, qué en palabras y cuándo; los detalles crudos no", () => {
    const fila = {
        id: ID, created_at: "2026-09-21T15:04:05.123456+00:00", actor_nombre: "Persona Ya Eliminada", actor_cargo: "Conductor",
        de_sisvia: false, tipo: "vehiculo", accion: "creado", objeto: "ABC123", detalles: { placa: "ABC123", secreto: "x" }, empresa_nombre: "Sur",
    };
    const m = filaParaMostrar(fila);
    assert.deepEqual(m, {
        id: ID, cuando: "2026-09-21T15:04:05.123456+00:00", quien: "Persona Ya Eliminada", cargo: "Conductor",
        de_sisvia: false, tipo: "vehiculo", texto: "Creó el vehículo ABC123", empresa: "Sur",
    });
    assert.equal("detalles" in m, false);
});

test("HU-19.4 · filtros por tipo: los cinco, y uno inventado se rechaza", () => {
    assert.deepEqual(Object.values(FILTROS_TIPO), ["Vehículos", "Usuarios", "Sedes", "Catálogo", "Equipo SISVIA"]);
    for (const tipo of Object.keys(FILTROS_TIPO)) assert.equal(leerFiltros({ tipo }).filtros.tipo, tipo);
    assert.equal(leerFiltros({ tipo: "chequeos" }).error, "Ese tipo de actividad no existe.");
    assert.equal(leerFiltros({ tipo: "toString" }).error, "Ese tipo de actividad no existe.", "no acepta propiedades heredadas");
});

test("HU-19.4 · fechas: válidas, inválidas y al revés", () => {
    assert.deepEqual(leerFiltros({ desde: "2026-09-01", hasta: "2026-09-01" }).filtros.desde, "2026-09-01", "el mismo día sirve");
    assert.equal(leerFiltros({ desde: "2026-02-30" }).error, "La fecha no es válida.");
    assert.equal(leerFiltros({ hasta: "21/09/2026" }).error, "La fecha no es válida.");
    assert.equal(leerFiltros({ desde: "2026-09-02", hasta: "2026-09-01" }).error, 'La fecha "desde" es posterior a "hasta".');
    assert.equal(inicioDelDiaColombia("2026-09-21"), "2026-09-21T05:00:00.000Z", "medianoche de Colombia");
});

test("HU-19.4 · la persona se busca por su nombre (sin comodines colados) y se corta a 100", () => {
    const { filtros } = leerFiltros({ persona: "  ana_100%  " });
    assert.equal(filtros.persona, "ana_100%");
    const c = condicionesDeConsulta({ empresaId: EMPRESA }, filtros);
    assert.deepEqual(c.find(([op]) => op === "ilike"), ["ilike", "actor_nombre", "%ana\\_100\\%%"]);
    assert.equal(leerFiltros({ persona: "x".repeat(150) }).filtros.persona.length, 100);
});

test("HU-19.5 · la consulta de una empresa siempre va atada a esa empresa y sin lo del equipo", () => {
    const { filtros } = leerFiltros({});
    const c = condicionesDeConsulta({ empresaId: EMPRESA }, filtros);
    // La empresa va por el filtro único (RNF-03), que con null no devuelve nada (scope.test)
    assert.deepEqual(c, [["deLaEmpresa", EMPRESA], ["neq", "tipo", "equipo"]]);
    assert.deepEqual(condicionesDeConsulta({}, filtros)[0], ["deLaEmpresa", null], "sin empresa: el filtro único la trata como «ninguna»");
    // El filtro "Equipo SISVIA" y uno por tipo
    assert.deepEqual(condicionesDeConsulta({ empresaId: EMPRESA }, leerFiltros({ tipo: "sisvia" }).filtros)[2], ["eq", "de_sisvia", true]);
    assert.deepEqual(condicionesDeConsulta({ empresaId: EMPRESA }, leerFiltros({ tipo: "sedes" }).filtros)[2], ["eq", "tipo", "sede"]);
    // Fechas: desde el inicio del dia hasta el inicio del siguiente (en Colombia)
    const f = condicionesDeConsulta({ empresaId: EMPRESA }, leerFiltros({ desde: "2026-09-01", hasta: "2026-09-30" }).filtros);
    assert.deepEqual(f.slice(2), [["gte", "created_at", "2026-09-01T05:00:00.000Z"], ["lt", "created_at", "2026-10-01T05:00:00.000Z"]]);
});

test("HU-20.1 · el Registro del equipo: solo lo del equipo SISVIA, filtrable por empresa y persona", () => {
    const { filtros } = leerFiltros({ empresa: "Sur", persona: "Sandra", tipo: "vehiculos" }, { equipo: true });
    assert.equal(filtros.tipo, null, "el registro no filtra por tipo");
    assert.deepEqual(condicionesDeConsulta({ equipo: true }, filtros), [
        ["eq", "de_sisvia", true],
        ["ilike", "actor_nombre", "%Sandra%"],
        ["ilike", "empresa_nombre", "%Sur%"],
    ]);
});

test("HU-19.4 · de a 50 con «Ver más»: 50 no tiene siguiente, 51 sí, y el cursor conserva los microsegundos", () => {
    const filas = (n) => Array.from({ length: n }, (_, i) => ({
        id: `bbbbbbbb-0000-4000-8000-${String(i).padStart(12, "0")}`,
        created_at: `2026-09-21T10:00:00.${String(999999 - i).padStart(6, "0")}+00:00`,
        actor_nombre: "A", tipo: "vehiculo", accion: "creado", objeto: "X",
    }));
    assert.equal(POR_PAGINA, 50);
    const con50 = armarPagina(filas(50));
    assert.equal(con50.actividad.length, 50);
    assert.equal(con50.siguiente, null);
    const con51 = armarPagina(filas(51));
    assert.equal(con51.actividad.length, 50);
    assert.equal(con51.siguiente, "2026-09-21T10:00:00.999950+00:00|bbbbbbbb-0000-4000-8000-000000000049");
    // Ida y vuelta
    const { cursor } = leerCursor(con51.siguiente);
    assert.deepEqual(cursor, { cuando: "2026-09-21T10:00:00.999950+00:00", id: "bbbbbbbb-0000-4000-8000-000000000049" });
    const c = condicionesDeConsulta({ empresaId: EMPRESA }, { ...leerFiltros({}).filtros, cursor });
    assert.deepEqual(c.at(-1), ["or", 'created_at.lt."2026-09-21T10:00:00.999950+00:00",and(created_at.eq."2026-09-21T10:00:00.999950+00:00",id.lt.bbbbbbbb-0000-4000-8000-000000000049)']);
    assert.equal(cursorDe(null), null);
});

test("HU-19.4 · un cursor inventado o con algo colado se rechaza", () => {
    for (const malo of ["x", "2026-09-21|no-es-uuid", `2026-09-21T10:00:00+00:00|${ID}|extra`, `2026-09-21T10:00:00+00:00),id.gt.0|${ID}`]) {
        assert.equal(leerFiltros({ despues_de: malo }).error, "La página pedida no es válida. Recarga la actividad.", malo);
    }
    assert.deepEqual(leerCursor(`2026-09-21T10:00:00Z|${ID}`).cursor, { cuando: "2026-09-21T10:00:00Z", id: ID });
});
