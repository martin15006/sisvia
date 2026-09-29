import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
    LARGOS, VEHICULOS_MAX, LIMITE_POR_HORA, CAMPO_TRAMPA, RUTA_SOLICITUDES, MENSAJES_SOLICITUD,
    validarSolicitud, esTrampa, textoCampanita, asuntoCorreo, destinosCorreo, enlaceWhatsApp, procesarSolicitud,
} from "../src/services/solicitudReglas.js";
import { MENSAJE_TELEFONO } from "../src/utils/telefono.js";
import { crearLimiteSolicitudes } from "../src/middlewares/limiteSolicitudes.js";
import { necesitaConfirmacion, requiereEntrar } from "../src/services/soporteReglas.js";

// Pacto portada-publica. Lo que pasa en la base (CB-08, borrar de verdad) y el HTML del
// correo (CB-02) se prueban contra el backend local: scratchpad/landing/pc-solicitudes.cjs.

const buena = () => ({
    empresa: "Transportes El Ejemplo S.A.S.", ciudad: "Ibagué", vehiculos: "25", nombre: "Ana Prueba",
    telefono: "300 123 4567", correo: "ana@ejemplo.com", mensaje: "Tenemos 3 sedes.", autorizo: true,
});
const errores = (cuerpo) => validarSolicitud(cuerpo).errores || {};
const n = (largo) => "x".repeat(largo);

test("HU-02.1 · una solicitud buena queda lista para guardar, normalizada", () => {
    const { datos, errores: e } = validarSolicitud(buena());
    assert.equal(e, undefined);
    assert.deepEqual(datos, {
        empresa: "Transportes El Ejemplo S.A.S.", ciudad: "Ibagué", nombre: "Ana Prueba", telefono: "3001234567",
        vehiculos: 25, correo: "ana@ejemplo.com", mensaje: "Tenemos 3 sedes.",
    });
});

test("HU-02.2 · cada obligatorio vacío o con solo espacios da su texto exacto", () => {
    for (const valor of ["", "   ", undefined, null]) {
        const e = errores({ ...buena(), empresa: valor, ciudad: valor, nombre: valor, telefono: valor });
        assert.equal(e.empresa, "Escribe el nombre de la empresa.");
        assert.equal(e.ciudad, "Escribe la ciudad.");
        assert.equal(e.nombre, "Escribe tu nombre.");
        assert.equal(e.telefono, "Escribe un teléfono o WhatsApp.");
    }
});

test("HU-02.3 · CB-03 · el teléfono usa la regla de SISVIA y se guarda normalizado", () => {
    assert.equal(validarSolicitud({ ...buena(), telefono: "+57 300 123-4567" }).datos.telefono, "+573001234567");
    assert.equal(validarSolicitud({ ...buena(), telefono: "300-123-4567" }).datos.telefono, "3001234567");
    assert.equal(validarSolicitud({ ...buena(), telefono: "+584121234567" }).datos.telefono, "+584121234567");
    assert.equal(errores({ ...buena(), telefono: "300123456" }).telefono, MENSAJE_TELEFONO);   // 9 dígitos
    assert.equal(errores({ ...buena(), telefono: "30012345678" }).telefono, MENSAJE_TELEFONO); // 11
    assert.equal(errores({ ...buena(), telefono: "6011234567" }).telefono, MENSAJE_TELEFONO);  // fijo
});

test("HU-02.4 · vehículos: entero de 1 a 9999, opcional", () => {
    assert.equal(VEHICULOS_MAX, 9999);
    assert.equal(validarSolicitud({ ...buena(), vehiculos: "1" }).datos.vehiculos, 1);
    assert.equal(validarSolicitud({ ...buena(), vehiculos: "9999" }).datos.vehiculos, 9999);
    assert.equal(validarSolicitud({ ...buena(), vehiculos: "" }).datos.vehiculos, null);
    for (const malo of ["0", "10000", "2.5", "-3", "25 aprox", "abc"]) {
        assert.equal(errores({ ...buena(), vehiculos: malo }).vehiculos, "Los vehículos van en número, de 1 a 9999.", malo);
    }
});

