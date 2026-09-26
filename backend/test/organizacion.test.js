import { test } from "node:test";
import assert from "node:assert/strict";
import { organizacionDeUsuario, lineaOrigen, pieDeCorreo } from "../src/services/organizacionReglas.js";

test("HU-08.1 · la organización es la empresa del usuario", () => {
    assert.equal(organizacionDeUsuario({ rol: "admin_empresa", empresa_nombre: "Transportes del Sur" }), "Transportes del Sur");
});

test("HU-08.4 · el superadmin ve SISVIA, o la empresa a la que entró", () => {
    assert.equal(organizacionDeUsuario({ rol: "superadmin", empresa_nombre: null }), "SISVIA");
    assert.equal(organizacionDeUsuario({ rol: "superadmin", empresa_nombre: null, empresaActivaNombre: "TST A" }), "TST A");
});

test("HU-08.2 · la cabecera de PDF y Word: empresa · Regional · Sede", () => {
    assert.equal(
        lineaOrigen({ organizacion: "Transportes del Sur", departamentoNombre: "Tolima", sedeNombre: "Sede Ibagué" }),
        "Transportes del Sur · Regional Tolima · Sede Ibagué"
    );
    assert.equal(lineaOrigen({ organizacion: "", departamentoNombre: "", sedeNombre: "" }), "SISVIA");
});

test("HU-08.3 · el correo lleva el nombre de la empresa en el pie", () => {
    assert.equal(pieDeCorreo("Transportes del Sur"), "Transportes del Sur · SISVIA · Control de vehículos · Este es un correo automatico, no responder.");
    assert.equal(pieDeCorreo(""), "SISVIA · Control de vehículos · Este es un correo automatico, no responder.");
});
