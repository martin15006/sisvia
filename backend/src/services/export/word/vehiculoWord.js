import { Document, Packer, Paragraph, TextRun, Table, TableRow, WidthType, TableLayoutType } from 'docx';
import { fechaLarga, etiquetaTipo, etiquetaEstado, estaVencido } from '../branding.js';
import { encabezadoDocx, tituloSeccion, ANCHO_CONTENIDO, celdaTexto, filaDato, espaciadoresSuperior, pieDocx } from './brandingWord.js';

const ROJO = 'A32D2D';
const textoResultado = (e) => (e || '—').replace('_', ' ').toUpperCase();

// Tabla de datos (etiqueta + valor)
const COL_ETIQUETA = 3200;
const COL_VALOR = ANCHO_CONTENIDO - COL_ETIQUETA;

// Tabla de chequeos (fecha | conductor | tipo | resultado)
const COL_FECHA = 2400;
const COL_TIPO = 2300;
const COL_RES = 2200;
const COL_COND = ANCHO_CONTENIDO - COL_FECHA - COL_TIPO - COL_RES;

const tablaFull = (rows, columnWidths) => new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    rows,
});

export const vehiculoWordBuffer = async ({ vehiculo, chequeos, origen }) => {
    const ce = vehiculo.sede || {};
    const ciudad = ce.ciudad?.nombre || '';
    const depto = ce.ciudad?.departamento?.nombre || '';
    const ubic = [ce.nombre, ciudad, depto].filter(Boolean).join(' · ') || '—';

    // Identificación + estado
    const tablaDatos = tablaFull([
        filaDato('Estado', `${etiquetaEstado(vehiculo.estado).toUpperCase()}${vehiculo.nivel_criticidad != null ? ` · criticidad ${vehiculo.nivel_criticidad}%` : ''}${vehiculo.es_vip ? ' · VIP' : ''} · ${vehiculo.activo ? 'Activo' : 'Inactivo'}`, COL_ETIQUETA, COL_VALOR),
        filaDato('Marca y línea', `${vehiculo.marca || '—'} ${vehiculo.linea || ''}`.trim(), COL_ETIQUETA, COL_VALOR),
        filaDato('Tipo', etiquetaTipo(vehiculo.tipo), COL_ETIQUETA, COL_VALOR),
        filaDato('Año modelo', vehiculo.modelo_anio ? String(vehiculo.modelo_anio) : '—', COL_ETIQUETA, COL_VALOR),
        filaDato('Color', vehiculo.color, COL_ETIQUETA, COL_VALOR),
        filaDato('VIN / Chasis', vehiculo.vin, COL_ETIQUETA, COL_VALOR),
        filaDato('Kilometraje actual', vehiculo.kilometraje_actual != null ? `${Number(vehiculo.kilometraje_actual).toLocaleString('es-CO')} km` : '—', COL_ETIQUETA, COL_VALOR),
    ], [COL_ETIQUETA, COL_VALOR]);

    // Documentación con marca de vencido
    const filaDoc = (etiqueta, fecha, chequeaVencido = true) => {
        const vencido = chequeaVencido && estaVencido(fecha);
        return new TableRow({ children: [
            celdaTexto(etiqueta, { width: COL_ETIQUETA, bold: true, fill: 'F1EFE8' }),
            celdaTexto(`${fechaLarga(fecha)}${vencido ? '  (VENCIDO)' : ''}`, { width: COL_VALOR, color: vencido ? ROJO : null, bold: vencido }),
        ] });
    };
    const tablaDoc = tablaFull([
        filaDoc('SOAT', vehiculo.soat_vencimiento),
        filaDoc('Revisión técnico-mecánica', vehiculo.rtm_vencimiento),
        filaDoc('Extintor', vehiculo.extintor_vencimiento),
        filaDoc('Último cambio de aceite', vehiculo.ultimo_cambio_aceite, false),
    ], [COL_ETIQUETA, COL_VALOR]);

    // Últimos chequeos
    const cabCheq = new TableRow({ tableHeader: true, children: [
        celdaTexto('Fecha', { width: COL_FECHA, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Conductor', { width: COL_COND, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Tipo', { width: COL_TIPO, bold: true, fill: 'F1EFE8', size: 20 }),
        celdaTexto('Resultado', { width: COL_RES, bold: true, fill: 'F1EFE8', size: 20 }),
    ] });
    const filasCheq = (chequeos || []).length
        ? chequeos.map((c) => new TableRow({ children: [
            celdaTexto(fechaLarga(c.fecha), { width: COL_FECHA }),
            celdaTexto(c.conductor?.nombre_completo || '—', { width: COL_COND }),
            celdaTexto(c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional', { width: COL_TIPO }),
            celdaTexto(textoResultado(c.resultado_estado), { width: COL_RES, bold: true }),
        ] }))
        : [new TableRow({ children: [celdaTexto('Sin chequeos cerrados registrados.', { width: ANCHO_CONTENIDO })] })];
    const tablaCheq = tablaFull([cabCheq, ...filasCheq], (chequeos || []).length ? [COL_FECHA, COL_COND, COL_TIPO, COL_RES] : [ANCHO_CONTENIDO]);

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial' } } } },
        sections: [{
            properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 720, bottom: 1080, left: 720 } } },
            footers: { default: pieDocx() },
            children: [
                ...espaciadoresSuperior(),
                encabezadoDocx('Ficha de vehículo', origen, [`Placa ${vehiculo.placa || '—'}`, etiquetaTipo(vehiculo.tipo)]),
                new Paragraph({ text: '' }),
                tituloSeccion('Identificación'),
                tablaDatos,
                tituloSeccion('Documentación y vencimientos'),
                tablaDoc,
                tituloSeccion('Ubicación'),
                new Paragraph({ children: [new TextRun({ text: ubic, size: 22 })] }),
                ...(ce.direccion ? [new Paragraph({ children: [new TextRun({ text: ce.direccion, size: 18, color: '5F5E5A' })] })] : []),
                ...(vehiculo.notas ? [tituloSeccion('Notas y observaciones'), new Paragraph({ children: [new TextRun({ text: vehiculo.notas, size: 22 })] })] : []),
                tituloSeccion('Últimos chequeos'),
                tablaCheq,
            ],
        }],
    });
    return Packer.toBuffer(doc);
};
