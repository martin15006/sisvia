// Servicio de JERARQUIA de roles (Fase 4 multinivel, Tareas #102 / #111 / #112).
//
// Define el "rango" numerico de cada rol y las reglas de quien puede gestionar a
// quien. Es independiente del scope TERRITORIAL (scope.service.js): el scope dice
// "que sedes/territorio veo", la jerarquia dice "sobre que rangos tengo poder".
//
// Para que un admin pueda crear/desactivar/eliminar a otro usuario se necesitan
// AMBAS cosas: que el objetivo este dentro de su scope territorial Y que su rango
// sea estrictamente inferior.
//
// Escalera de rangos (de mayor a menor poder):
//   superadmin (3) > admin_departamental (2) > admin_sede (1) > conductor (0)
//
// 'admin' es el alias historico de 'admin_sede' (antes de Fase 4 solo existian
// 'admin' y 'conductor'), por eso comparte rango 1.
//
// NOTA (12 jun 2026): se eliminaron admin_regional y admin_ciudad. El producto no los
// usa: una "Regional" equivale a un departamento (Director Regional).

export const RANGO_ROL = {
    superadmin: 3,
    admin_departamental: 2,
    admin_sede: 1,
    admin: 1, // alias historico de admin_sede
    conductor: 0,
};

// Etiqueta legible de cada rol (cargos de la organizacion).
export const ETIQUETA_ROL = {
    superadmin: 'Administrador general',
    admin_departamental: 'Director Regional',
    admin_sede: 'Coordinador de sede',
    admin: 'Coordinador de sede',
    conductor: 'Conductor',
};

// Rango numerico de un rol (−1 si el rol es desconocido).
export const rangoDe = (rol) => {
    const r = RANGO_ROL[rol];
    return r === undefined ? -1 : r;
};

// ¿El actor puede GESTIONAR (desactivar / eliminar / reactivar / editar) a un
// usuario de rol objetivo? Regla #112: solo sobre rangos ESTRICTAMENTE inferiores.
// Asi un admin nunca puede tocar a otro de su mismo rango ni a uno superior, y
// ni siquiera un superadmin puede eliminar a otro superadmin.
export const puedeGestionarRol = (rolActor, rolObjetivo) => {
    return rangoDe(rolActor) > rangoDe(rolObjetivo);
};

// ¿El actor puede CREAR un usuario con rol nuevo? Regla #111: solo rangos
// estrictamente inferiores al suyo (un admin_sede solo crea conductores).
//
// EXCEPCION deliberada (continuidad del sistema): un superadmin SI puede
// nombrar a OTRO superadmin. Sin esto, el nivel nacional solo se podria
// asignar por SQL y, si el unico superadmin se va, nadie hereda el cargo.
// La proteccion #112 se mantiene intacta: un superadmin NO puede eliminar,
// desactivar ni editar a otro superadmin (nadie gestiona a un par).
export const puedeCrearRol = (rolActor, rolNuevo) => {
    if (rolActor === 'superadmin' && rolNuevo === 'superadmin') return true;
    return rangoDe(rolActor) > rangoDe(rolNuevo);
};

// Lista de roles que el actor puede crear (todos los de rango inferior; el
// superadmin ademas puede nombrar pares — ver puedeCrearRol).
// Util para que el frontend muestre solo las opciones permitidas en el selector.
export const rolesQuePuedeCrear = (rolActor) => {
    const nivel = rangoDe(rolActor);
    // Roles "canonicos" (sin el alias 'admin') ordenados de mayor a menor.
    const canonicos = [
        'admin_departamental',
        'admin_sede',
        'conductor',
    ];
    const inferiores = canonicos.filter((rol) => rangoDe(rol) < nivel);
    if (rolActor === 'superadmin') return ['superadmin', ...inferiores];
    return inferiores;
};

// ROL EFECTIVO (Pool · Paso 2 — suplencia).
// Un conductor del pool con una suplencia VIGENTE adjuntada (req.usuario.suplencia,
// la pone el middleware verificarToken) actua como 'admin_sede' de su sede.
// En cualquier otro caso devuelve su rol real. Esto centraliza la "elevacion":
// los guards, el scope y la jerarquia leen esto en vez del rol crudo, mientras que
// la faceta conductor (chequeos, VIP) sigue leyendo usuario.rol.
export const rolEfectivo = (usuario) => {
    if (
        usuario?.rol === 'conductor' &&
        usuario?.es_pool === true &&
        usuario?.suplencia
    ) {
        return 'admin_sede';
    }
    return usuario?.rol;
};
