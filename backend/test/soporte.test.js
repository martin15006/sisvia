import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MENSAJES_SOPORTE,
    necesitaConfirmacion,
    requiereEntrar,
    idUsuarioDeRuta,
    describirAccion,
    mensajeBloqueo,
} from "../src/services/soporteReglas.js";

const EMPRESA = "11111111-2222-4333-8444-555555555555";
const ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("HU-16.3 · texto exacto de la contraseña incorrecta", () => {
    assert.equal(MENSAJES_SOPORTE.contrasenaIncorrecta, "Contraseña incorrecta");
});

test("HU-16.2 · dentro de una empresa, todo cambio del superadmin pide contraseña", () => {
    const adentro = { rol: "superadmin", empresaActiva: EMPRESA };
    for (const [metodo, ruta] of [
        ["POST", "/api/vehiculos"],
        ["PATCH", `/api/vehiculos/${ID}`],
        ["PATCH", `/api/vehiculos/${ID}/desactivar`],
        ["DELETE", `/api/vehiculos/${ID}`],
        ["POST", "/api/usuarios"],
        ["POST", `/api/usuarios/${ID}/resetear-password`],
        ["POST", "/api/geo/sedes"],
        ["PUT", `/api/catalogo-admin/items/${ID}`],
        ["POST", "/api/suplencias?x=1"],
    ]) {
        assert.equal(necesitaConfirmacion({ ...adentro, metodo, ruta }), true, `${metodo} ${ruta}`);
    }
});

test("HU-16.2 · mirar no pide contraseña, ni lo propio del superadmin", () => {
    const adentro = { rol: "superadmin", empresaActiva: EMPRESA };
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "GET", ruta: "/api/vehiculos" }), false);
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "PATCH", ruta: "/api/notificaciones/leer-todas" }), false);
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "PATCH", ruta: "/api/auth/mi-perfil" }), false);
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "POST", ruta: `/api/empresas/${EMPRESA}/entrar` }), false);
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "POST", ruta: "/api/upload/foto" }), false);
    // "/api/empresasX" no es el modulo Empresas
    assert.equal(necesitaConfirmacion({ ...adentro, metodo: "POST", ruta: "/api/empresasX" }), true);
});

test("RN-11 · solo al superadmin y solo adentro", () => {
    assert.equal(necesitaConfirmacion({ rol: "superadmin", empresaActiva: null, metodo: "POST", ruta: "/api/vehiculos" }), false);
    assert.equal(necesitaConfirmacion({ rol: "admin_empresa", empresaActiva: EMPRESA, metodo: "POST", ruta: "/api/vehiculos" }), false);
});

test("HU-06.6 · afuera de una empresa, el superadmin no cambia sus datos", () => {
    const afuera = { rol: "superadmin", empresaActiva: null };
    assert.equal(requiereEntrar({ ...afuera, metodo: "POST", ruta: "/api/vehiculos" }), true);
    assert.equal(requiereEntrar({ ...afuera, metodo: "PATCH", ruta: `/api/geo/sedes/${ID}` }), true);
    assert.equal(requiereEntrar({ ...afuera, metodo: "POST", ruta: "/api/suplencias" }), true);
    // pero si mira, y maneja lo suyo: ciudades, catalogo base, empresas
    assert.equal(requiereEntrar({ ...afuera, metodo: "GET", ruta: "/api/vehiculos" }), false);
    assert.equal(requiereEntrar({ ...afuera, metodo: "POST", ruta: "/api/geo/ciudades" }), false);
    assert.equal(requiereEntrar({ ...afuera, metodo: "POST", ruta: "/api/empresas" }), false);
    // adentro, o siendo otro rol, esta regla no aplica
    assert.equal(requiereEntrar({ rol: "superadmin", empresaActiva: EMPRESA, metodo: "POST", ruta: "/api/vehiculos" }), false);
    assert.equal(requiereEntrar({ rol: "admin_empresa", empresaActiva: null, metodo: "POST", ruta: "/api/vehiculos" }), false);
});

test("HU-06.6 · el usuario afectado sale de la ruta", () => {
    assert.equal(idUsuarioDeRuta(`/api/usuarios/${ID}/desactivar`), ID);
    assert.equal(idUsuarioDeRuta(`/api/usuarios/${ID}`), ID);
    assert.equal(idUsuarioDeRuta("/api/usuarios"), null);
    assert.equal(idUsuarioDeRuta(`/api/vehiculos/${ID}`), null);
});

test("RN-11 · el registro dice qué se hizo", () => {
    assert.deepEqual(describirAccion("POST", "/api/vehiculos"), { pedido: "crear un vehículo", hecho: "Creó un vehículo" });
    assert.equal(describirAccion("PATCH", `/api/vehiculos/${ID}`).hecho, "Editó un vehículo");
    assert.equal(describirAccion("PATCH", `/api/vehiculos/${ID}/desactivar`).hecho, "Desactivó un vehículo");
    assert.equal(describirAccion("POST", `/api/vehiculos/${ID}/fotos`).hecho, "Subió fotos a un vehículo");
    assert.equal(describirAccion("DELETE", `/api/vehiculos/${ID}/fotos/${ID}`).hecho, "Eliminó una foto de un vehículo");
    assert.equal(describirAccion("POST", `/api/usuarios/${ID}/resetear-password`).hecho, "Reseteó la contraseña de un usuario");
    assert.equal(describirAccion("POST", "/api/geo/sedes").hecho, "Creó una sede");
    assert.equal(describirAccion("PATCH", `/api/geo/sedes/${ID}`).pedido, "editar una sede");
    assert.equal(describirAccion("PUT", `/api/catalogo-admin/items/${ID}`).hecho, "Editó un ítem del chequeo");
    assert.equal(describirAccion("DELETE", "/api/desconocido").hecho, "Eliminó datos de la empresa");
});

test("HU-16.5 · texto exacto del bloqueo tras 5 contraseñas malas", () => {
    assert.equal(mensajeBloqueo(15), "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.");
    assert.equal(mensajeBloqueo(1), "Demasiados intentos fallidos. Intenta de nuevo en 1 minuto.");
});

test("HU-14 · RNF-05 · el registro dice que se bloqueó o desbloqueó", () => {
    assert.equal(describirAccion("POST", "/api/catalogo-admin/bloqueos/bloquear").hecho, "Bloqueó un elemento del catálogo base");
    assert.equal(describirAccion("POST", "/api/catalogo-admin/bloqueos/desbloquear").pedido, "desbloquear un elemento del catálogo base");
});
