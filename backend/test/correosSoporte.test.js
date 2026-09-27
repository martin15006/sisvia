import { test } from "node:test";
import assert from "node:assert/strict";
import {
    VENTANA_MIRANDO_MIN,
    VENTANA_MIRANDO,
    MENSAJES_CORREOS,
    conCorreosPrendidos,
    destinatariosCorreoEquipo,
    reclamosALiberar,
    puedeElegirCorreosSoporte,
    leerInterruptor,
} from "../src/services/correosSoporteReglas.js";

// Pacto correos-de-soporte. La decision de si le toca correo a cada persona (HU-01.2-4,
// CB-03, CB-06, y los 10 minutos justos contra 9 min 59 s) la toma la base con
// reclamar_correo_buzon: esas pruebas estan en scratchpad/pgcorreos/pruebas.sql y en el
// script de API. Aca va lo que decide el backend antes y despues de preguntarle.

const martin = { id: "m", correos_soporte: true };
const sandra = { id: "s", correos_soporte: true };
const segundo = { id: "g", correos_soporte: false };

test("HU-01.4 · la ventana de 'la esta mirando' es de 10 minutos, y asi se le pasa a la base", () => {
    assert.equal(VENTANA_MIRANDO_MIN, 10);
    assert.equal(VENTANA_MIRANDO, "10 minutes");
});

test("HU-01.1 · el pie del correo, texto exacto (el nombre sale de la marca)", () => {
    assert.equal(MENSAJES_CORREOS.pie, "Mientras no abras esta conversación en SISVIA, no te llegan más correos de ella.");
});

test("HU-02.1 · nadie respondio todavia: a todo el equipo con los correos prendidos", () => {
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra], atiende: null }), ["m", "s"]);
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra, segundo] }), ["m", "s"]);
});

test("HU-02.2 · CB-05 · respondio alguien: solo a quien respondio por ultima vez", () => {
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra, segundo], atiende: "s" }), ["s"]);
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra, segundo], atiende: "m" }), ["m"]);
});

test("HU-02.3 · quien atiende apago sus correos: a los demas que los tienen prendidos", () => {
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra, segundo], atiende: "g" }), ["m", "s"]);
    // y si nadie mas los tiene prendidos, a nadie por correo (la campanita avisa igual)
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [segundo], atiende: "g" }), []);
});

test("CB-04 · quien atiende ya no esta en el equipo (desactivado o sin el rol): vuelve a todo el equipo", () => {
    assert.deepEqual(destinatariosCorreoEquipo({ equipo: [martin, sandra], atiende: "ya-no-esta" }), ["m", "s"]);
});

test("HU-03.3 · con los correos apagados no entra en la lista; sin el dato, cuenta como prendido", () => {
    assert.deepEqual(conCorreosPrendidos([martin, segundo, { id: "n" }]), ["m", "n"]);
    assert.deepEqual(conCorreosPrendidos([]), []);
});

test("CB-02 · si el correo fallo se liberan los reclamos; si salio, se omitio o no habia a quien, no", () => {
    const reclamos = [{ usuario_id: "m" }, { usuario_id: "s" }];
    assert.deepEqual(reclamosALiberar({ enviado: false, error: "Gmail caido" }, reclamos), reclamos);
    assert.deepEqual(reclamosALiberar({ enviado: true, cantidad: 2 }, reclamos), []);
    assert.deepEqual(reclamosALiberar({ enviado: false, omitido: true }, reclamos), []);
    assert.deepEqual(reclamosALiberar({ enviado: false, sinDestinatarios: true }, reclamos), []);
    assert.deepEqual(reclamosALiberar(null, reclamos), []);
});

test("HU-03.4 · solo el Administrador general y el de empresa eligen: texto exacto", () => {
    assert.equal(puedeElegirCorreosSoporte("superadmin"), true);
    assert.equal(puedeElegirCorreosSoporte("admin_empresa"), true);
    for (const rol of ["admin_departamental", "admin_sede", "conductor", undefined]) assert.equal(puedeElegirCorreosSoporte(rol), false, rol);
    assert.equal(MENSAJES_CORREOS.soloAdministradores, "Solo los Administradores reciben correos de Soporte.");
});

test("HU-03.2 · el interruptor acepta solo verdadero o falso, y sus textos exactos", () => {
    assert.equal(leerInterruptor({ activo: true }), true);
    assert.equal(leerInterruptor({ activo: false }), false);
    for (const cuerpo of [{}, { activo: "false" }, { activo: 0 }, null, undefined]) assert.equal(leerInterruptor(cuerpo), null, JSON.stringify(cuerpo));
    assert.equal(MENSAJES_CORREOS.apagados, "Listo: ya no te llegan correos de Soporte.");
    assert.equal(MENSAJES_CORREOS.prendidos, "Listo: te vuelven a llegar los correos de Soporte.");
});
