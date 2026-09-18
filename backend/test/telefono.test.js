import { test } from "node:test";
import assert from "node:assert/strict";
import { validarTelefono, normalizarTelefono, MENSAJE_TELEFONO } from "../src/utils/telefono.js";

test("telefono · celular colombiano: 10 dígitos que empiezan por 3", () => {
    assert.equal(validarTelefono("3001234567"), null);
    assert.equal(validarTelefono("300 123 4567"), null);
    assert.equal(validarTelefono("300123456"), MENSAJE_TELEFONO);    // 9
    assert.equal(validarTelefono("30012345678"), MENSAJE_TELEFONO);  // 11
    assert.equal(validarTelefono("6011234567"), MENSAJE_TELEFONO);   // fijo: no empieza por 3
});

test("telefono · otro país: + y entre 8 y 15 dígitos", () => {
    assert.equal(validarTelefono("+584121234567"), null);            // Venezuela
    assert.equal(validarTelefono("+57 300 123 4567"), null);         // Colombia con código
    assert.equal(validarTelefono("+12025550123"), null);             // Estados Unidos
    assert.equal(validarTelefono("+1234567"), MENSAJE_TELEFONO);     // 7
    assert.equal(validarTelefono("+12345678"), null);                // 8
    assert.equal(validarTelefono("+123456789012345"), null);         // 15
    assert.equal(validarTelefono("+1234567890123456"), MENSAJE_TELEFONO); // 16
});

test("telefono · vacío es válido (no es obligatorio)", () => {
    assert.equal(validarTelefono(""), null);
    assert.equal(validarTelefono(null), null);
    assert.equal(validarTelefono(undefined), null);
});

test("telefono · se guarda sin espacios ni guiones", () => {
    assert.equal(normalizarTelefono(" +57 300-123 4567 "), "+573001234567");
    assert.equal(normalizarTelefono("300 123 4567"), "3001234567");
    assert.equal(normalizarTelefono("  "), null);
});
