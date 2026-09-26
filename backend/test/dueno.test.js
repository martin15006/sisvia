import { test } from "node:test";
import assert from "node:assert/strict";
import { MENSAJES_DUENO, protegerDueno, esDueno, motivoNoDarMarca, motivoNoQuitarme, errorDeMarca } from "../src/services/duenoReglas.js";

const DUENO = { id: "d", rol: "superadmin", activo: true, es_dueno: true, nombre_completo: "Martín Dueño" };
const OTRO_DUENO = { id: "o", rol: "superadmin", activo: true, es_dueno: true, nombre_completo: "Socio Dueño" };
const SANDRA = { id: "s", rol: "superadmin", activo: true, es_dueno: false, nombre_completo: "Sandra Equipo" };

test("HU-20.4 · a una cuenta con la marca no se la desactiva, elimina ni cambia de rol: texto exacto", () => {
    for (const accion of ["desactivar", "eliminar", "cambiar_rol"]) {
        assert.equal(protegerDueno(DUENO, accion), MENSAJES_DUENO.protegida, accion);
        assert.equal(protegerDueno(SANDRA, accion), null, `otra cuenta: ${accion}`);
    }
    assert.equal(protegerDueno(DUENO, "editar"), null, "editar su nombre o teléfono sí se puede");
    assert.equal(protegerDueno(null, "eliminar"), null);
    assert.equal(MENSAJES_DUENO.protegida,
        "Esta cuenta es la del dueño de SISVIA: no se puede desactivar, eliminar ni cambiar de rol. Para dejar de ser dueño, quítate la marca.");
});

test("RN-15 · la marca solo la mueve un dueño", () => {
    assert.equal(esDueno(DUENO), true);
    assert.equal(esDueno(SANDRA), false);
    assert.equal(esDueno({ ...DUENO, rol: "admin_empresa" }), false, "la marca sin el rol no alcanza");
    assert.equal(motivoNoDarMarca({ actor: SANDRA, destino: DUENO, nombreEscrito: "Martín Dueño" }), "Solo un dueño de SISVIA puede cambiar la marca.");
    assert.equal(motivoNoQuitarme({ actor: SANDRA, nombreEscrito: "Sandra Equipo" }), MENSAJES_DUENO.soloDueno);
});

test("HU-20.5 · dar la marca: los dos quedan dueños", () => {
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: SANDRA, nombreEscrito: "Sandra Equipo" }), null);
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: SANDRA, nombreEscrito: "  Sandra Equipo  " }), null, "los espacios de las puntas se perdonan");
});

test("CB-22 · a quién no se le puede dar: desactivada, de otro rol, uno mismo, o que ya la tiene", () => {
    const msg = "Solo se le puede dar la marca a un Administrador general activo que todavía no la tenga.";
    assert.equal(MENSAJES_DUENO.destinoInvalido, msg);
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: { ...SANDRA, activo: false }, nombreEscrito: "Sandra Equipo" }), msg);
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: { ...SANDRA, rol: "admin_empresa" }, nombreEscrito: "Sandra Equipo" }), msg);
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: OTRO_DUENO, nombreEscrito: "Socio Dueño" }), msg, "a quien ya es dueño, no");
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: DUENO, nombreEscrito: "Martín Dueño" }), msg, "a sí mismo, no");
    assert.equal(motivoNoDarMarca({ actor: DUENO, destino: null, nombreEscrito: "x" }), msg);
});

test("HU-20.5-7 · hay que escribir el nombre exacto", () => {
    for (const malo of ["sandra equipo", "Sandra", "Sandra  Equipo", "", undefined]) {
        assert.equal(motivoNoDarMarca({ actor: DUENO, destino: SANDRA, nombreEscrito: malo }), "El nombre no coincide: no se cambió nada.", String(malo));
    }
    assert.equal(motivoNoQuitarme({ actor: DUENO, nombreEscrito: "Martín Dueño" }), null, "para quitarse la suya escribe su propio nombre");
    assert.equal(motivoNoQuitarme({ actor: DUENO, nombreEscrito: "Socio Dueño" }), MENSAJES_DUENO.nombreDistinto, "no el de otro");
});

test("HU-20.7 · CB-23 · lo que avisa la base se traduce al texto de la pantalla", () => {
    assert.deepEqual(errorDeMarca("ya_cambio"), { status: 409, error: "La marca de dueño ya cambió. Recarga la página." });
    assert.deepEqual(errorDeMarca("ultimo_dueno"), { status: 400, error: "No puedes quitarte la marca: eres el único dueño de SISVIA. Primero dásela a otra cuenta." });
    assert.deepEqual(errorDeMarca("destino_invalido"), { status: 400, error: MENSAJES_DUENO.destinoInvalido });
    assert.equal(errorDeMarca("otra cosa"), null);
});
