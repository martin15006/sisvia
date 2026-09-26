import { test } from "node:test";
import assert from "node:assert/strict";
import { puedeCrearRol, puedeGestionarRol, rolesQuePuedeCrear, ETIQUETA_ROL, rolPermitidoPorSedes, MENSAJE_ROLES_SEDES } from "../src/services/jerarquia.service.js";

test("HU-09.2 · el Administrador de empresa crea Director Regional, Coordinador y Conductor", () => {
    assert.deepEqual(rolesQuePuedeCrear("admin_empresa"), ["admin_departamental", "admin_sede", "conductor"]);
    for (const rol of ["admin_departamental", "admin_sede", "conductor"]) {
        assert.equal(puedeCrearRol("admin_empresa", rol), true, rol);
    }
});

test("HU-09.3 · CB-13 · el Administrador de empresa no crea superadmin ni otro Administrador de empresa", () => {
    assert.equal(puedeCrearRol("admin_empresa", "superadmin"), false);
    assert.equal(puedeCrearRol("admin_empresa", "admin_empresa"), false);
});

test("HU-09 · el superadmin crea Administradores de empresa; los de abajo no", () => {
    assert.equal(puedeCrearRol("superadmin", "admin_empresa"), true);
    assert.equal(rolesQuePuedeCrear("superadmin").includes("admin_empresa"), true);
    assert.equal(puedeCrearRol("admin_departamental", "admin_empresa"), false);
    assert.equal(puedeCrearRol("admin_sede", "admin_empresa"), false);
});

test("HU-09 · nadie de la empresa gestiona a un par ni a alguien de arriba", () => {
    assert.equal(puedeGestionarRol("admin_empresa", "admin_empresa"), false);
    assert.equal(puedeGestionarRol("admin_empresa", "superadmin"), false);
    assert.equal(puedeGestionarRol("admin_empresa", "admin_departamental"), true);
    assert.equal(puedeGestionarRol("admin_departamental", "admin_empresa"), false);
    assert.equal(puedeGestionarRol("superadmin", "admin_empresa"), true);
});

test("HU-09 · etiqueta del cargo", () => {
    assert.equal(ETIQUETA_ROL.admin_empresa, "Administrador de empresa");
});


test("HU-10.1 · con 1 sede activa solo se crean Conductores", () => {
    assert.equal(rolPermitidoPorSedes("conductor", 1), true);
    for (const rol of ["admin_sede", "admin_departamental", "admin"]) {
        assert.equal(rolPermitidoPorSedes(rol, 1), false, rol);
        assert.equal(rolPermitidoPorSedes(rol, 0), false, `${rol} sin sedes`);
    }
});

test("HU-10.2 · con la segunda sede aparecen Director Regional y Coordinador", () => {
    assert.equal(rolPermitidoPorSedes("admin_sede", 2), true);
    assert.equal(rolPermitidoPorSedes("admin_departamental", 2), true);
    assert.equal(rolPermitidoPorSedes("admin_sede", 5), true);
});

test("HU-10 · el mensaje dice qué hacer", () => {
    assert.equal(MENSAJE_ROLES_SEDES, "Con una sola sede activa solo se pueden crear Conductores. Crea la segunda sede para habilitar Director Regional y Coordinador de sede.");
});
