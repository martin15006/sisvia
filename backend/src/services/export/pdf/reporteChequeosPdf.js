import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { COLORES, fechaLarga, fechaHora, colorDeEstado } from '../branding.js';
import { Header, Footer, estilos } from './documentoBase.js';

const h = React.createElement;

const s = StyleSheet.create({
    filtros: { paddingHorizontal: 22, paddingTop: 10, fontSize: 9, color: COLORES.grisSuave },
    total: { paddingHorizontal: 22, paddingTop: 2, paddingBottom: 8, fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORES.grisTexto },
    tabla: { paddingHorizontal: 22 },
    cab: { flexDirection: 'row', backgroundColor: COLORES.grisFondo, paddingVertical: 5, paddingHorizontal: 6 },
    fila: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTop: `0.5pt solid #f0f0f0` },
    zebra: { backgroundColor: '#FAFAF7' },
    cFecha: { width: 95, fontSize: 9 },
    cVeh: { width: 80, fontSize: 9 },
    cCond: { flex: 1, fontSize: 9, paddingRight: 8 },
    cTipo: { width: 100, fontSize: 9 },
    cRes: { width: 105, fontSize: 9, fontFamily: 'Helvetica-Bold' },
    cCrit: { width: 60, fontSize: 9, textAlign: 'right' },
    th: { fontSize: 8, color: COLORES.grisSuave, textTransform: 'uppercase' },
    vacio: { paddingHorizontal: 22, paddingTop: 20, fontSize: 11, color: COLORES.grisSuave },
});

const textoResultado = (c) => c.cerrado ? (c.resultado_estado || '—').replace('_', ' ').toUpperCase() : 'EN PROCESO';

export const reporteChequeosPdfBuffer = async ({ chequeos, total, origen, filtrosTexto }) => {
    const filas = (chequeos || []).map((c, i) =>
        h(View, { key: i, style: i % 2 ? [s.fila, s.zebra] : s.fila, wrap: false }, [
            h(Text, { key: 'f', style: s.cFecha }, fechaLarga(c.fecha)),
            h(Text, { key: 'v', style: s.cVeh }, c.vehiculo?.placa || '—'),
            h(Text, { key: 'co', style: s.cCond }, c.conductor?.nombre_completo || '—'),
            h(Text, { key: 't', style: s.cTipo }, c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
            h(Text, { key: 'r', style: [s.cRes, { color: c.cerrado ? colorDeEstado(c.resultado_estado) : COLORES.grisSuave }] }, textoResultado(c)),
            h(Text, { key: 'cr', style: s.cCrit }, c.resultado_criticidad != null ? `${c.resultado_criticidad}%` : '—'),
        ]));

    const doc = h(Document, null,
        h(Page, { size: 'A4', orientation: 'landscape', style: estilos.page }, [
            h(Header, {
                key: 'head',
                titulo: 'Listado de chequeos',
                origen,
                meta: [`${total} chequeo${total === 1 ? '' : 's'}`, `Generado el ${fechaHora(new Date().toISOString())}`],
            }),
            h(Text, { key: 'filtros', style: s.filtros }, `Filtros — ${filtrosTexto}`),
            h(Text, { key: 'total', style: s.total }, `${total} registro${total === 1 ? '' : 's'}`),
            (chequeos || []).length === 0
                ? h(Text, { key: 'vacio', style: s.vacio }, 'No hay chequeos para los filtros seleccionados.')
                : h(View, { key: 'tabla', style: s.tabla }, [
                    h(View, { key: 'cab', style: s.cab, fixed: true }, [
                        h(Text, { key: 'f', style: [s.cFecha, s.th] }, 'Fecha'),
                        h(Text, { key: 'v', style: [s.cVeh, s.th] }, 'Vehículo'),
                        h(Text, { key: 'co', style: [s.cCond, s.th] }, 'Conductor'),
                        h(Text, { key: 't', style: [s.cTipo, s.th] }, 'Tipo'),
                        h(Text, { key: 'r', style: [s.cRes, s.th] }, 'Resultado'),
                        h(Text, { key: 'cr', style: [s.cCrit, s.th] }, 'Criticidad'),
                    ]),
                    ...filas,
                ]),
            h(Footer, { key: 'foot' }),
        ]));

    return renderToBuffer(doc);
};
