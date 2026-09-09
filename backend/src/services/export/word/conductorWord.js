import { Document, Packer, Paragraph, TextRun, Table, TableRow, WidthType, TableLayoutType } from 'docx';
import { fechaLarga, etiquetaCargo, estaVencido } from '../branding.js';
import { encabezadoDocx, tituloSeccion, ANCHO_CONTENIDO, celdaTexto, filaDato, espaciadoresSuperior, pieDocx } from './brandingWord.js';

const ROJO = 'A32D2D';
const textoResultado = (c) => c.cerrado ? (c.resultado_estado || '—').replace('_', ' ').toUpperCase() : 'EN PROCESO';

// Tabla de datos (etiqueta + valor)
const COL_ETIQUETA = 3200;
const COL_VALOR = ANCHO_CONTENIDO - COL_ETIQUETA;

// Tabla de chequeos (fecha | vehiculo | tipo | resultado)
const COL_FECHA = 2400;
const COL_TIPO = 2300;
const COL_RES = 2200;
const COL_VEH = ANCHO_CONTENIDO - COL_FECHA - COL_TIPO - COL_RES;

const tablaFull = (rows, columnWidths) => new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    rows,
});

export const conductorWordBuffer = async ({ conductor, chequeos, origen }) => {
    const ce = conductor.sede || {};
    const ubic = [ce.nombre, ce.ciudad?.nombre, ce.ciudad?.departamento?.nombre].filter(Boolean).join(' · ') || '—';
    const cargo = etiquetaCargo(conductor.rol, conductor.es_pool);
    const licVencida = estaVencido(conductor.licencia_vencimiento);

    const tablaDatos = tablaFull([
        filaDato('Nombre', conductor.nombre_completo, COL_ETIQUETA, COL_VALOR),
        filaDato('Cédula', conductor.cedula, COL_ETIQUETA, COL_VALOR),
        filaDato('Cargo', `${cargo}${conductor.es_pool ? ' (Pool)' : ''} · ${conductor.activo ? 'Activo' : 'Inactivo'}`, COL_ETIQUETA, COL_VALOR),
        filaDato('Teléfono', conductor.telefono, COL_ETIQUETA, COL_VALOR),
        filaDato('Correo', conductor.email, COL_ETIQUETA, COL_VALOR),
    ], [COL_ETIQUETA, COL_VALOR]);

    const tablaLic = tablaFull([
        filaDato('Número de licencia', conductor.licencia_numero, COL_ETIQUETA, COL_VALOR),
        filaDato('Categoría', conductor.licencia_categoria, COL_ETIQUETA, COL_VALOR),
        new TableRow({ children: [
            celdaTexto('Vencimiento', { width: COL_ETIQUETA, bold: true, fill: 'F1EFE8' }),
            celdaTexto(`${fechaLarga(conductor.licencia_vencimiento)}${licVencida ? '  (VENCIDA)' : ''}`, { width: COL_VALOR, color: licVencida ? ROJO : null, bold: licVencida }),
        ] }),
    ], [COL_ETIQUETA, COL_VALOR]);

    const tablaSS = tablaFull([
        filaDato('EPS', conductor.eps, COL_ETIQUETA, COL_VALOR),
        filaDato('ARL', conductor.arl, COL_ETIQUETA, COL_VALOR),
    ], [COL_ETIQUETA, COL_VALOR]);

    const cabCheq = new TableRow({ tableHeader: true, children: [
        celdaTexto('Fecha', { width: COL_FECHA, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Vehículo', { width: COL_VEH, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Tipo', { width: COL_TIPO, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Resultado', { width: COL_RES, bold: true, fill: 'F1EFE8', size: 20 }),
    ] });
    const filasCheq = (chequeos || []).length
        ? chequeos.map((c) => new TableRow({ children: [
            celdaTexto(fechaLarga(c.fecha), { width: COL_FECHA }),
            celdaTexto(c.vehiculo?.placa || '—', { width: COL_VEH }),
            celdaTexto(c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional', { width: COL_TIPO }),
            celdaTexto(textoResultado(c), { width: COL_RES, bold: true }),
        ] }))
        : [new TableRow({ children: [celdaTexto('Sin chequeos registrados.', { width: ANCHO_CONTENIDO })] })];
    const tablaCheq = tablaFull([cabCheq, ...filasCheq], (chequeos || []).length ? [COL_FECHA, COL_VEH, COL_TIPO, COL_RES] : [ANCHO_CONTENIDO]);

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial' } } } },
        sections: [{
            properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 720, bottom: 1080, left: 720 } } },
            footers: { default: pieDocx() },
            children: [
                ...espaciadoresSuperior(),
                encabezadoDocx('Ficha de conductor', origen, [`CC ${conductor.cedula || '—'}`, cargo]),
                new Paragraph({ text: '' }),
                tituloSeccion('Identificación'),
                tablaDatos,
                tituloSeccion('Licencia de conducción'),
                tablaLic,
                tituloSeccion('Seguridad social'),
                tablaSS,
                tituloSeccion('Ubicación'),
                new Paragraph({ children: [new TextRun({ text: ubic, size: 22 })] }),
                ...(ce.direccion ? [new Paragraph({ children: [new TextRun({ text: ce.direccion, size: 18, color: '5F5E5A' })] })] : []),
                tituloSeccion('Últimos chequeos'),
                tablaCheq,
            ],
        }],
    });
    return Packer.toBuffer(doc);
};
