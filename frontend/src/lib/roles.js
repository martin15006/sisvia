// Jerarquia de roles en el FRONTEND.
// ESPEJO de backend/src/services/jerarquia.service.js — si cambias alla, cambia aca.
//
// Sirve para que la UI muestre solo lo que el admin actual puede hacer (que roles
// puede crear, que nivel de territorio asignar). La seguridad REAL la impone el
// backend; esto es solo para no ofrecer opciones que igual serian rechazadas.
//
// NOTA (12 jun 2026): se eliminaron admin_regional y admin_ciudad. El producto no los
// usa: una "Regional" equivale a un departamento (Director Regional).
// Quedan 4 roles + el alias historico 'admin'.

export const RANGO_ROL = {
    superadmin: 4,
    admin_empresa: 3,
    admin_departamental: 2,
    admin_sede: 1,
    admin: 1, // alias historico de admin_sede
    conductor: 0,
};

export const ETIQUETA_ROL = {
    superadmin: "Administrador general",
    admin_empresa: "Administrador de empresa",
    admin_departamental: "Director Regional",
    admin_sede: "Coordinador de sede",
    admin: "Coordinador de sede",
    conductor: "Conductor",
};

// Etiqueta compacta para badges/pills de tabla (espacio reducido).
export const ETIQUETA_ROL_CORTA = {
    superadmin: "Admin. general",
    admin_empresa: "Admin. empresa",
    admin_departamental: "Dir. Regional",
    admin_sede: "Coord. sede",
    admin: "Coord. sede",
    conductor: "Conductor",
};

// Que NIVEL geografico se le asigna a cada rol.
//   departamento / sede  (superadmin no tiene territorio)
export const NIVEL_TERRITORIO = {
    admin_departamental: "departamento",
    admin_sede: "sede",
    conductor: "sede",
};

// Todos los roles con acceso al panel administrativo + el alias historico 'admin'.
// Lo unico que NO es admin es 'conductor'.
export const ROLES_ADMIN = [
    "admin",
    "admin_sede",
    "admin_departamental",
    "admin_empresa",
    "superadmin",
];

// ¿Este rol es de tipo administrador (cualquier nivel)? Usar esto en vez de
// comparar contra "admin" a secas, que deja fuera a los roles multinivel.
export const esAdmin = (rol) => ROLES_ADMIN.includes(rol);

// ¿Es un Director (Regional o Nacional)? Son los que asignan el VIP/pool.
export const esDirector = (rol) => rol === "superadmin" || rol === "admin_empresa" || rol === "admin_departamental";

// ¿Tiene una suplencia VIGENTE? (el backend adjunta usuario.suplencia o null)
export const enSuplencia = (usuario) => !!usuario?.suplencia;

// ¿Es admin a efectos de UI? Admin por rol, O un conductor del pool con suplencia
// vigente (actua como Coordinador). Usar esto para gatear la UI admin del suplente.
export const esAdminEfectivo = (usuario) =>
    esAdmin(usuario?.rol) || enSuplencia(usuario);

// Suplencia Fase B (multi-sede): ¿la suplencia cubre VARIAS sedes (toda una regional)?
export const cubreVariasSedes = (usuario) =>
    (usuario?.suplencia_sedes?.length || 0) > 1;

// ¿El suplente todavia tiene que ELEGIR a que sede entrar? (cubre varios y no eligio).
// Mientras no elija, no debe ver el panel admin (no tendria scope).
export const necesitaElegirSede = (usuario) =>
    enSuplencia(usuario) && cubreVariasSedes(usuario) && !usuario?.sede_activa;

// Etiqueta de CARGO considerando el pool (ver docs/diseno-pool-vip.md): un
// conductor con es_pool se muestra como "Pool de transporte" en vez de "Conductor".
export const etiquetaCargo = (usuario) => {
    if (usuario?.rol === "conductor" && usuario?.es_pool) return "Pool de transporte";
    return ETIQUETA_ROL[usuario?.rol] || usuario?.rol || "";
};
export const etiquetaCargoCorta = (usuario) => {
    if (usuario?.rol === "conductor" && usuario?.es_pool) return "Pool";
    return ETIQUETA_ROL_CORTA[usuario?.rol] || usuario?.rol || "";
};

export const rangoDe = (rol) => {
    const r = RANGO_ROL[rol];
    return r === undefined ? -1 : r;
};

// Roles que el actor puede crear: todos los de rango ESTRICTAMENTE inferior.
// Excepcion (continuidad): el superadmin tambien puede nombrar OTROS superadmins
// (pero nunca eliminarlos/desactivarlos/editarlos — eso protege #112).
// RN-04 · HU-10 (espejo de backend/src/services/jerarquia.service.js): con menos de
// dos sedes activas, la empresa solo crea Conductores. Solo se aplica en pantalla
// cuando quien crea ve TODAS las sedes de la empresa (el Administrador de empresa);
// para el resto lo controla el backend. El superadmin no tiene esta limitacion.
const ROLES_DE_VARIAS_SEDES = ["admin_departamental", "admin_sede", "admin"];
export const rolesSegunSedes = (roles, sedesActivas, rolActor) =>
    rolActor !== "admin_empresa" || sedesActivas >= 2
        ? roles
        : roles.filter((r) => !ROLES_DE_VARIAS_SEDES.includes(r));

// HU-11: el superadmin afuera crea solo gente del equipo SISVIA (otro
// superadmin); adentro de una empresa, la de esa empresa (nunca un superadmin).
export const rolesSegunLugar = (roles, rolActor, empresaActiva) => {
    if (rolActor !== "superadmin") return roles;
    return empresaActiva ? roles.filter((r) => r !== "superadmin") : ["superadmin"];
};

export const rolesQuePuedeCrear = (rolActor) => {
    const nivel = rangoDe(rolActor);
    const canonicos = [
        "admin_empresa",
        "admin_departamental",
        "admin_sede",
        "conductor",
    ];
    const inferiores = canonicos.filter((rol) => rangoDe(rol) < nivel);
    if (rolActor === "superadmin") return ["superadmin", ...inferiores];
    return inferiores;
};