test("HU-02.4 · correo opcional con forma de correo; mensaje libre", () => {
    assert.equal(validarSolicitud({ ...buena(), correo: "" }).datos.correo, null);
    assert.equal(validarSolicitud({ ...buena(), mensaje: "  " }).datos.mensaje, null);
    for (const malo of ["ana", "ana@", "ana@ejemplo", "ana @ejemplo.com"]) {
        assert.equal(errores({ ...buena(), correo: malo }).correo, "Revisa el correo: debe verse como nombre@empresa.com.", malo);
    }
});

test("HU-02.5 · cada texto entra con su largo máximo y no con uno más", () => {
    assert.deepEqual(LARGOS, { empresa: 120, ciudad: 80, nombre: 100, correo: 254, mensaje: 1000 });
    for (const campo of ["empresa", "ciudad", "nombre", "mensaje"]) {
        assert.equal(validarSolicitud({ ...buena(), [campo]: n(LARGOS[campo]) }).errores, undefined, campo);
        assert.equal(errores({ ...buena(), [campo]: n(LARGOS[campo] + 1) })[campo], `Máximo ${LARGOS[campo]} caracteres.`, campo);
    }
    const correo = (largo) => `${"a".repeat(largo - "@ejemplo.com".length)}@ejemplo.com`;
    assert.equal(validarSolicitud({ ...buena(), correo: correo(254) }).errores, undefined);
    assert.equal(errores({ ...buena(), correo: correo(255) }).correo, "Máximo 254 caracteres.");
});

test("HU-02.7 · sin la casilla de autorización no se guarda", () => {
    for (const autorizo of [false, undefined, "true", 1, "on"]) {
        assert.equal(errores({ ...buena(), autorizo }).autorizo, "Marca la casilla para que podamos guardar tus datos.", String(autorizo));
    }
    assert.equal(validarSolicitud(buena()).errores, undefined);
});

test("CB-02 · el HTML se guarda como texto, sin tocarlo", () => {
    const { datos } = validarSolicitud({ ...buena(), empresa: "<b>Hola</b>", mensaje: "<script>alert(1)</script>" });
    assert.equal(datos.empresa, "<b>Hola</b>");
    assert.equal(datos.mensaje, "<script>alert(1)</script>");
});

// Dependencias falsas para procesarSolicitud: anotan lo que pasó.
const falsas = (cambios = {}) => {
    const hecho = { guardadas: [], campanitas: [], correos: [], registrados: [] };
    const deps = {
        guardar: async (d) => { hecho.guardadas.push(d); return { id: "s1", ...d }; },
        idsEquipo: async () => ["m", "s"],
        notificar: async (a) => { hecho.campanitas.push(a); },
        enviarCorreo: async (c) => { hecho.correos.push(c); return { enviado: true }; },
        contacto: "sisviacontacto@gmail.com",
        copia: "",
        registrar: (e) => hecho.registrados.push(e.message),
        ...cambios,
    };
    return { hecho, deps };
};

test("HU-02.1 · HU-03.1 · HU-03.2 · se guarda con la hora de la autorización, y avisa en la campanita y por correo", async () => {
    const { hecho, deps } = falsas({ copia: "martin@correo.com" });
    const r = await procesarSolicitud(buena(), deps);
    assert.equal(r.ok, true);
    assert.equal(hecho.guardadas.length, 1);
    assert.ok(!Number.isNaN(Date.parse(hecho.guardadas[0].autorizo_datos_en)));
    const avisos = await r.avisos;
    assert.equal(avisos.campanita, 2);
    assert.deepEqual(hecho.campanitas[0], {
        ids: ["m", "s"], titulo: "Nueva solicitud de cita", mensaje: "Transportes El Ejemplo S.A.S. · Ibagué · 25 vehículos", ruta: "/admin/solicitudes?solicitud=s1",
    });
    assert.equal(hecho.correos.length, 1);
    assert.deepEqual(hecho.correos[0].para, ["sisviacontacto@gmail.com", "martin@correo.com"]);
    assert.equal(hecho.correos[0].asunto, "Nueva solicitud de cita: Transportes El Ejemplo S.A.S.");
});

