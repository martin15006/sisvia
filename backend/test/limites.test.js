import { test } from "node:test";
import assert from "node:assert/strict";
import { validarLimite, alcanzoLimite, mensajeLimite, limiteBajoUso, MENSAJE_LIMITE_INVALIDO } from "../src/services/limitesReglas.js";

test("HU-02.2 · texto exacto del límite de sedes", () => {
    assert.equal(mensajeLimite("sedes", 3), "Tu empresa llegó al límite de 3 sedes de su plan. Para ampliarlo, comunícate con SISVIA.");
});

test("HU-02.3 · texto exacto del límite de vehículos", () => {
    assert.equal(mensajeLimite("vehiculos", 120), "Tu empresa llegó al límite de 120 vehículos de su plan. Para ampliarlo, comunícate con SISVIA.");
    assert.equal(mensajeLimite("vehiculos", 1), "Tu empresa llegó al límite de 1 vehículo de su plan. Para ampliarlo, comunícate con SISVIA.");
});

test("HU-02.4 · el límite es inclusive: N−1 deja crear, N no", () => {
    assert.equal(alcanzoLimite(2, 3), false);   // 2 de 3: se crea la tercera
    assert.equal(alcanzoLimite(3, 3), true);    // 3 de 3: no
    assert.equal(alcanzoLimite(119, 120), false);
    assert.equal(alcanzoLimite(120, 120), true);
});

test("HU-02.2 · pasada del límite (datos de antes de la enmienda) tampoco deja crear", () => {
    assert.equal(alcanzoLimite(5, 3), true);
});

test("CB-02 · el límite no puede quedar por debajo de lo activo (texto exacto)", () => {
    assert.equal(limiteBajoUso("sedes", 1, 2), "La empresa tiene 2 sedes activas: el límite no puede ser menor. Primero desactiva las que sobran.");
    assert.equal(limiteBajoUso("vehiculos", 117, 118), "La empresa tiene 118 vehículos activos: el límite no puede ser menor. Primero desactiva los que sobran.");
    // igual a lo que usa (N) sí; uno menos (N−1) no
    assert.equal(limiteBajoUso("sedes", 2, 2), null);
    assert.equal(limiteBajoUso("vehiculos", 118, 118), null);
    assert.equal(limiteBajoUso("sedes", 5, 2), null);
});

test("CB-10 · el límite es un entero de 1 en adelante", () => {
    for (const malo of [0, -1, 2.5, "0", "-1", "2.5", "", null, undefined, "tres"]) {
        assert.equal(validarLimite(malo), MENSAJE_LIMITE_INVALIDO, String(malo));
    }
    for (const bueno of [1, 3, 120, "1", "120"]) {
        assert.equal(validarLimite(bueno), null, String(bueno));
    }
});
