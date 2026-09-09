import { Document, Packer, Paragraph, TextRun, Table, TableRow, WidthType, TableLayoutType, PageOrientation } from 'docx';
import { fechaLarga, fechaHora, colorDeEstado } from '../branding.js';
import { encabezadoDocx, espaciadoresSuperior, celdaTexto, pieDocx } from './brandingWord.js';

// Hoja apaisada: ancho de contenido = 15840 - 720 - 720 = 14400 twips.
const ANCHO = 14400;
const COL = { fecha: 2300, veh: 1600, cond: 4500, tipo: 2600, res: 2200, crit: 1200 };

const textoResultado = (c) => c.cerrado ? (c.resultado_estado || '—').replace('_', ' ').toUpperCase() : 'EN PROCESO';

export const reporteChequeosWordBuffer = async ({ chequeos, total, origen, filtrosTexto }) => {
    const cab = new TableRow({ tableHeader: true, children: [
        celdaTexto('Fecha', { width: COL.fecha, bold: true, fill: 'F1EFE8', size: 18 }),
        celdaTexto('Vehículo', { width: COL.veh, bold: true, fill: 'F1EFE8', size: 18 }),
        celdaTexto('Conductor', { width: COL.cond, bold: true, fill: 'F1EFE8', size: 18 }),
        celdaTexto('Tipo', { width: COL.tipo, bold: true, fill: 'F1EFE8', size: 18 }),
        celdaTexto('Resultado', { width: COL.res, bold: true, fill: 'F1EFE8', size: 18 }),
        celdaTexto('Criticidad', { width: COL.crit, bold: true, fill: 'F1EFE8', size: 18 }),
    ] });

    const filas = (chequeos || []).map((c, i) => new TableRow({ children: [
        celdaTexto(fechaLarga(c.fecha), { width: COL.fecha, size: 18, fill: i % 2 ? 'FAFAF7' : null }),
        celdaTexto(c.vehiculo?.placa || '—', { width: COL.veh, size: 18, fill: i % 2 ? 'FAFAF7' : null }),
        celdaTexto(c.conductor?.nombre_completo || '—', { width: COL.cond, size: 18, fill: i % 2 ? 'FAFAF7' : null }),
        celdaTexto(c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional', { width: COL.tipo, size: 18, fill: i % 2 ? 'FAFAF7' : null }),
        celdaTexto(textoResultado(c), { width: COL.res, size: 18, bold: true, color: c.cerrado ? colorDeEstado(c.resultado_estado).replace('#', '') : null, fill: i % 2 ? 'FAFAF7' : null }),
        celdaTexto(c.resultado_criticidad != null ? `${c.resultado_criticidad}%` : '—', { width: COL.crit, size: 18, fill: i % 2 ? 'FAFAF7' : null }),
    ] }));

    const tabla = new Table({
        width: { size: ANCHO, type: WidthType.DXA },
        columnWidths: [COL.fecha, COL.veh, COL.cond, COL.tipo, COL.res, COL.crit],
        layout: TableLayoutType.FIXED,
        rows: [cab, ...filas],
    });

    const cuerpo = [
        ...espaciadoresSuperior(),
        encabezadoDocx('Listado de chequeos', origen, [`${total} chequeo${total === 1 ? '' : 's'}`, `Generado el ${fechaHora(new Date().toISOString())}`], ANCHO),
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: `Filtros — ${filtrosTexto}`, size: 18, color: '5F5E5A' })] }),
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `${total} registro${total === 1 ? '' : 's'}`, size: 18, bold: true })] }),
    ];
    cuerpo.push((chequeos || []).length === 0
        ? new Paragraph({ children: [new TextRun({ text: 'No hay chequeos para los filtros seleccionados.', size: 20, color: '5F5E5A' })] })
        : tabla);

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial' } } } },
        sections: [{
            // docx intercambia ancho/alto cuando la orientacion es landscape, asi que
            // las medidas van en orden VERTICAL (12240 x 15840) y la libreria las voltea
            // a 15840 x 12240. (Si se pasan ya volteadas, sale vertical por error.)
            properties: { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, right: 720, bottom: 1080, left: 720 } } },
            footers: { default: pieDocx(ANCHO) },
            children: cuerpo,
        }],
    });
    return Packer.toBuffer(doc);
};