test("HU-02.2 · con errores no se guarda ni se avisa a nadie", async () => {
    const { hecho, deps } = falsas();
    const r = await procesarSolicitud({ ...buena(), autorizo: false }, deps);
    assert.deepEqual(r, { ok: false, errores: { autorizo: MENSAJES_SOLICITUD.autorizo } });
    assert.equal(hecho.guardadas.length + hecho.campanitas.length + hecho.correos.length, 0);
});

test("HU-03.1 · el texto de la campanita, con y sin vehículos", () => {
    assert.deepEqual(textoCampanita({ empresa: "Taxis Sur", ciudad: "Neiva", vehiculos: null }),
        { titulo: "Nueva solicitud de cita", mensaje: "Taxis Sur · Neiva" });
    assert.equal(textoCampanita({ empresa: "Taxis Sur", ciudad: "Neiva", vehiculos: 1 }).mensaje, "Taxis Sur · Neiva · 1 vehículo");
    assert.equal(textoCampanita({ empresa: "Taxis Sur", ciudad: "Neiva", vehiculos: 140 }).mensaje, "Taxis Sur · Neiva · 140 vehículos");
    assert.equal(RUTA_SOLICITUDES, "/admin/solicitudes");
});

test("HU-03.2 · el correo va al de contacto y a la copia, sin repetir ni aceptar una copia mal escrita", () => {
    assert.equal(asuntoCorreo({ empresa: "Taxis Sur" }), "Nueva solicitud de cita: Taxis Sur");
    assert.deepEqual(destinosCorreo("sisviacontacto@gmail.com", ""), ["sisviacontacto@gmail.com"]);
    assert.deepEqual(destinosCorreo("sisviacontacto@gmail.com", undefined), ["sisviacontacto@gmail.com"]);
    assert.deepEqual(destinosCorreo("sisviacontacto@gmail.com", " yo@correo.com "), ["sisviacontacto@gmail.com", "yo@correo.com"]);
    assert.deepEqual(destinosCorreo("sisviacontacto@gmail.com", "SisviaContacto@gmail.com"), ["sisviacontacto@gmail.com"]);
    assert.deepEqual(destinosCorreo("sisviacontacto@gmail.com", "no-es-correo"), ["sisviacontacto@gmail.com"]);
});

test("HU-03.2 · el enlace de WhatsApp del número que dejó", () => {
    assert.equal(enlaceWhatsApp("3001234567"), "https://wa.me/573001234567");
    assert.equal(enlaceWhatsApp("+584121234567"), "https://wa.me/584121234567");
    assert.equal(enlaceWhatsApp("6011234567"), null);
});

test("CB-05 · con el campo trampa lleno responde como éxito, sin guardar ni avisar", async () => {
    assert.equal(CAMPO_TRAMPA, "sitio_web");
    assert.equal(esTrampa({ sitio_web: "" }), false);
    assert.equal(esTrampa({ sitio_web: "   " }), false);
    const { hecho, deps } = falsas();
    const r = await procesarSolicitud({ ...buena(), sitio_web: "http://spam.example" }, deps);
    assert.deepEqual(r, { ok: true, trampa: true });
    assert.equal(hecho.guardadas.length + hecho.campanitas.length + hecho.correos.length, 0);
});

test("RN-06 · CB-06 · con el correo apagado, o si falla, la solicitud queda guardada y la campanita avisa", async () => {
    for (const enviarCorreo of [async () => ({ enviado: false, omitido: true }), async () => { throw new Error("SMTP caído"); }]) {
        const { hecho, deps } = falsas({ enviarCorreo });
        const r = await procesarSolicitud(buena(), deps);
        assert.equal(r.ok, true);
        assert.equal(hecho.guardadas.length, 1);
        assert.equal((await r.avisos).campanita, 2);
    }
});

test("RN-06 · si falla la campanita, la solicitud queda guardada y el correo sale igual", async () => {
    const { hecho, deps } = falsas({ notificar: async () => { throw new Error("base caída"); } });
    const r = await procesarSolicitud(buena(), deps);
    await r.avisos;
    assert.equal(r.ok, true);
    assert.equal(hecho.correos.length, 1);
    assert.deepEqual(hecho.registrados, ["base caída"]);
});

