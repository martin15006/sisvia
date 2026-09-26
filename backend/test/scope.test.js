import { test } from "node:test";
import assert from "node:assert/strict";
import { alcanceDe, empresaDe, aplicarScope, usuarioEnScope, UUID_IMPOSIBLE, deLaEmpresa, baseODeLaEmpresa } from "../src/services/scopeReglas.js";

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

// Query falsa que anota los filtros que le aplican.
const queryFalsa = () => {
    const filtros = [];
    const q = {
        filtros,
        eq: (col, val) => { filtros.push(["eq", col, val]); return q; },
        in: (col, val) => { filtros.push(["in", col, val]); return q; },
        or: (expr) => { filtros.push(["or", expr]); return q; },
    };
    return q;
};

test("RNF-03 · alcance según el rol", () => {
    assert.equal(alcanceDe({ rol: "superadmin" }, "superadmin"), "global");
    assert.equal(alcanceDe({ rol: "superadmin", empresaActiva: A }, "superadmin"), "empresa");
    assert.equal(alcanceDe({ rol: "admin_empresa" }, "admin_empresa"), "empresa");
    assert.equal(alcanceDe({ rol: "admin_departamental" }, "admin_departamental"), "departamento");
    assert.equal(alcanceDe({ rol: "admin_sede" }, "admin_sede"), "sede");
    assert.equal(alcanceDe({ rol: "conductor" }, "conductor"), "sede");
    assert.equal(alcanceDe({ rol: "conductor", es_pool: true, suplencia: {} }, "conductor"), "pool");
    assert.equal(alcanceDe({ rol: "admin", sede_id: "s1" }, "admin"), "sede");
    assert.equal(alcanceDe({ rol: "admin" }, "admin"), "empresa");      // antes era global
    assert.equal(alcanceDe({ rol: "jefe" }, "jefe"), "ninguno");
});

test("RNF-03 · la empresa del scope", () => {
    assert.equal(empresaDe({ empresa_id: A }, "admin_sede"), A);
    assert.equal(empresaDe({ empresa_id: A, empresaActiva: B }, "admin_sede"), A);   // solo el superadmin elige
    assert.equal(empresaDe({ empresaActiva: B }, "superadmin"), B);
    assert.equal(empresaDe({}, "superadmin"), null);
});

test("RNF-03 · aplicarScope: global no filtra", () => {
    const q = queryFalsa();
    aplicarScope(q, { tipo: "global" });
    assert.deepEqual(q.filtros, []);
});

test("RNF-03 · aplicarScope: toda la empresa filtra solo por empresa", () => {
    const q = queryFalsa();
    aplicarScope(q, { tipo: "sedes", empresaId: A, todaLaEmpresa: true, sedeIds: ["s1"] });
    assert.deepEqual(q.filtros, [["eq", "empresa_id", A]]);
});

test("RNF-03 · aplicarScope: una sede filtra por empresa Y sede", () => {
    const q = queryFalsa();
    aplicarScope(q, { tipo: "sedes", empresaId: A, todaLaEmpresa: false, sedeIds: ["s1", "s2"] });
    assert.deepEqual(q.filtros, [["eq", "empresa_id", A], ["in", "sede_id", ["s1", "s2"]]]);
});

test("RNF-03 · aplicarScope: sin empresa o sin sedes no devuelve nada", () => {
    const q1 = queryFalsa();
    aplicarScope(q1, { tipo: "sedes", empresaId: null, todaLaEmpresa: true });
    assert.deepEqual(q1.filtros, [["eq", "empresa_id", UUID_IMPOSIBLE]]);
    const q2 = queryFalsa();
    aplicarScope(q2, { tipo: "sedes", empresaId: A, todaLaEmpresa: false, sedeIds: [] });
    assert.deepEqual(q2.filtros, [["eq", "empresa_id", A], ["in", "sede_id", [UUID_IMPOSIBLE]]]);
});

test("HU-06.3 · usuarioEnScope: otra empresa nunca, aunque sea la misma sede o departamento", () => {
    const scopeRegional = { tipo: "sedes", empresaId: A, todaLaEmpresa: false, sedeIds: ["s1"], departamentoIds: ["tolima"], ciudadIds: [] };
    assert.equal(usuarioEnScope(scopeRegional, { empresa_id: A, sede_id: "s1" }), true);
    assert.equal(usuarioEnScope(scopeRegional, { empresa_id: B, sede_id: "s1" }), false);
    assert.equal(usuarioEnScope(scopeRegional, { empresa_id: B, departamento_id: "tolima" }), false);
    assert.equal(usuarioEnScope(scopeRegional, { empresa_id: null, departamento_id: "tolima" }), false);  // superadmin
    assert.equal(usuarioEnScope(scopeRegional, { empresa_id: A, sede_id: "otra" }), false);
});

