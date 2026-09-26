import { test } from "node:test";
import assert from "node:assert/strict";
import {
    catalogoEfectivo,
    aplicaAlVehiculo,
    faltanPreguntas,
    permisoCatalogo,
    MENSAJES_CATALOGO,
} from "../src/services/catalogoReglas.js";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";

// Catalogo de ejemplo: 2 categorias base, 1 propia de A, items base y propios.
const categorias = [
    { id: 1, nombre: "Niveles", orden: 1, activo: true, empresa_id: null },
    { id: 2, nombre: "Luces", orden: 2, activo: true, empresa_id: null },
    { id: 3, nombre: "Grúa", orden: 3, activo: true, empresa_id: A },
    { id: 4, nombre: "De B", orden: 4, activo: true, empresa_id: B },
];
const items = [
    { id: 10, categoria_id: 1, orden: 1, activo: true, empresa_id: null, aplica_a_tipos: null },
    { id: 11, categoria_id: 1, orden: 2, activo: true, empresa_id: null, aplica_a_tipos: ["camion"] },
    { id: 12, categoria_id: 1, orden: 3, activo: false, empresa_id: null, aplica_a_tipos: null },
    { id: 20, categoria_id: 2, orden: 1, activo: true, empresa_id: null, aplica_a_tipos: null },
    { id: 21, categoria_id: 2, orden: 2, activo: true, empresa_id: A, aplica_a_tipos: null },
    { id: 30, categoria_id: 3, orden: 1, activo: true, empresa_id: A, aplica_a_tipos: ["motocicleta"] },
    { id: 40, categoria_id: 4, orden: 1, activo: true, empresa_id: B, aplica_a_tipos: null },
];
const preguntas = [
    { id: 1, orden: 1, activo: true, empresa_id: null },
    { id: 2, orden: 2, activo: true, empresa_id: null },
    { id: 3, orden: 3, activo: true, empresa_id: A },
    { id: 4, orden: 4, activo: true, empresa_id: B },
];
const base = { categorias, items, preguntas };

test("HU-15.1 · RN-07 · A ve lo base activo más lo suyo", () => {
    const c = catalogoEfectivo({ ...base, empresaId: A });
    assert.deepEqual(c.itemIds.sort((x, y) => x - y), [10, 11, 20, 21, 30]);
    assert.deepEqual(c.preguntas.map((p) => p.id), [1, 2, 3]);
    assert.deepEqual(c.categorias.map((x) => x.id), [1, 2, 3]);
});

test("HU-15.2 · HU-13.1-2 · lo propio de B no le aparece a A", () => {
    const c = catalogoEfectivo({ ...base, empresaId: A });
    assert.equal(c.itemIds.includes(40), false);
    assert.equal(c.preguntas.some((p) => p.id === 4), false);
    assert.equal(c.categorias.some((x) => x.id === 4), false);
});

test("HU-15.3 · un ítem solo para motos no aparece en un camión", () => {
    const camion = catalogoEfectivo({ ...base, empresaId: A, tipoVehiculo: "camion" });
    assert.equal(camion.itemIds.includes(30), false);
    assert.equal(camion.itemIds.includes(11), true);
    const moto = catalogoEfectivo({ ...base, empresaId: A, tipoVehiculo: "motocicleta" });
    assert.equal(moto.itemIds.includes(30), true);
    assert.equal(moto.itemIds.includes(11), false);
    assert.equal(aplicaAlVehiculo({ aplica_a_tipos: [] }, "bus"), true);
});

test("RN-07 · las excepciones del vehículo lo sacan", () => {
    const c = catalogoEfectivo({ ...base, empresaId: A, excluidos: [10] });
    assert.equal(c.itemIds.includes(10), false);
});

test("CB-05 · HU-12.1 · lo base apagado no aparece en ninguna empresa", () => {
    assert.equal(catalogoEfectivo({ ...base, empresaId: A }).itemIds.includes(12), false);
    assert.equal(catalogoEfectivo({ ...base, empresaId: B }).itemIds.includes(12), false);
});

