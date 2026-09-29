import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { normalizarIp, datosDeRespaldo, lineaDeRespaldo } from "../src/services/respaldoReglas.js";
import { contextoPedido, respaldoDelPedido } from "../src/middlewares/contextoPedido.js";
import { filaParaMostrar, armarPagina } from "../src/services/actividadReglas.js";

// Pacto portada-publica, enmienda 1: HU-07 (IP y navegador en el Registro del equipo) · RN-07.

const CHROME_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const equipo = { id: "m", rol: "superadmin", nombre_completo: "Martín" };

test("CB-14 · la IP real, sin el prefijo IPv4-en-IPv6", () => {
    assert.equal(normalizarIp("::ffff:190.24.10.5"), "190.24.10.5");
    assert.equal(normalizarIp("::FFFF:10.0.0.1"), "10.0.0.1");
    assert.equal(normalizarIp("190.24.10.5"), "190.24.10.5");
    assert.equal(normalizarIp("2800:e2:2780:1ae:0:0:0:1"), "2800:e2:2780:1ae:0:0:0:1");
    assert.equal(normalizarIp("::1"), "::1");
    assert.equal(normalizarIp(""), null);
    assert.equal(normalizarIp(undefined), null);
});

test("HU-07.1 · del equipo SISVIA se guardan la IP y el navegador", () => {
    assert.deepEqual(datosDeRespaldo({ usuario: equipo, ip: "::ffff:190.24.10.5", agente: CHROME_WINDOWS }),
        { ip: "190.24.10.5", navegador: "Chrome 140 · Windows" });
});

test("HU-07.3 · RN-07 · de la gente de las empresas no se guarda nada", () => {
    for (const rol of ["admin_empresa", "admin_departamental", "admin_sede", "admin", "conductor"]) {
        assert.deepEqual(datosDeRespaldo({ usuario: { rol }, ip: "190.24.10.5", agente: CHROME_WINDOWS }), {}, rol);
    }
    assert.deepEqual(datosDeRespaldo({ usuario: undefined, ip: "190.24.10.5", agente: CHROME_WINDOWS }), {});
});

test("CB-17 · sin navegador: la IP queda y el navegador dice 'desconocido'", () => {
    const r = datosDeRespaldo({ usuario: equipo, ip: "190.24.10.5", agente: "" });
    assert.deepEqual(r, { ip: "190.24.10.5", navegador: null });
    assert.equal(lineaDeRespaldo(r), "IP 190.24.10.5 · navegador desconocido");
});

test("HU-07.1 · HU-07.2 · la línea debajo del renglón; sin IP (lo de antes), no hay línea", () => {
    assert.equal(lineaDeRespaldo({ ip: "190.24.10.5", navegador: "Chrome 140 · Windows" }), "IP 190.24.10.5 · Chrome 140 · Windows");
    assert.equal(lineaDeRespaldo({ ip: null, navegador: null }), null);
    assert.equal(lineaDeRespaldo({}), null);
});

test("HU-07.1 · RN-07 · el Registro del equipo trae la línea; la Actividad de una empresa, nunca", () => {
    const fila = { id: "1", created_at: "2026-09-28T12:00:00Z", actor_nombre: "Martín", actor_cargo: "Administrador general", de_sisvia: true,
        tipo: "empresa", accion: "desactivada", empresa_nombre: "Taxis Sur", ip: "190.24.10.5", navegador: "Chrome 140 · Windows" };
    assert.equal(filaParaMostrar(fila, { conRespaldo: true }).respaldo, "IP 190.24.10.5 · Chrome 140 · Windows");
    assert.equal("respaldo" in filaParaMostrar(fila), false);
    assert.equal("respaldo" in armarPagina([fila]).actividad[0], false);
    assert.equal(armarPagina([fila], { conRespaldo: true }).actividad[0].respaldo, "IP 190.24.10.5 · Chrome 140 · Windows");
});

// El middleware real detrás de un proxy como el de Railway (trust proxy 1).
const servidor = async (usuario) => {
    const app = express();
    app.set("trust proxy", 1);
    app.use(contextoPedido);
    app.use((req, res, next) => { req.usuario = usuario; next(); }); // lo que hace verificarToken
    app.get("/", async (req, res) => {
        await new Promise((listo) => setTimeout(listo, 5)); // despues de un await, sigue dentro del pedido
        res.json(respaldoDelPedido());
    });
    const s = await new Promise((listo) => { const x = app.listen(0, "127.0.0.1", () => listo(x)); });
    return { s, url: `http://127.0.0.1:${s.address().port}/` };
};

test("CB-14 · HU-07.1 · detrás del proxy toma la IP del visitante, también después de un await", async () => {
    const { s, url } = await servidor(equipo);
    try {
        const r = await (await fetch(url, { headers: { "X-Forwarded-For": "190.24.10.5", "User-Agent": CHROME_WINDOWS } })).json();
        assert.deepEqual(r, { ip: "190.24.10.5", navegador: "Chrome 140 · Windows" });
    } finally {
        s.close();
    }
});

test("HU-07.3 · el middleware no da nada si quien pide no es del equipo, ni fuera de un pedido", async () => {
    const { s, url } = await servidor({ rol: "admin_empresa" });
    try {
        assert.deepEqual(await (await fetch(url, { headers: { "X-Forwarded-For": "190.24.10.5" } })).json(), {});
    } finally {
        s.close();
    }
    assert.deepEqual(respaldoDelPedido(), {});
});
