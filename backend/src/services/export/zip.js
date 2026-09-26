// Escritor de .zip en flujo, sin dependencias (pacto para-empresas, HU-04).
// Cada archivo llega entero en memoria (un CSV o el PDF de un chequeo), se
// comprime y se escribe apenas esta listo: el .zip no se arma completo en memoria.
// Usa zlib.crc32 (Node 22.2+, CL-11). Formato ZIP clasico, sin ZIP64: hasta
// 65.535 archivos y 4 GB, de sobra para una empresa (RNF-02: 1.000 chequeos).
import { deflateRawSync, crc32 } from 'node:zlib';

const LIMITE_ARCHIVOS = 0xffff;
const LIMITE_BYTES = 0xffffffff;
const UTF8 = 0x0800; // bit 11: el nombre va en UTF-8
const DEFLATE = 8;
const VERSION = 20;

// Fecha y hora en el formato de MS-DOS que usa el zip.
const fechaDos = (d) => ({
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    dia: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

// escribir(buffer) puede ser async (por ejemplo, esperar el 'drain' de la respuesta).
export const crearZip = (escribir, { fecha = new Date() } = {}) => {
    const { hora, dia } = fechaDos(fecha);
    const entradas = [];
    let offset = 0;

    const agregar = async (nombre, contenido) => {
        if (entradas.length >= LIMITE_ARCHIVOS) throw new Error('El .zip no admite más de 65.535 archivos');
        const datos = Buffer.isBuffer(contenido) ? contenido : Buffer.from(String(contenido), 'utf8');
        const comprimido = deflateRawSync(datos);
        const nombreBuf = Buffer.from(nombre, 'utf8');
        const crc = crc32(datos);
        if (offset + 30 + nombreBuf.length + comprimido.length > LIMITE_BYTES) throw new Error('El .zip pasa de 4 GB');

        const cabecera = Buffer.alloc(30);
        cabecera.writeUInt32LE(0x04034b50, 0);
        cabecera.writeUInt16LE(VERSION, 4);
        cabecera.writeUInt16LE(UTF8, 6);
        cabecera.writeUInt16LE(DEFLATE, 8);
        cabecera.writeUInt16LE(hora, 10);
        cabecera.writeUInt16LE(dia, 12);
        cabecera.writeUInt32LE(crc, 14);
        cabecera.writeUInt32LE(comprimido.length, 18);
        cabecera.writeUInt32LE(datos.length, 22);
        cabecera.writeUInt16LE(nombreBuf.length, 26);
        cabecera.writeUInt16LE(0, 28);

        await escribir(Buffer.concat([cabecera, nombreBuf, comprimido]));
        entradas.push({ nombreBuf, crc, comprimido: comprimido.length, tamano: datos.length, offset });
        offset += 30 + nombreBuf.length + comprimido.length;
    };

    const cerrar = async () => {
        const directorio = entradas.map((e) => {
            const c = Buffer.alloc(46);
            c.writeUInt32LE(0x02014b50, 0);
            c.writeUInt16LE(VERSION, 4);
            c.writeUInt16LE(VERSION, 6);
            c.writeUInt16LE(UTF8, 8);
            c.writeUInt16LE(DEFLATE, 10);
            c.writeUInt16LE(hora, 12);
            c.writeUInt16LE(dia, 14);
            c.writeUInt32LE(e.crc, 16);
            c.writeUInt32LE(e.comprimido, 20);
            c.writeUInt32LE(e.tamano, 24);
            c.writeUInt16LE(e.nombreBuf.length, 28);
            // extra, comentario, disco, atributos internos y externos: 0
            c.writeUInt32LE(e.offset, 42);
            return Buffer.concat([c, e.nombreBuf]);
        });
        const tamanoDirectorio = directorio.reduce((n, b) => n + b.length, 0);
        const fin = Buffer.alloc(22);
        fin.writeUInt32LE(0x06054b50, 0);
        fin.writeUInt16LE(entradas.length, 8);
        fin.writeUInt16LE(entradas.length, 10);
        fin.writeUInt32LE(tamanoDirectorio, 12);
        fin.writeUInt32LE(offset, 16);
        await escribir(Buffer.concat([...directorio, fin]));
    };

    return { agregar, cerrar, get archivos() { return entradas.length; } };
};
