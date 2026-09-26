import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MENSAJES_EMPRESA,
    validarDatosEmpresa,
    validarAdminEmpresa,
    esCorreoRepetido,
    escaparLike,
    dejaSinDueno,
} from "../src/services/empresasReglas.js";
import { MENSAJE_LIMITE_INVALIDO } from "../src/services/limitesReglas.js";

const empresaBase = { nombre: "  Taxis   del Sur ", limite_sedes: "1", limite_vehiculos: 120 };
const adminBase = { nombre_completo: "Ana  Pérez", cedula: "1.012.345.678", email: " Ana@Ejemplo.com ", telefono: "300 123 4567" };

test("HU-01.3 · HU-01.4 · HU-03.2 · textos exactos (RNF-08)", () => {
    assert.equal(MENSAJES_EMPRESA.correoRepetido, "Ese correo ya está registrado en SISVIA");
    assert.equal(MENSAJES_EMPRESA.cedulaRepetida, "Esa cédula ya está registrada en SISVIA");
    assert.equal(MENSAJES_EMPRESA.nombreRepetido, "Ya existe una empresa con ese nombre");
    assert.equal(MENSAJES_EMPRESA.desactivada, "Tu empresa está desactivada. Comunícate con SISVIA.");
});

test("HU-01.2 · la empresa nueva queda con los datos limpios", () => {
    const { datos, error } = validarDatosEmpresa(empresaBase);
    assert.equal(error, undefined);
    assert.equal(datos.nombre, "Taxis del Sur");
    assert.equal(datos.limite_sedes, 1);
    assert.equal(datos.limite_vehiculos, 120);
    assert.equal(datos.nit, null);
});

test("HU-01.2 · el nombre de la empresa es obligatorio", () => {
    assert.ok(validarDatosEmpresa({ ...empresaBase, nombre: "   " }).error);
});

test("CB-10 · límites 0, −1 y 2.5 no se guardan; 1 sí", () => {
    for (const malo of [0, -1, 2.5]) {
        assert.equal(validarDatosEmpresa({ ...empresaBase, limite_sedes: malo }).error, MENSAJE_LIMITE_INVALIDO);
        assert.equal(validarDatosEmpresa({ ...empresaBase, limite_vehiculos: malo }).error, MENSAJE_LIMITE_INVALIDO);
    }
    assert.equal(validarDatosEmpresa({ ...empresaBase, limite_sedes: 1, limite_vehiculos: 1 }).error, undefined);
    // en la edición solo se valida lo que llega, pero lo que llega se valida igual
    assert.equal(validarDatosEmpresa({ limite_vehiculos: 0 }, { parcial: true }).error, MENSAJE_LIMITE_INVALIDO);
    assert.deepEqual(validarDatosEmpresa({ limite_vehiculos: "118" }, { parcial: true }).datos, { limite_vehiculos: 118 });
});

test("HU-01.2 · el administrador: datos obligatorios, correo y cédula limpios", () => {
    const { datos } = validarAdminEmpresa(adminBase);
    assert.deepEqual(datos, { nombre_completo: "Ana Pérez", email: "ana@ejemplo.com", cedula: "1012345678", telefono: "3001234567" });
    assert.ok(validarAdminEmpresa({ ...adminBase, email: "" }).error);
    assert.ok(validarAdminEmpresa({ ...adminBase, email: "sin-arroba" }).error);
    assert.ok(validarAdminEmpresa({ ...adminBase, cedula: "0123456" }).error);
});

test("HU-01.3 · reconoce el correo repetido de Supabase Auth", () => {
    assert.equal(esCorreoRepetido({ code: "email_exists", message: "" }), true);
    assert.equal(esCorreoRepetido({ message: "A user with this email address has already been registered" }), true);
    assert.equal(esCorreoRepetido({ code: "weak_password", message: "Password too short" }), false);
    assert.equal(esCorreoRepetido(null), false);
});

