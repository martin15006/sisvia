// Pruebas de las reglas de bloqueo del vehiculo.
// Pacto: docs/pactos/2026-09-16-identidad-y-correcciones.md · HU-03, RN-01, RN-02
//
// Correr: `npm test` dentro de backend/ (usa el ejecutor nativo de Node).

import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoBloqueo, primerDocumentoVencido } from "../src/services/bloqueoVehiculo.js";

// Fechas construidas en hora LOCAL (new Date(anio, mes, dia)) para que las
// pruebas den lo mismo en cualquier zona horaria.
const HOY = new Date(2026, 8, 16); // 16 de septiembre de 2026
const diasDesdeHoy = (n) => new Date(2026, 8, 16 + n);

const vehiculo = (cambios = {}) => ({
    placa: "TST-001",
    activo: true,
    estado: "operativo",
    soat_vencimiento: diasDesdeHoy(200),
    rtm_vencimiento: diasDesdeHoy(200),
    extintor_vencimiento: diasDesdeHoy(200),
    ...cambios,
});

const MENSAJE_CRITICO =
    "No puedes operar este vehículo: está en estado crítico. Avísale al Coordinador de sede para que lo revise.";
const MENSAJE_NO_OPERATIVO =
    "No puedes operar este vehículo: está marcado como no operativo. Avísale al Coordinador de sede para que lo revise.";

// ── HU-03 ──────────────────────────────────────────────────────────────────

test("HU-03.1 · crítico rechaza el preoperacional con el mensaje exacto", () => {
    const motivo = motivoBloqueo(vehiculo({ estado: "critico" }), "preoperacional", HOY);
    assert.equal(motivo.razon, "critico");
    assert.equal(motivo.mensaje, MENSAJE_CRITICO);
});

test("HU-03.2 · no operativo rechaza el preoperacional con el mensaje exacto", () => {
    const motivo = motivoBloqueo(vehiculo({ estado: "no_operativo" }), "preoperacional", HOY);
    assert.equal(motivo.razon, "no_operativo");
    assert.equal(motivo.mensaje, MENSAJE_NO_OPERATIVO);
});

test("HU-03.3 · crítico y no operativo permiten el postoperacional", () => {
    for (const estado of ["critico", "no_operativo"]) {
        assert.equal(
            motivoBloqueo(vehiculo({ estado }), "postoperacional", HOY),
            null,
            `el postoperacional con estado ${estado} debería permitirse`
        );
    }
});

// El límite de la regla: de los cinco estados, bloquean exactamente dos.
test("HU-03.4 · operativo, observación y alerta permiten el preoperacional", () => {
    for (const estado of ["operativo", "observacion", "alerta"]) {
        assert.equal(
            motivoBloqueo(vehiculo({ estado }), "preoperacional", HOY),
            null,
            `el estado ${estado} no debería bloquear`
        );
    }
});

test("HU-03.5 · al pasar de crítico a operativo se puede iniciar en el siguiente intento", () => {
    const camion = vehiculo({ estado: "critico" });
    assert.equal(motivoBloqueo(camion, "preoperacional", HOY).razon, "critico");

    camion.estado = "operativo"; // el coordinador cambia el estado
    assert.equal(motivoBloqueo(camion, "preoperacional", HOY), null);
});

// ── Casos borde ────────────────────────────────────────────────────────────

test("CB-01 · crítico con SOAT vencido informa el documento: es más grave", () => {
    const motivo = motivoBloqueo(
        vehiculo({ estado: "critico", soat_vencimiento: diasDesdeHoy(-6) }),
        "preoperacional",
        HOY
    );
    assert.equal(motivo.razon, "documento_vencido");
    assert.match(motivo.mensaje, /^No puedes operar este vehículo: el SOAT está vencido \(desde el /);
    assert.notEqual(motivo.mensaje, MENSAJE_CRITICO);
});

// RN-02: la regla mira el vehículo que recibe al iniciar, no una lista vieja.
test("CB-02 · la lista abierta decía crítico pero al iniciar ya es operativo: se permite", () => {
    const enLaListaVieja = vehiculo({ estado: "critico" });
    const recienLeidoDeLaBase = { ...enLaListaVieja, estado: "operativo" };

    assert.equal(motivoBloqueo(enLaListaVieja, "preoperacional", HOY).razon, "critico");
    assert.equal(motivoBloqueo(recienLeidoDeLaBase, "preoperacional", HOY), null);
});

// ── Lo que ya funcionaba sigue igual ───────────────────────────────────────

test("base · el orden de gravedad es desactivado, documento, no operativo, crítico", () => {
    const todo = { activo: false, estado: "critico", soat_vencimiento: diasDesdeHoy(-1) };
    assert.equal(motivoBloqueo(vehiculo(todo), "preoperacional", HOY).razon, "desactivado");

    assert.equal(
        motivoBloqueo(vehiculo({ ...todo, activo: true }), "preoperacional", HOY).razon,
        "documento_vencido"
    );
    assert.equal(
        motivoBloqueo(vehiculo({ estado: "no_operativo" }), "preoperacional", HOY).razon,
        "no_operativo"
    );
});

test("base · el documento que vence hoy todavía vale; el que venció ayer bloquea", () => {
    assert.equal(primerDocumentoVencido(vehiculo({ soat_vencimiento: diasDesdeHoy(0) }), HOY), null);

    const ayer = primerDocumentoVencido(vehiculo({ soat_vencimiento: diasDesdeHoy(-1) }), HOY);
    assert.equal(ayer.nombre, "SOAT");
    assert.equal(ayer.diasVencido, 1);
});

test("base · el mensaje de documento vencido no cambió de texto", () => {
    const motivo = motivoBloqueo(
        vehiculo({ rtm_vencimiento: diasDesdeHoy(-10) }),
        "preoperacional",
        HOY
    );
    const fecha = diasDesdeHoy(-10).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    assert.equal(
        motivo.mensaje,
        `No puedes operar este vehículo: el revisión técnico-mecánica (RTM) está vencido (desde el ${fecha}). Avísale al Coordinador de sede para que lo renueve.`
    );
});

test("base · la línea del panel dice 1 día en singular y 2 días en plural", () => {
    const uno = motivoBloqueo(vehiculo({ soat_vencimiento: diasDesdeHoy(-1) }), "preoperacional", HOY);
    const dos = motivoBloqueo(vehiculo({ soat_vencimiento: diasDesdeHoy(-2) }), "preoperacional", HOY);
    assert.equal(uno.detalle, "SOAT vencido hace 1 día");
    assert.equal(dos.detalle, "SOAT vencido hace 2 días");
});
