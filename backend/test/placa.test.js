import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPlaca, validarColor, normalizarPlaca, TIPOS_VEHICULO } from "../src/utils/placa.js";

test("placa · carro: 3 letras y 3 números", () => {
    assert.equal(validarPlaca("ABC123", "automovil"), null);
    assert.equal(validarPlaca("abc 123", "camion"), null);
    assert.equal(validarPlaca("ABC1234", "camion"), "La placa debe tener 3 letras y 3 números (ej. ABC123).");
    assert.equal(validarPlaca("ABC12", "bus"), "La placa debe tener 3 letras y 3 números (ej. ABC123).");
    assert.equal(validarPlaca("ABC12D", "camioneta"), "La placa debe tener 3 letras y 3 números (ej. ABC123).");
});

test("placa · moto: 3 letras, 2 números y 1 letra", () => {
    assert.equal(validarPlaca("ABC12D", "motocicleta"), null);
    assert.equal(validarPlaca("ABC123", "motocicleta"), "La placa debe tener 3 letras, 2 números y 1 letra (ej. ABC12D).");
    assert.equal(validarPlaca("ABC12DE", "motocicleta"), "La placa debe tener 3 letras, 2 números y 1 letra (ej. ABC12D).");
});

test("placa · motocarro: 3 números y 3 letras", () => {
    assert.equal(validarPlaca("123ABC", "motocarro"), null);
    assert.equal(validarPlaca("ABC123", "motocarro"), "La placa debe tener 3 números y 3 letras (ej. 123ABC).");
});

test("placa · tipo que no existe", () => {
    assert.equal(validarPlaca("ABC123", "avion"), "Tipo de vehículo no válido.");
});

test("placa · se normaliza sin espacios ni guiones", () => {
    assert.equal(normalizarPlaca(" ocj-123 "), "OCJ123");
});

test("placa · los tipos coinciden con el CHECK de la base", () => {
    assert.deepEqual([...TIPOS_VEHICULO].sort(), [
        "automovil", "bus", "buseta", "camion", "camioneta",
        "microbus", "motocarro", "motocicleta", "tractocamion",
    ]);
});

test("color · solo letras", () => {
    assert.equal(validarColor("Gris plata"), null);
    assert.equal(validarColor("Azul Océano"), null);
    assert.equal(validarColor(""), null);
    assert.equal(validarColor("Rojo 2"), "El color solo puede tener letras.");
    assert.equal(validarColor("#FF0000"), "El color solo puede tener letras.");
});
