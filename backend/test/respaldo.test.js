import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync, crc32 } from "node:zlib";
import { aCsv, celdaCsv } from "../src/services/export/csv.js";
import { crearZip } from "../src/services/export/zip.js";

// Lector minimo de .zip para comprobar lo que escribe crearZip: recorre el
// directorio central y descomprime cada archivo.
const leerZip = (zip) => {
    const fin = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const total = zip.readUInt16LE(fin + 10);
    let p = zip.readUInt32LE(fin + 16);
    const archivos = {};
    for (let i = 0; i < total; i++) {
        assert.equal(zip.readUInt32LE(p), 0x02014b50);
        const crc = zip.readUInt32LE(p + 16);
        const largoComprimido = zip.readUInt32LE(p + 20);
        const largoNombre = zip.readUInt16LE(p + 28);
        const offset = zip.readUInt32LE(p + 42);
        const nombre = zip.subarray(p + 46, p + 46 + largoNombre).toString("utf8");
        assert.equal(zip.readUInt32LE(offset), 0x04034b50, `cabecera local de ${nombre}`);
        const inicio = offset + 30 + zip.readUInt16LE(offset + 26);
        const datos = inflateRawSync(zip.subarray(inicio, inicio + largoComprimido));
        assert.equal(crc32(datos), crc, `CRC de ${nombre}`);
        archivos[nombre] = datos;
        p += 46 + largoNombre;
    }
    return archivos;
};

const zipEnMemoria = async (archivos) => {
    const partes = [];
    const zip = crearZip(async (b) => partes.push(b));
    for (const [nombre, contenido] of archivos) await zip.agregar(nombre, contenido);
    await zip.cerrar();
    return Buffer.concat(partes);
};

test("HU-04.1 · el .zip trae cada archivo entero y con su nombre", async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x10]);
    const zip = await zipEnMemoria([["sedes.csv", "a;b\r\n"], ["chequeos-pdf/2026-09-21_ABC123.pdf", pdf], ["LEEME.txt", "Tildes: año, vehículo"]]);
    const leidos = leerZip(zip);
    assert.deepEqual(Object.keys(leidos), ["sedes.csv", "chequeos-pdf/2026-09-21_ABC123.pdf", "LEEME.txt"]);
    assert.equal(leidos["sedes.csv"].toString(), "a;b\r\n");
    assert.deepEqual(leidos["chequeos-pdf/2026-09-21_ABC123.pdf"], pdf);
    assert.equal(leidos["LEEME.txt"].toString("utf8"), "Tildes: año, vehículo");
});

test("HU-04.3 · un .zip sin archivos también es válido", async () => {
    assert.deepEqual(leerZip(await zipEnMemoria([])), {});
});

test("HU-04.3 · un CSV sin filas sale con sus encabezados", () => {
    const csv = aCsv([["Placa", "placa"], ["Marca", "marca"]], []);
    assert.equal(csv, "﻿Placa;Marca\r\n");
});

test("HU-04.1 · el CSV abre en Excel en español: BOM, ';' y comillas donde hace falta", () => {
    const csv = aCsv([["Nombre", "nombre"], ["Nota", (f) => f.nota], ["Km", "km"]], [
        { nombre: "Sede Norte", nota: 'dice "hola"; y sigue\notra línea', km: 1200.5 },
        { nombre: null, nota: undefined, km: 0 },
    ]);
    assert.ok(csv.startsWith("﻿"));
    assert.equal(csv, '﻿Nombre;Nota;Km\r\nSede Norte;"dice ""hola""; y sigue\notra línea";1200.5\r\n;;0\r\n');
});

test("HU-04.1 · una celda que Excel tomaría como fórmula queda como texto", () => {
    assert.equal(celdaCsv("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
    assert.equal(celdaCsv("+57 300"), "'+57 300");
    assert.equal(celdaCsv("@suma"), "'@suma");
    assert.equal(celdaCsv(-5), "-5", "un número negativo no se toca");
    assert.equal(celdaCsv({ a: 1 }), '"{""a"":1}"', "un objeto va como JSON entre comillas");
});

test("HU-04.1 · el .zip se llama con la empresa y el día de Colombia", async () => {
    const { nombreRespaldo, nombrePdfChequeo } = await import("../src/services/export/respaldoReglas.js");
    // 22:30 del 21 en Colombia = 03:30 del 22 en UTC: manda el día de Colombia
    assert.equal(nombreRespaldo("Transportes Ñandú & Cía. S.A.S.", "2026-09-22T03:30:00Z"), "respaldo-transportes-nandu-cia-s-a-s-2026-09-21.zip");
    assert.equal(nombrePdfChequeo({ id: "1a2b3c4d-9999", fecha: "2026-09-21T15:00:00Z", vehiculo: { placa: "abc123" } }), "chequeos-pdf/2026-09-21_ABC123_1a2b3c4d.pdf");
});

test("HU-04.3 · cada CSV del respaldo tiene encabezados aunque no haya filas", async () => {
    const { ARCHIVOS_CSV } = await import("../src/services/export/respaldoReglas.js");
    assert.deepEqual(ARCHIVOS_CSV.map(([a]) => a), ["sedes.csv", "usuarios.csv", "vehiculos.csv", "chequeos.csv", "respuestas_chequeo.csv", "respuestas_aptitud.csv", "mensajes_a_sisvia.csv", "respuestas_a_mensajes.csv", "intentos_bloqueados.csv"]);
    for (const [archivo, columnas] of ARCHIVOS_CSV) {
        const csv = aCsv(columnas, []);
        assert.equal(csv.split("\r\n").filter(Boolean).length, 1, archivo);
        assert.ok(csv.length > 10, `${archivo} trae sus títulos`);
    }
});
