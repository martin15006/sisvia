// Reglas PURAS de los limites de cada empresa (pacto para-empresas, HU-02 · RN-03).
// Sin base de datos, para probarlas con node --test.

// Acompaña al texto del limite: el frontend ofrece "Escribir a SISVIA" para pedir mas cupo (HU-18.9).
export const CODIGO_LIMITE = 'limite_plan';

export const MENSAJE_LIMITE_INVALIDO = 'El límite debe ser un número entero de 1 en adelante.';

// null si el limite sirve (entero >= 1), o el mensaje de error (CB-10).
export const validarLimite = (valor) => {
    const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
    return Number.isInteger(n) && n >= 1 ? null : MENSAJE_LIMITE_INVALIDO;
};

// ¿Crear (o reactivar) uno mas pasaria el limite? El limite es "hasta", inclusive:
// con 2 de 3 se puede crear el tercero; con 3 de 3, no. Si el superadmin bajo el
// limite por debajo de lo que ya hay (CB-02), tampoco: no se desactiva nada, solo
// no se crea mas hasta quedar por debajo.
export const alcanzoLimite = (activos, limite) => activos >= limite;

// Texto exacto de HU-02.2 y HU-02.3.
export const mensajeLimite = (tipo, limite) => {
    const cosa = tipo === 'sedes'
        ? (limite === 1 ? 'sede' : 'sedes')
        : (limite === 1 ? 'vehículo' : 'vehículos');
    return `Tu empresa llegó al límite de ${limite} ${cosa} de su plan. Para ampliarlo, comunícate con SISVIA.`;
};

// CB-02 (enmienda 1, 2026-09-19): el limite no puede quedar por debajo de lo que
// la empresa ya tiene activo. Igual a lo que usa, si. null si sirve.
export const limiteBajoUso = (tipo, nuevoLimite, activos) => {
    if (nuevoLimite >= activos) return null;
    const cosa = tipo === 'sedes'
        ? (activos === 1 ? 'sede activa' : 'sedes activas')
        : (activos === 1 ? 'vehículo activo' : 'vehículos activos');
    const cuales = tipo === 'sedes' ? 'las que sobran' : 'los que sobran';
    return `La empresa tiene ${activos} ${cosa}: el límite no puede ser menor. Primero desactiva ${cuales}.`;
};
