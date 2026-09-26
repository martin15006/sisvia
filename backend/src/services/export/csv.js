// CSV que abre Excel en español (pacto para-empresas, HU-04). PURO: sin base de
// datos, para probarlo con node --test.
//   - Separador ';' (en Colombia la coma es el decimal y Excel separa con ';').
//   - BOM UTF-8 al principio: sin el, Excel muestra mal las tildes y la ñ.
//   - Filas con \r\n. Siempre lleva encabezados, aunque no haya filas (HU-04.3).

const BOM = '﻿';

// Una celda que empieza con = + - @ Excel la ejecuta como formula (inyeccion de
// CSV): una observacion escrita por un usuario podria abrir un enlace. Se le
// antepone ' para que quede como texto. Los numeros de verdad no se tocan.
const PELIGROSAS = /^[=+\-@\t\r]/;

export const celdaCsv = (valor) => {
    if (valor === null || valor === undefined) return '';
    let texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
    if (typeof valor === 'string' && PELIGROSAS.test(texto)) texto = `'${texto}`;
    return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

// columnas: [[titulo, clave | (fila) => valor], ...]
export const aCsv = (columnas, filas) => {
    const valor = (fila, lector) => (typeof lector === 'function' ? lector(fila) : fila?.[lector]);
    const lineas = [
        columnas.map(([titulo]) => celdaCsv(titulo)).join(';'),
        ...(filas || []).map((fila) => columnas.map(([, lector]) => celdaCsv(valor(fila, lector))).join(';')),
    ];
    return BOM + lineas.join('\r\n') + '\r\n';
};
