// Reglas PURAS de la placa unica y la baja por traspaso (pacto para-empresas,
// HU-17 · RN-10). Sin base de datos, para probarlas con node --test.

export const MENSAJES_VEHICULO = {
    // HU-17.1: nunca dice de que empresa es la placa.
    placaEnSisvia: 'Esa placa ya está registrada en SISVIA. Si el vehículo ahora es de tu empresa, comunícate con SISVIA.',
    placaEnTuEmpresa: 'Ya existe un vehículo con esa placa en tu empresa.',
    soloSisvia: 'Solo el equipo SISVIA puede dar de baja un vehículo por traspaso.',
    sinMotivo: 'Escribe el motivo de la baja.',
    motivoLargo: 'El motivo puede tener hasta 500 caracteres.',
    dadoDeBaja: 'Este vehículo fue dado de baja por traspaso: no se puede reactivar ni modificar.',
};

// La API lo devuelve junto al texto de HU-17.1 (para ofrecer "Escribir a SISVIA", HU-18.9).
export const CODIGO_PLACA_EN_SISVIA = 'placa_en_sisvia';
export const MOTIVO_BAJA_MAX = 500;

// RN-10: la placa choca con otro vehiculo VIGENTE (no dado de baja) de todo SISVIA.
// `vigente` es ese otro vehiculo ({ id, empresa_id }) o null; `propioId`, el que se
// esta editando (no choca consigo mismo).
export const choquePlaca = (vigente, empresaId, propioId = null) => {
    if (!vigente || vigente.id === propioId) return null;
    return vigente.empresa_id === empresaId
        ? { error: MENSAJES_VEHICULO.placaEnTuEmpresa }
        : { error: MENSAJES_VEHICULO.placaEnSisvia, codigo: CODIGO_PLACA_EN_SISVIA };
};

// HU-17.2: el motivo es obligatorio.
export const validarMotivoBaja = (motivo) => {
    const texto = typeof motivo === 'string' ? motivo.trim() : '';
    if (!texto) return MENSAJES_VEHICULO.sinMotivo;
    if (texto.length > MOTIVO_BAJA_MAX) return MENSAJES_VEHICULO.motivoLargo;
    return null;
};

// HU-17.4: un vehiculo dado de baja ya no se reactiva, ni se edita, ni se borra
// (la empresa conserva su historial; borrarlo del todo queda para otro pacto, SRS 3.N).
export const bloqueoPorBaja = (vehiculo) => (vehiculo?.dado_de_baja ? MENSAJES_VEHICULO.dadoDeBaja : null);
