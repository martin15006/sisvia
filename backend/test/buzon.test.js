import { test } from "node:test";
import assert from "node:assert/strict";
import {
    TIPOS_BUZON,
    MENSAJES_BUZON,
    ADJUNTO_MAX,
    puedeEscribir,
    validarMensaje,
    validarTexto,
    validarAdjunto,
    recursoDeAdjunto,
    estadoAlAbrir,
    puedeResponder,
    destinatariosDeRespuesta,
    ordenarBandeja,
    limpiarPantalla,
    describirNavegador,
} from "../src/services/buzonReglas.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PDF = Buffer.from("%PDF-1.7");

test("HU-18.1 · los cinco tipos, con sus textos", () => {
    assert.deepEqual(Object.values(TIPOS_BUZON), ["Algo falla", "Tengo una duda", "Necesito más cupo del plan", "Traspaso de un vehículo", "Una idea"]);
});

test("HU-18.1 · RN-12 · solo el Administrador de empresa escribe: texto exacto", () => {
    assert.equal(puedeEscribir("admin_empresa"), true);
    for (const rol of ["superadmin", "admin_departamental", "admin_sede", "admin", "conductor", undefined]) assert.equal(puedeEscribir(rol), false, rol);
    assert.equal(MENSAJES_BUZON.soloAdmin, "Solo el Administrador de empresa puede escribirle a SISVIA.");
});

test("HU-18.1 · el mensaje es obligatorio y llega hasta 2.000 caracteres: 2.000 pasa, 2.001 no", () => {
    assert.deepEqual(validarMensaje({ tipo: "falla", mensaje: "  No carga el panel  " }), { datos: { tipo: "falla", mensaje: "No carga el panel" } });
    assert.equal(validarMensaje({ tipo: "falla", mensaje: "   " }).error, "Escribe el mensaje.");
    assert.ok(validarMensaje({ tipo: "falla", mensaje: "x".repeat(2000) }).datos);
    assert.equal(validarMensaje({ tipo: "falla", mensaje: "x".repeat(2001) }).error, "El mensaje puede tener hasta 2.000 caracteres.");
    assert.equal(validarMensaje({ tipo: "queja", mensaje: "hola" }).error, "Elige qué tipo de mensaje es.");
    assert.equal(validarMensaje({ tipo: "toString", mensaje: "hola" }).error, "Elige qué tipo de mensaje es.", "no acepta propiedades heredadas");
    assert.equal(validarTexto("ok").texto, "ok");
});

test("HU-18.2 · adjunto JPG, PNG o PDF de hasta 5 MB: 5 MB pasa, 5 MB + 1 byte no (texto exacto)", () => {
    const texto = "El archivo debe ser una imagen JPG o PNG, o un PDF, de hasta 5 MB.";
    assert.equal(validarAdjunto({ mimetype: "image/png", size: ADJUNTO_MAX, inicio: PNG }), null);
    assert.equal(validarAdjunto({ mimetype: "image/jpeg", size: 1200, inicio: JPG }), null);
    assert.equal(validarAdjunto({ mimetype: "application/pdf", size: 1200, inicio: PDF }), null);
    assert.equal(validarAdjunto({ mimetype: "image/png", size: ADJUNTO_MAX + 1, inicio: PNG }), texto);
    assert.equal(validarAdjunto({ mimetype: "image/gif", size: 1200, inicio: Buffer.from("GIF89a") }), texto);
    assert.equal(validarAdjunto({ mimetype: "image/png", size: 0, inicio: PNG }), texto);
});

test("HU-18.2 · un archivo que dice ser PDF (o PNG) pero no lo es, no pasa", () => {
    const texto = MENSAJES_BUZON.adjuntoInvalido;
    assert.equal(validarAdjunto({ mimetype: "application/pdf", size: 900, inicio: Buffer.from("MZ\x90\x00") }), texto, "un .exe renombrado");
    assert.equal(validarAdjunto({ mimetype: "image/png", size: 900, inicio: JPG }), texto, "un JPG que dice ser PNG");
    assert.equal(recursoDeAdjunto("application/pdf"), "raw");
    assert.equal(recursoDeAdjunto("image/png"), "image");
});

test("CB-18 · texto exacto cuando falla la subida", () => {
    assert.equal(MENSAJES_BUZON.subidaFallida, "No se pudo subir el archivo. Intenta de nuevo o envía el mensaje sin él.");
});

test("HU-18.3 · texto exacto al enviar", () => {
    assert.equal(MENSAJES_BUZON.enviado, "Mensaje enviado a SISVIA. Te avisamos en la campanita cuando respondan.");
});

test("HU-18.3 · la pantalla es solo una ruta de la app (nunca un enlace afuera)", () => {
    assert.equal(limpiarPantalla("/admin/vehiculos"), "/admin/vehiculos");
    assert.equal(limpiarPantalla("/admin/vehiculos/12a1?x=1"), "/admin/vehiculos/12a1?x=1");
    for (const mala of ["https://otro.com", "//otro.com/x", "javascript:alert(1)", "admin", "", "/" + "a".repeat(300), null]) {
        assert.equal(limpiarPantalla(mala), null, String(mala).slice(0, 30));
    }
});

