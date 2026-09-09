import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TableLayoutType } from 'docx';
import { fechaLarga } from '../branding.js';
import { encabezadoDocx, tituloSeccion, ANCHO_CONTENIDO, espaciadoresSuperior, pieDocx } from './brandingWord.js';

const borde = { style: BorderStyle.SINGLE, size: 2, color: 'E0DED6' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
const textoResultado = (r) => r === 'cumple' ? 'Cumple' : r === 'no_cumple' ? 'No cumple' : 'N/A';

// Tabla de datos: etiqueta (gris) + valor, a ancho completo.
const COL_ETIQUETA = 2900;
const COL_VALOR = ANCHO_CONTENIDO - COL_ETIQUETA; // 7180

const filaInfo = (etiqueta, valor) => new TableRow({ children: [
    new TableCell({ width: { size: COL_ETIQUETA, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: etiqueta, bold: true, size: 22 })] })] }),
    new TableCell({ width: { size: COL_VALOR, type: WidthType.DXA }, borders: bordes, margins: { top: 100, bottom: 100, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: valor || '—', size: 22 })] })] }),
] });

// Tabla del checklist: item + resultado, a ancho completo.
const COL_RES = 2200;
const COL_ITEM = ANCHO_CONTENIDO - COL_RES; // 7880

export const chequeoWordBuffer = async ({ chequeo, origen }) => {
    const v = chequeo.vehiculo || {};
    const c = chequeo.conductor || {};

    const tablaInfo = new Table({
        width: { size: ANCHO_CONTENIDO, type: WidthType.DXA }, columnWidths: [COL_ETIQUETA, COL_VALOR], layout: TableLayoutType.FIXED,
        rows: [
            filaInfo('Resultado', `${(chequeo.resultado_estado || '—').toUpperCase()} · criticidad ${chequeo.resultado_criticidad ?? 0}%`),
            filaInfo('Vehiculo', `${v.placa || '—'} · ${v.marca || ''} ${v.linea || ''}`.trim()),
            filaInfo('Conductor', `${c.nombre_completo || '—'}${c.cedula ? ` · CC ${c.cedula}` : ''}`),
            filaInfo('Tipo', chequeo.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
            filaInfo('Kilometraje', chequeo.kilometraje != null ? `${chequeo.kilometraje.toLocaleString('es-CO')} km` : '—'),
            filaInfo('Fecha', fechaLarga(chequeo.fecha)),
        ],
    });

    const cabChecklist = new TableRow({ tableHeader: true, children: [
        new TableCell({ width: { size: COL_ITEM, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Ítem', bold: true, size: 20 })] })] }),
        new TableCell({ width: { size: COL_RES, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Resultado', bold: true, size: 20 })] })] }),
    ] });
    const filasChecklist = (chequeo.respuestas_chequeo || []).map((r) => new TableRow({ children: [
        new TableCell({ width: { size: COL_ITEM, type: WidthType.DXA }, borders: bordes, margins: { top: 90, bottom: 90, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: r.item?.descripcion || '—', size: 22 })] })] }),
        new TableCell({ width: { size: COL_RES, type: WidthType.DXA }, borders: bordes, margins: { top: 90, bottom: 90, left: 160, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: textoResultado(r.estado), size: 22 })] })] }),
    ] }));

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial' } } } },
        sections: [{
            properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 720, bottom: 1080, left: 720 } } },
            footers: { default: pieDocx() },
            children: [
                // Espaciadores reales: bajan el encabezado en CUALQUIER vista de Word
                // (incluida "Diseño web", que ignora el margen superior de pagina).
                ...espaciadoresSuperior(),
                encabezadoDocx('Chequeo preoperacional', origen, [`N.º ${(chequeo.id || '').slice(0, 8).toUpperCase()}`, fechaLarga(chequeo.fecha)]),
                new Paragraph({ text: '' }),
                tituloSeccion('Datos'),
                tablaInfo,
                tituloSeccion('Checklist'),
                new Table({ width: { size: ANCHO_CONTENIDO, type: WidthType.DXA }, columnWidths: [COL_ITEM, COL_RES], layout: TableLayoutType.FIXED, rows: [cabChecklist, ...filasChecklist] }),
            ],
        }],
    });
    return Packer.toBuffer(doc);
};
