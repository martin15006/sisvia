import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MENSAJES_VEHICULO,
    CODIGO_PLACA_EN_SISVIA,
    choquePlaca,
    validarMotivoBaja,
    bloqueoPorBaja,
} from "../src/services/vehiculosReglas.js";
import { describirAccion } from "../src/services/soporteReglas.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const VEH = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("HU-17.1 · la placa vigente de otra empresa se rechaza con el texto exacto, sin nombrarla", () => {
    const r = choquePlaca({ id: VEH, empresa_id: A }, B);
    assert.equal(r.error, "Esa placa ya está registrada en SISVIA. Si el vehículo ahora es de tu empresa, comunícate con SISVIA.");
    assert.equal(r.codigo, CODIGO_PLACA_EN_SISVIA);
    assert.ok(!r.error.includes(A), "no dice de qué empresa es");
});

test("HU-17.1 · en la misma empresa, el aviso habla de tu empresa", () => {
    assert.deepEqual(choquePlaca({ id: VEH, empresa_id: A }, A), { error: MENSAJES_VEHICULO.placaEnTuEmpresa });
});

test("HU-17.1 · sin otro vehículo vigente (o editando el mismo), no hay choque", () => {
    assert.equal(choquePlaca(null, B), null);
    assert.equal(choquePlaca({ id: VEH, empresa_id: A }, A, VEH), null);
});

test("HU-17.2 · el motivo es obligatorio: vacío o solo espacios, no", () => {
    assert.equal(validarMotivoBaja(""), "Escribe el motivo de la baja.");
    assert.equal(validarMotivoBaja("   "), "Escribe el motivo de la baja.");
    assert.equal(validarMotivoBaja(undefined), "Escribe el motivo de la baja.");
    assert.equal(validarMotivoBaja("Vendido a otra empresa"), null);
});

test("HU-17.2 · el motivo llega hasta 500 caracteres: 500 pasa, 501 no", () => {
    assert.equal(validarMotivoBaja("x".repeat(500)), null);
    assert.equal(validarMotivoBaja("x".repeat(501)), "El motivo puede tener hasta 500 caracteres.");
});

test("HU-17.3 · el registro dice que se dio de baja por traspaso", () => {
    const a = describirAccion("PATCH", `/api/vehiculos/${VEH}/baja`);
    assert.equal(a.pedido, "dar de baja por traspaso un vehículo");
    assert.equal(a.hecho, "Dio de baja por traspaso un vehículo");
});

test("HU-17.4 · un vehículo dado de baja no se reactiva ni se modifica", () => {
    assert.equal(bloqueoPorBaja({ dado_de_baja: true }), "Este vehículo fue dado de baja por traspaso: no se puede reactivar ni modificar.");
    assert.equal(bloqueoPorBaja({ dado_de_baja: false, activo: false }), null);
});