test("CB-07 · sin ningún superadmin activo, se guarda y el correo sale igual", async () => {
    const { hecho, deps } = falsas({ idsEquipo: async () => [] });
    const r = await procesarSolicitud(buena(), deps);
    const avisos = await r.avisos;
    assert.equal(avisos.campanita, 0);
    assert.equal(hecho.campanitas.length, 0);
    assert.equal(hecho.correos.length, 1);
});

// Servidor de prueba con el limitador real (RN-04): 201 si el cuerpo trae ok, 400 si no.
const servidorConLimite = async () => {
    const app = express();
    app.use(express.json());
    app.post("/", crearLimiteSolicitudes(), (req, res) => (req.body.ok ? res.status(201).json({ ok: true }) : res.status(400).json({ error: "mal" })));
    const servidor = await new Promise((listo) => { const s = app.listen(0, "127.0.0.1", () => listo(s)); });
    const url = `http://127.0.0.1:${servidor.address().port}/`;
    const enviar = (ok) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok }) });
    return { servidor, enviar };
};

test("CB-04 · RN-04 · la 5.ª solicitud de la hora pasa y la 6.ª no, con el texto", async () => {
    assert.equal(LIMITE_POR_HORA, 5);
    const { servidor, enviar } = await servidorConLimite();
    try {
        for (let i = 1; i <= 5; i++) assert.equal((await enviar(true)).status, 201, `solicitud ${i}`);
        const sexta = await enviar(true);
        assert.equal(sexta.status, 429);
        assert.deepEqual(await sexta.json(), {
            error: "Ya recibimos varias solicitudes desde esta conexión. Intenta de nuevo en una hora o escríbenos por WhatsApp.",
        });
    } finally {
        servidor.close();
    }
});

test("RN-04 · un error de validación no gasta intentos", async () => {
    const { servidor, enviar } = await servidorConLimite();
    try {
        for (let i = 0; i < 8; i++) assert.equal((await enviar(false)).status, 400);
        for (let i = 1; i <= 5; i++) assert.equal((await enviar(true)).status, 201, `solicitud ${i}`);
    } finally {
        servidor.close();
    }
});

test("HU-04.3 · marcar o borrar una solicitud es del equipo SISVIA: adentro de una empresa no pide contraseña, afuera no pide entrar", () => {
    const base = { rol: "superadmin", metodo: "PATCH", ruta: "/api/solicitudes/0b1c2d3e-0000-4000-8000-000000000000/contactada" };
    assert.equal(necesitaConfirmacion({ ...base, empresaActiva: "e1" }), false);
    assert.equal(necesitaConfirmacion({ ...base, metodo: "DELETE", ruta: "/api/solicitudes/x", empresaActiva: "e1" }), false);
    assert.equal(requiereEntrar({ ...base, empresaActiva: null }), false);
});

test("HU-04.4 · ver, marcar y borrar solicitudes: solo el superadmin; los demás, 403", async () => {
    process.env.SUPABASE_URL ??= "http://127.0.0.1:9";
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= "prueba";
    const { ROLES_EQUIPO } = await import("../src/routes/solicitudes.routes.js");
    const { requiereRol } = await import("../src/middlewares/auth.middleware.js");
    assert.deepEqual(ROLES_EQUIPO, ["superadmin"]);
    const guardia = requiereRol(...ROLES_EQUIPO);
    const probar = (usuario) => {
        let status = null, siguio = false;
        const res = { status: (s) => { status = s; return res; }, json: () => res };
        guardia({ usuario }, res, () => { siguio = true; });
        return siguio ? "pasa" : status;
    };
    assert.equal(probar({ rol: "superadmin" }), "pasa");
    for (const rol of ["admin_empresa", "admin_departamental", "admin_sede", "admin", "conductor"]) assert.equal(probar({ rol }), 403, rol);
    assert.equal(probar({ rol: "conductor", es_pool: true, suplencia: { sede: 1 } }), 403, "suplente");
    assert.equal(probar(undefined), 403, "sin usuario");
});

