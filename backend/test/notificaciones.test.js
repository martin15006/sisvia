import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirDestinatarios } from "../src/services/notificacionesReglas.js";

const A = "empresa-a", B = "empresa-b";
const admins = [
    { id: "dueno-a", sede_id: null, empresa_id: A },          // Administrador de empresa A
    { id: "regional-a", sede_id: null, empresa_id: A },       // Director Regional A
    { id: "coord-a1", sede_id: "sede-a1", empresa_id: A },
    { id: "coord-a2", sede_id: "sede-a2", empresa_id: A },
    { id: "dueno-b", sede_id: null, empresa_id: B },          // sin sede en OTRA empresa
    { id: "coord-b1", sede_id: "sede-b1", empresa_id: B },
    { id: "equipo-sisvia", sede_id: null, empresa_id: null }, // superadmin
];

test("HU-06.5 · un aviso de una sede de A solo les llega a admins de A", () => {
    assert.deepEqual(elegirDestinatarios(admins, { sedeId: "sede-a1", empresaId: A }).sort(), ["coord-a1", "dueno-a", "regional-a"]);
});

test("CB-15 · los admins sin sede de B no reciben avisos de A (antes recibían todo)", () => {
    const ids = elegirDestinatarios(admins, { sedeId: "sede-a1", empresaId: A });
    assert.equal(ids.includes("dueno-b"), false);
    assert.equal(ids.includes("coord-b1"), false);
    assert.equal(ids.includes("equipo-sisvia"), false);
});

test("HU-06.5 · soloSede: únicamente el coordinador de esa sede", () => {
    assert.deepEqual(elegirDestinatarios(admins, { sedeId: "sede-a2", empresaId: A, soloSede: true }), ["coord-a2"]);
});

test("HU-06.5 · sin sede: todos los admins de la empresa y nadie más", () => {
    assert.deepEqual(elegirDestinatarios(admins, { empresaId: B }).sort(), ["coord-b1", "dueno-b"]);
});

test("HU-06.5 · sin empresa: no le llega a nadie", () => {
    assert.deepEqual(elegirDestinatarios(admins, { sedeId: "sede-a1" }), []);
    assert.deepEqual(elegirDestinatarios(admins, {}), []);
});
