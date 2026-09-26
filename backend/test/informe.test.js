import { test } from "node:test";
import assert from "node:assert/strict";
import { textoInforme } from "../src/services/informeReglas.js";

test("base · el informe en la campanita lleva asunto, mensaje y resumen", () => {
    const texto = textoInforme({
        asunto: "Falla en la sede",
        mensaje: "  Se dañó el portón.  ",
        area: "Sede Norte",
        resumen: { vehiculos: 12, criticos: 1, noOperativos: 0, chequeosHoy: 5 },
        correoEnviado: false,
    });
    assert.equal(texto, "Asunto: Falla en la sede\nSe dañó el portón.\nResumen de Sede Norte: 12 vehículos · 1 crítico · 0 no operativos · 5 chequeos hoy");
});

test("base · sin resumen no lo agrega; con correo avisa la copia", () => {
    const texto = textoInforme({ asunto: "Informe", mensaje: "Hola", area: "", resumen: null, correoEnviado: true });
    assert.equal(texto, "Asunto: Informe\nHola\n📧 También te llegó una copia a tu correo.");
});

test("HU-18.10 · el informe que cae en el equipo SISVIA no ofrece el resumen del área", async () => {
    const { ofreceResumen } = await import("../src/services/informeReglas.js");
    assert.equal(ofreceResumen({ ids: ["s"], etiqueta: "el equipo SISVIA", equipoSisvia: true }), false);
    assert.equal(ofreceResumen({ ids: ["a"], etiqueta: "la Administración de tu empresa" }), true);
    assert.equal(ofreceResumen({ ids: ["d"], etiqueta: "el Director Regional de Tolima" }), true);
});