test("HU-06.1 · usuarioEnScope: toda la empresa ve a todos los de su empresa y a nadie más", () => {
    const scopeEmpresa = { tipo: "sedes", empresaId: A, todaLaEmpresa: true, sedeIds: [] };
    assert.equal(usuarioEnScope(scopeEmpresa, { empresa_id: A }), true);
    assert.equal(usuarioEnScope(scopeEmpresa, { empresa_id: B }), false);
    assert.equal(usuarioEnScope(scopeEmpresa, { sede_id: "s1" }), false);   // sin empresa_id: no se arriesga
    assert.equal(usuarioEnScope({ tipo: "global" }, { empresa_id: B }), true);
});

test("HU-06.2 · filtroEmpresa: lo de otra empresa no aparece al buscar por id", async () => {
    const { filtroEmpresa } = await import("../src/services/scopeReglas.js");
    assert.deepEqual(filtroEmpresa({ rol: "superadmin" }), {});                                  // equipo SISVIA: sin filtro
    assert.deepEqual(filtroEmpresa({ rol: "superadmin", empresaActiva: B }), { empresa_id: B });  // dentro de una empresa
    assert.deepEqual(filtroEmpresa({ rol: "admin_sede", empresa_id: A }), { empresa_id: A });
    assert.deepEqual(filtroEmpresa({ rol: "conductor", empresa_id: A }), { empresa_id: A });
    assert.deepEqual(filtroEmpresa({ rol: "admin_sede" }), { empresa_id: UUID_IMPOSIBLE });       // sin empresa: nada
});

test("HU-09.2 · areaFueraDeScope: el Administrador de empresa asigna cualquier departamento, pero solo sus sedes", async () => {
    const { areaFueraDeScope } = await import("../src/services/scopeReglas.js");
    const empresa = { tipo: "sedes", empresaId: A, todaLaEmpresa: true, sedeIds: ["s1"], departamentoIds: [], ciudadIds: [] };
    assert.equal(areaFueraDeScope(empresa, { departamento_id: "tolima" }), false);
    assert.equal(areaFueraDeScope(empresa, { sede_id: "s1" }), false);
    assert.equal(areaFueraDeScope(empresa, { sede_id: "sede-de-B" }), true);
    const regional = { tipo: "sedes", empresaId: A, todaLaEmpresa: false, sedeIds: ["s1"], departamentoIds: ["tolima"], ciudadIds: ["ibague"] };
    assert.equal(areaFueraDeScope(regional, { departamento_id: "tolima" }), false);
    assert.equal(areaFueraDeScope(regional, { departamento_id: "huila" }), true);   // como antes
    assert.equal(areaFueraDeScope({ tipo: "global" }, { sede_id: "cualquiera" }), false);
});

test("RNF-03 · deLaEmpresa: el filtro único por una empresa; sin empresa, nada", () => {
    const q1 = queryFalsa();
    deLaEmpresa(q1, A);
    assert.deepEqual(q1.filtros, [["eq", "empresa_id", A]]);
    const q2 = queryFalsa();
    deLaEmpresa(q2, null);
    assert.deepEqual(q2.filtros, [["eq", "empresa_id", UUID_IMPOSIBLE]], "nunca «todas»");
});

test("RNF-03 · RN-07 · baseODeLaEmpresa: el catálogo base y el de la empresa; nada raro se cuela", () => {
    const q1 = queryFalsa();
    baseODeLaEmpresa(q1, A);
    assert.deepEqual(q1.filtros, [["or", `empresa_id.is.null,empresa_id.eq.${A}`]]);
    const q2 = queryFalsa();
    baseODeLaEmpresa(q2, null);
    assert.deepEqual(q2.filtros, [["or", "empresa_id.is.null"]], "sin empresa, solo el base");
    const q3 = queryFalsa();
    baseODeLaEmpresa(q3, `${B}),id.gt.0`);
    assert.deepEqual(q3.filtros, [["or", "empresa_id.is.null"]], "un id que no es UUID no entra al filtro");
});