test("HU-01.4 · el nombre se compara tal cual, sin comodines", () => {
    assert.equal(escaparLike("100%_Taxis"), "100\\%\\_Taxis");
});

test("CB-17 · la empresa nunca queda sin Administrador de empresa activo", () => {
    assert.equal(MENSAJES_EMPRESA.sinDueno, "La empresa no puede quedar sin Administrador de empresa. Crea otro antes de hacer este cambio.");
    const dueno = { rol: "admin_empresa", activo: true };
    for (const accion of ["eliminar", "desactivar"]) {
        assert.equal(dejaSinDueno({ objetivo: dueno, accion, adminsActivos: 1 }), true, accion);
        assert.equal(dejaSinDueno({ objetivo: dueno, accion, adminsActivos: 2 }), false, accion + " con dos");
    }
    assert.equal(dejaSinDueno({ objetivo: dueno, accion: "cambiar_rol", rolNuevo: "admin_departamental", adminsActivos: 1 }), true);
    assert.equal(dejaSinDueno({ objetivo: dueno, accion: "cambiar_rol", rolNuevo: "admin_empresa", adminsActivos: 1 }), false);
    // otro rol, o un dueño ya desactivado, no cuentan
    assert.equal(dejaSinDueno({ objetivo: { rol: "admin_sede", activo: true }, accion: "eliminar", adminsActivos: 0 }), false);
    assert.equal(dejaSinDueno({ objetivo: { rol: "admin_empresa", activo: false }, accion: "eliminar", adminsActivos: 1 }), false);
});

// ----- HU-05 · RN-06: eliminar una empresa -----
import { motivoNoEliminar, MENSAJES_ELIMINAR } from "../src/services/empresasReglas.js";

const AHORA = new Date("2026-09-21T15:00:00Z");
const DIA = 24 * 60 * 60 * 1000;
const lista = (extra = {}) => ({ nombre: "Transportes del Sur", activa: false, ultimo_respaldo_en: new Date(AHORA - DIA).toISOString(), ...extra });

test("HU-05.1 · una empresa activa no se elimina: texto exacto", () => {
    assert.equal(motivoNoEliminar({ empresa: lista({ activa: true }), nombreEscrito: "Transportes del Sur", ahora: AHORA }), "Primero desactiva la empresa.");
});

test("HU-05.2 · sin respaldo, o con uno de más de 30 días, no se elimina: texto exacto", () => {
    const texto = "Antes de eliminar, genera el respaldo con «Exportar todo» y envíaselo a la empresa.";
    assert.equal(motivoNoEliminar({ empresa: lista({ ultimo_respaldo_en: null }), nombreEscrito: "Transportes del Sur", ahora: AHORA }), texto);
    const treintaDias = new Date(AHORA - 30 * DIA).toISOString();
    assert.equal(motivoNoEliminar({ empresa: lista({ ultimo_respaldo_en: treintaDias }), nombreEscrito: "Transportes del Sur", ahora: AHORA }), null, "30 días justos: todavía vale");
    const unoMas = new Date(AHORA - 30 * DIA - 1).toISOString();
    assert.equal(motivoNoEliminar({ empresa: lista({ ultimo_respaldo_en: unoMas }), nombreEscrito: "Transportes del Sur", ahora: AHORA }), texto, "30 días y un instante: ya no");
});

test("HU-05.3 · desactivada, con respaldo reciente y el nombre exacto: se puede", () => {
    assert.equal(motivoNoEliminar({ empresa: lista(), nombreEscrito: "Transportes del Sur", ahora: AHORA }), null);
});

test("HU-05.4 · con el nombre escrito distinto no se borra nada", () => {
    for (const escrito of ["transportes del sur", "Transportes del Sur ", "Transportes", "", undefined]) {
        assert.equal(motivoNoEliminar({ empresa: lista(), nombreEscrito: escrito, ahora: AHORA }), MENSAJES_ELIMINAR.nombreDistinto, JSON.stringify(escrito));
    }
});