// ----- Enmienda 1 (2026-09-28) -----

test("HU-02.8 · Tu nombre: solo letras, espacios, apóstrofe, guion y punto", () => {
    for (const bueno of ["María José", "O'Neil", "O’Neil", "Ana-Lucía", "Juan Jr.", "Ñusta Müller", "Zoë"]) {
        assert.equal(validarSolicitud({ ...buena(), nombre: bueno }).errores, undefined, bueno);
    }
    for (const malo of ["Ana 2", "Ana@", "Ana #1", "Ana $", "Ana/Luis", "4na", "Ana_López", "Ana, Luis"]) {
        assert.equal(errores({ ...buena(), nombre: malo }).nombre, "El nombre solo lleva letras.", malo);
    }
});

test("HU-02.8 · CB-15 · Ciudad sin números; la Empresa acepta números y símbolos", () => {
    for (const buena2 of ["Bogotá D.C.", "San José del Guaviare", "Cartagena de Indias (D.T.)", "Ibagué"]) {
        assert.equal(validarSolicitud({ ...buena(), ciudad: buena2 }).errores, undefined, buena2);
    }
    for (const mala of ["Ibagué 7", "Neiva2", "Calle 10"]) {
        assert.equal(errores({ ...buena(), ciudad: mala }).ciudad, "La ciudad no lleva números.", mala);
    }
    assert.equal(validarSolicitud({ ...buena(), empresa: "Transportes 2000 S.A.S. & Cía #1" }).errores, undefined);
});

test("HU-02.8 · el vacío y el largo se avisan antes que la forma", () => {
    assert.equal(errores({ ...buena(), nombre: "   " }).nombre, "Escribe tu nombre.");
    assert.equal(errores({ ...buena(), ciudad: `${"x".repeat(80)}1` }).ciudad, "Máximo 80 caracteres.");
});

test("HU-04.5 · marcar o borrar deja su renglón en el Registro del equipo, con su texto", async () => {
    const { filaDeRegistro } = await import("../src/services/solicitudReglas.js");
    const { describirActividad } = await import("../src/services/actividadReglas.js");
    const solicitud = { id: "s1", empresa: "Taxis Sur", ciudad: "Neiva" };
    const fila = filaDeRegistro({ usuario: { id: "m", nombre_completo: "Martín" }, solicitud, accion: "contactada" });
    assert.deepEqual(fila, {
        empresa_id: null, empresa_nombre: null, actor_id: "m", actor_nombre: "Martín", actor_cargo: "Administrador general",
        de_sisvia: true, tipo: "solicitud", accion: "contactada", objeto_id: "s1", objeto: "Taxis Sur", detalles: { ciudad: "Neiva" },
    });
    assert.equal(describirActividad(fila), "Marcó como contactada la solicitud de Taxis Sur · Neiva");
    assert.equal(describirActividad({ ...fila, accion: "borrada" }), "Borró la solicitud de Taxis Sur · Neiva");
    assert.equal(MENSAJES_SOLICITUD.primeroContactada, "Primero márcala como contactada.");
});

// ----- Enmienda 2 (2026-09-28) -----

test("HU-03.1 · el aviso lleva a su solicitud", async () => {
    const { rutaDeSolicitud, TIPO_AVISO } = await import("../src/services/solicitudReglas.js");
    assert.equal(rutaDeSolicitud("8b6fedb1-0000-4000-8000-000000000001"), "/admin/solicitudes?solicitud=8b6fedb1-0000-4000-8000-000000000001");
    assert.equal(TIPO_AVISO, "solicitud_cita");
});

test("CB-18 · los avisos de antes (solo /admin/solicitudes) nunca coinciden con la dirección de una solicitud", async () => {
    const { rutaDeSolicitud } = await import("../src/services/solicitudReglas.js");
    assert.notEqual(rutaDeSolicitud("s1"), RUTA_SOLICITUDES);
    assert.notEqual(rutaDeSolicitud("s1"), rutaDeSolicitud("s2"));
});
