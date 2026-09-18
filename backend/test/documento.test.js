import { test } from "node:test";
import assert from "node:assert/strict";
import { validarDocumento, normalizarDocumento, MENSAJE_DOCUMENTO } from "../src/utils/documento.js";

test("documento · de 6 a 10 dígitos", () => {
    assert.equal(validarDocumento("12345"), MENSAJE_DOCUMENTO);        // 5
    assert.equal(validarDocumento("123456"), null);                    // 6: cédula vieja
    assert.equal(validarDocumento("79123456"), null);                  // 8: cédula vieja común
    assert.equal(validarDocumento("1012345678"), null);                // 10: cédula nueva
    assert.equal(validarDocumento("10123456789"), MENSAJE_DOCUMENTO);  // 11
});

test("documento · no empieza en 0 y solo números", () => {
    assert.equal(validarDocumento("0123456789"), MENSAJE_DOCUMENTO);
    assert.equal(validarDocumento("1.012.345.678"), null);             // los puntos se quitan
    assert.equal(validarDocumento("AB123456"), MENSAJE_DOCUMENTO);     // con letras no: se rechaza, no se borra
    assert.equal(validarDocumento(""), MENSAJE_DOCUMENTO);
    assert.equal(validarDocumento(null), MENSAJE_DOCUMENTO);
});

test("documento · se guarda sin puntos ni espacios", () => {
    assert.equal(normalizarDocumento(" 1.012.345.678 "), "1012345678");
    assert.equal(normalizarDocumento(" - "), null);
});