test("HU-18.3 · el navegador y el sistema, en corto", () => {
    assert.equal(describirNavegador("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.80 Safari/537.36"), "Chrome 140 · Windows");
    assert.equal(describirNavegador("Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36"), "Samsung Internet 26 · Android");
    assert.equal(describirNavegador("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"), "Safari 18 · iOS");
    assert.equal(describirNavegador("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0"), "Edge 140 · Windows");
    assert.equal(describirNavegador(""), "Navegador desconocido · sistema desconocido");
});

test("HU-18.4 · RN-13 · al abrirlo el equipo SISVIA, un Nuevo pasa a En revisión", () => {
    assert.equal(estadoAlAbrir("nuevo", "superadmin"), "en_revision");
    assert.equal(estadoAlAbrir("nuevo", "admin_empresa"), "nuevo", "si lo abre la empresa, no cambia");
    assert.equal(estadoAlAbrir("resuelto", "superadmin"), "resuelto");
});

test("HU-18.4 · la bandeja pone los nuevos primero y, dentro de cada estado, lo último arriba", () => {
    const orden = ordenarBandeja([
        { id: "r", estado: "resuelto", actualizado_en: "2026-09-21T10:00:00Z" },
        { id: "e1", estado: "en_revision", actualizado_en: "2026-09-21T09:00:00Z" },
        { id: "n1", estado: "nuevo", actualizado_en: "2026-09-20T08:00:00Z" },
        { id: "e2", estado: "en_revision", actualizado_en: "2026-09-21T11:00:00Z" },
        { id: "n2", estado: "nuevo", actualizado_en: "2026-09-21T08:00:00Z" },
    ]).map((m) => m.id);
    assert.deepEqual(orden, ["n2", "n1", "e2", "e1", "r"]);
});

test("HU-18.5 · HU-18.6 · RN-13 · un hilo resuelto ya no se responde; el texto que ve la empresa", () => {
    assert.equal(puedeResponder("nuevo"), true);
    assert.equal(puedeResponder("en_revision"), true);
    assert.equal(puedeResponder("resuelto"), false);
    assert.equal(MENSAJES_BUZON.resuelto, "Resuelto. ¿Sigue pasando? Escribe un mensaje nuevo.");
});

test("HU-18.5 · CB-19 · a quién se avisa de cada respuesta", () => {
    const autor = { id: "a", activo: true };
    assert.deepEqual(destinatariosDeRespuesta({ deSisvia: true, autor, adminsActivos: ["a", "b"] }), ["a"], "SISVIA responde: a quien escribió");
    assert.deepEqual(destinatariosDeRespuesta({ deSisvia: true, autor: { id: "a", activo: false }, adminsActivos: ["b", "c"] }), ["b", "c"], "si ya no está activo, a los otros Administradores");
    assert.deepEqual(destinatariosDeRespuesta({ deSisvia: true, autor: null, adminsActivos: ["b"] }), ["b"], "si ya no existe, igual");
    assert.deepEqual(destinatariosDeRespuesta({ deSisvia: false, autor, equipoSisvia: ["s1", "s2", "s1"] }), ["s1", "s2"], "la empresa responde: al equipo SISVIA");
});

test("HU-18.5 · RN-12 · responder en Soporte no pide contraseña, ni adentro de una empresa", async () => {
    const { necesitaConfirmacion, requiereEntrar } = await import("../src/services/soporteReglas.js");
    const adentro = { rol: "superadmin", metodo: "POST", ruta: "/api/buzon/11111111-2222-4333-8444-555555555555/respuestas", empresaActiva: "11111111-2222-4333-8444-555555555555" };
    assert.equal(necesitaConfirmacion(adentro), false);
    assert.equal(requiereEntrar({ ...adentro, empresaActiva: null }), false);
});

test("base · no se le manda correo a dominios reservados para pruebas (solo rebotan)", async () => {
    const { esCorreoReal, destinosReales } = await import("../src/services/correoReglas.js");
    for (const falso of ["prueba.a@sisvia.test", "x@algo.example", "x@nada.invalid", "x@pc.localhost", "ana@example.com", "sin-arroba", ""]) {
        assert.equal(esCorreoReal(falso), false, falso);
    }
    assert.equal(esCorreoReal("martin@gmail.com"), true);
    assert.equal(esCorreoReal("ana@ejemplo.com"), true, "ejemplo.com no es un dominio reservado");
    assert.deepEqual(destinosReales(["a@gmail.com", "b@sisvia.test", null]), ["a@gmail.com"]);
});

test("base · interruptor del correo: CORREO_ACTIVO=0 lo apaga; 1 o sin la variable, encendido", async () => {
    const { estadoDelCorreo } = await import("../src/services/correoReglas.js");
    const conClaves = { usuario: "avisos@gmail.com", clave: "abcd efgh ijkl mnop" };
    assert.deepEqual(estadoDelCorreo({ ...conClaves, activo: "0" }), { encendido: false, motivo: "CORREO_ACTIVO=0" });
    assert.deepEqual(estadoDelCorreo({ ...conClaves, activo: " 0 " }), { encendido: false, motivo: "CORREO_ACTIVO=0" });
    assert.equal(estadoDelCorreo({ ...conClaves, activo: "1" }).encendido, true);
    assert.equal(estadoDelCorreo({ ...conClaves, activo: undefined }).encendido, true, "sin la variable (Railway hoy): encendido");
    assert.equal(estadoDelCorreo({ usuario: "", clave: "", activo: "1" }).encendido, false, "sin credenciales no hay correo");
});