test("HU-14.1 · RN-08 · un ítem base bloqueado para A: A no lo ve, B sí", () => {
    const bloqueos = [{ empresa_id: A, tipo: "item", elemento_id: 20 }];
    assert.equal(catalogoEfectivo({ ...base, bloqueos, empresaId: A }).itemIds.includes(20), false);
    assert.equal(catalogoEfectivo({ ...base, bloqueos: [], empresaId: B }).itemIds.includes(20), true);
    const pregunta = [{ empresa_id: A, tipo: "pregunta", elemento_id: 2 }];
    assert.deepEqual(catalogoEfectivo({ ...base, bloqueos: pregunta, empresaId: A }).preguntas.map((p) => p.id), [1, 3]);
});

test("HU-14.2 · categoría base bloqueada: salen sus ítems base, quedan los propios", () => {
    const bloqueos = [{ empresa_id: A, tipo: "categoria", elemento_id: 2 }];
    const c = catalogoEfectivo({ ...base, bloqueos, empresaId: A });
    assert.equal(c.itemIds.includes(20), false);
    assert.equal(c.itemIds.includes(21), true);
    assert.deepEqual(c.categorias.find((x) => x.id === 2).items.map((i) => i.id), [21]);
    // sin ítems propios adentro, la categoría no aparece
    const sinPropios = catalogoEfectivo({ ...base, items: items.filter((i) => i.id !== 21), bloqueos, empresaId: A });
    assert.equal(sinPropios.categorias.some((x) => x.id === 2), false);
});

test("HU-14.3 · al desbloquear vuelve a aparecer", () => {
    assert.equal(catalogoEfectivo({ ...base, bloqueos: [], empresaId: A }).itemIds.includes(20), true);
});

test("HU-15.1 · la aptitud pide todas las preguntas de la empresa", () => {
    const efectivas = [{ id: 1 }, { id: 2 }, { id: 3 }];
    assert.equal(faltanPreguntas(efectivas, [{ pregunta_id: 1 }, { pregunta_id: 2 }, { pregunta_id: 3 }]), null);
    assert.equal(faltanPreguntas(efectivas, [{ pregunta_id: 1 }, { pregunta_id: 2 }]), "Se requieren las 3 respuestas de aptitud");
    assert.equal(faltanPreguntas(efectivas, [{ pregunta_id: 1 }, { pregunta_id: 2 }, { pregunta_id: 4 }]), "Se requieren las 3 respuestas de aptitud");
});

test("HU-12.3 · lo base lo cambia solo el superadmin, desde afuera (texto exacto)", () => {
    const itemBase = { empresa_id: null };
    assert.equal(permisoCatalogo({ rol: "superadmin", elemento: itemBase }), null);
    assert.equal(permisoCatalogo({ rol: "admin_empresa", empresaUsuario: A, elemento: itemBase }).mensaje, "No tienes permiso para cambiar el catálogo base");
    assert.equal(permisoCatalogo({ rol: "admin_empresa", empresaUsuario: A, elemento: itemBase }).status, 403);
    assert.equal(permisoCatalogo({ rol: "superadmin", empresaActiva: A, elemento: itemBase }).mensaje, MENSAJES_CATALOGO.baseDesdeAdentro);
    // crear sin elemento: el superadmin afuera crea base
    assert.equal(permisoCatalogo({ rol: "superadmin" }), null);
});

test("HU-13 · lo propio: su Administrador o el superadmin adentro; lo de otra empresa no existe", () => {
    const propioA = { empresa_id: A };
    assert.equal(permisoCatalogo({ rol: "admin_empresa", empresaUsuario: A, elemento: propioA }), null);
    assert.equal(permisoCatalogo({ rol: "superadmin", empresaActiva: A, elemento: propioA }), null);
    assert.equal(permisoCatalogo({ rol: "admin_empresa", empresaUsuario: B, elemento: propioA }).status, 404);
    assert.equal(permisoCatalogo({ rol: "admin_empresa", empresaUsuario: A }), null); // crear propio
});

test("HU-13.5 · Director Regional y Coordinador solo miran", () => {
    for (const rol of ["admin_departamental", "admin_sede", "admin"]) {
        assert.equal(permisoCatalogo({ rol, empresaUsuario: A }).mensaje, "No tienes permiso para cambiar el catálogo", rol);
        assert.equal(permisoCatalogo({ rol, empresaUsuario: A, elemento: { empresa_id: A } }).status, 403, rol);
    }
});

test("CB-08 · texto exacto de la categoría repetida", () => {
    assert.equal(MENSAJES_CATALOGO.nombreRepetido, "Ya existe una categoría con ese nombre");
});
