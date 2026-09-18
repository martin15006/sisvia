import fs from 'fs';
import { Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, TableLayoutType, Footer, PageNumber, TabStopType } from 'docx';
import { LOGO_PATH, lineaOrigen, fechaHora } from '../branding.js';

const PRIMARIO = 'EA580C';
const SOBRE_MARCA = '000000'; // letra sobre el naranja: el blanco no se lee
const LOGO_DATA = fs.readFileSync(LOGO_PATH);

// Ancho del contenido = ancho de pagina (12240) - margenes laterales (720 c/u = 0.5") = 10800 twips.
// Las tablas usan este ancho + layout FIXED para ocupar la hoja completa (sin esto docx
// hace "autofit" y encoge las tablas al contenido, que es lo que se veia pequeno).
export const ANCHO_CONTENIDO = 10800;

// Encabezado: logo + titulo + linea de origen, dentro de una "banda" de color simulada
// con shading de celda (docx no tiene banner, usamos una tabla de 1 fila sin bordes).
export const encabezadoDocx = (titulo, origen, meta, ancho = ANCHO_CONTENIDO) => {
    const colTitulo = ancho - 1300 - 2700; // logo fijo + meta fija; el titulo toma el resto
    const logo = new Paragraph({
        children: [new ImageRun({ type: 'png', data: LOGO_DATA, transformation: { width: 54, height: 54 } })],
    });
    const tituloP = new Paragraph({ children: [new TextRun({ text: titulo, bold: true, size: 34, color: SOBRE_MARCA })] });
    const subP = new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: lineaOrigen(origen), size: 22, color: SOBRE_MARCA })] });
    const metaP = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: (meta || []).map((m, i) => new TextRun({ text: m, size: 18, color: SOBRE_MARCA, break: i ? 1 : 0 })),
    });
    const sinBorde = { style: BorderStyle.NONE };
    return new Table({
        width: { size: ancho, type: WidthType.DXA },
        columnWidths: [1300, colTitulo, 2700],
        layout: TableLayoutType.FIXED,
        borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
        rows: [new TableRow({ children: [
            new TableCell({ width: { size: 1300, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: PRIMARIO, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 160, right: 60 }, children: [logo] }),
            new TableCell({ width: { size: colTitulo, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: PRIMARIO, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 60, right: 60 }, children: [tituloP, subP] }),
            new TableCell({ width: { size: 2700, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: PRIMARIO, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 60, right: 160 }, children: [metaP] }),
        ] })],
    });
};

export const tituloSeccion = (texto) =>
    new Paragraph({ spacing: { before: 280, after: 120 }, children: [new TextRun({ text: texto, bold: true, size: 26, color: 'C2410C' })] });

// Pie de pagina igual que en los PDF: izquierda "Generado el ... · Sistema de
// SISVIA", derecha "Pagina X de Y" (con tab a la derecha del ancho).
export const pieDocx = (ancho = ANCHO_CONTENIDO) => new Footer({
    children: [
        new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: ancho }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5', space: 6 } },
            children: [
                new TextRun({ text: `Generado el ${fechaHora(new Date().toISOString())} · Sistema de SISVIA`, size: 16, color: '5F5E5A' }),
                new TextRun({ text: '\t' }),
                new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: '5F5E5A' }),
            ],
        }),
    ],
});

// Lineas en blanco que bajan el encabezado (se respetan en cualquier vista de Word,
// incluida "Diseño web", que ignora el margen superior de pagina). Mismo valor en
// las tres fichas para que el espacio de arriba quede igual.
export const espaciadoresSuperior = (n = 0) =>
    Array.from({ length: n }, () => new Paragraph({ spacing: { after: 0 } }));

// --- Helpers de tabla reutilizables (usados por las fichas) ---
const BORDE = { style: BorderStyle.SINGLE, size: 2, color: 'E0DED6' };
export const BORDES_TABLA = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

// Celda de texto generica. opts: { width, bold, fill, size, color, align }.
export const celdaTexto = (texto, { width, bold = false, fill = null, size = 22, color = null, align = null } = {}) =>
    new TableCell({
        ...(width ? { width: { size: width, type: WidthType.DXA } } : {}),
        borders: BORDES_TABLA,
        ...(fill ? { shading: { fill, type: ShadingType.CLEAR } } : {}),
        margins: { top: 90, bottom: 90, left: 160, right: 120 },
        children: [new Paragraph({ ...(align ? { alignment: align } : {}), children: [new TextRun({ text: texto == null || texto === '' ? '—' : String(texto), bold, size, ...(color ? { color } : {}) })] })],
    });

// Fila etiqueta (gris, negrita) + valor.
export const filaDato = (etiqueta, valor, colEtiqueta, colValor) =>
    new TableRow({ children: [
        celdaTexto(etiqueta, { width: colEtiqueta, bold: true, fill: 'F1EFE8' }),
        celdaTexto(valor, { width: colValor }),
    ] });
