import { test } from "node:test";
import assert from "node:assert/strict";
import { MENSAJES_PERFIL, cambiosDePerfil } from "../src/services/perfilReglas.js";

const ACTUAL = { nombre_completo: "Ana Pérez", telefono: "3001234567", foto_url: "https://x/foto.png" };

test("perfil · sin cambios no hay nada que guardar: textos exactos", () => {
    assert.deepEqual(cambiosDePerfil(ACTUAL, { nombre_completo: "Ana Pérez", telefono: "3001234567", foto_url: "https://x/foto.png" }), {});
    assert.equal(MENSAJES_PERFIL.sinCambios, "No hay cambios para guardar.");
    assert.equal(MENSAJES_PERFIL.escribeContrasena, "Escribe tu contraseña para guardar los cambios.");
});

test("perfil · espacios de más o el teléfono escrito distinto no cuentan como cambio", () => {
    assert.deepEqual(cambiosDePerfil(ACTUAL, { nombre_completo: "  Ana   Pérez ", telefono: "300 123 4567" }), {});
    assert.deepEqual(cambiosDePerfil({ ...ACTUAL, telefono: null }, { telefono: "" }), {}, "vacío y sin teléfono son lo mismo");
    assert.deepEqual(cambiosDePerfil({ ...ACTUAL, foto_url: null }, { foto_url: "" }), {}, "sin foto y foto vacía también");
});

test("perfil · solo se escribe lo que cambió", () => {
    assert.deepEqual(cambiosDePerfil(ACTUAL, { nombre_completo: "Ana María Pérez", telefono: "3001234567" }), { nombre_completo: "Ana María Pérez" });
    assert.deepEqual(cambiosDePerfil(ACTUAL, { telefono: "+58 4121234567" }), { telefono: "+584121234567" });
    assert.deepEqual(cambiosDePerfil(ACTUAL, { telefono: "" }), { telefono: null }, "borrar el teléfono es un cambio");
    assert.deepEqual(cambiosDePerfil(ACTUAL, { foto_url: "https://x/otra.png" }), { foto_url: "https://x/otra.png" });
    assert.deepEqual(cambiosDePerfil(ACTUAL, {}), {}, "lo que no viene no se toca");
});
