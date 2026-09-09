import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { COLORES, fechaLarga } from '../branding.js';
import { Header, Footer, estilos } from './documentoBase.js';

const h = React.createElement;

const s = StyleSheet.create({
    bandaResultado: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 22, borderLeft: `4pt solid ${COLORES.ok}`, backgroundColor: '#EAF3DE' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    celda: { width: '50%', marginBottom: 10 },
    tablaCab: { flexDirection: 'row', backgroundColor: COLORES.grisFondo, paddingVertical: 5, paddingHorizontal: 8 },
    tablaFila: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderTop: `0.5pt solid #f0f0f0` },
    colItem: { flex: 1, fontSize: 9 },
    colRes: { width: 70, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },
    th: { fontSize: 8, color: COLORES.grisSuave, textTransform: 'uppercase' },
});

const colorEstado = (estado) => estado === 'critico' || estado === 'no_operativo' ? COLORES.critico
    : estado === 'alerta' ? COLORES.alerta : estado === 'observacion' ? COLORES.alerta : COLORES.ok;
const textoResultado = (r) => r === 'cumple' ? 'Cumple' : r === 'no_cumple' ? 'No cumple' : 'N/A';
const colorResultado = (r) => r === 'no_cumple' ? COLORES.critico : r === 'na' ? COLORES.grisSuave : COLORES.ok;

const Campo = (key, etiqueta, valor) =>
    h(View, { key, style: s.celda }, [
        h(Text, { key: 'e', style: estilos.etiqueta }, etiqueta),
        h(Text, { key: 'v', style: estilos.valor }, valor || '—'),
    ]);

export const chequeoPdfBuffer = async ({ chequeo, origen }) => {
    const v = chequeo.vehiculo || {};
    const c = chequeo.conductor || {};
    const filas = (chequeo.respuestas_chequeo || []).map((r, i) =>
        h(View, { key: i, style: s.tablaFila }, [
            h(Text, { key: 'i', style: s.colItem }, r.item?.descripcion || '—'),
            h(Text, { key: 'r', style: [s.colRes, { color: colorResultado(r.estado) }] }, textoResultado(r.estado)),
        ]));

    const doc = h(Document, null,
        h(Page, { size: 'A4', style: estilos.page }, [
            h(Header, {
                key: 'head',
                titulo: 'Chequeo preoperacional',
                origen,
                meta: [`N.º ${(chequeo.id || '').slice(0, 8).toUpperCase()}`, fechaLarga(chequeo.fecha)],
            }),
            h(View, { key: 'banda', style: [s.bandaResultado, { borderLeftColor: colorEstado(chequeo.resultado_estado) }] }, [
                h(Text, { key: 't', style: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colorEstado(chequeo.resultado_estado) } },
                    `Resultado: ${(chequeo.resultado_estado || '—').toUpperCase()}`),
                h(Text, { key: 'c', style: { marginLeft: 'auto', fontSize: 9, color: COLORES.grisSuave } },
                    `Criticidad ${chequeo.resultado_criticidad ?? 0}%${chequeo.tiene_falla_critica ? ' · con falla critica' : ''}`),
            ]),
            h(View, { key: 'body', style: estilos.cuerpo }, [
                h(View, { key: 'grid', style: s.grid }, [
                    Campo('c1', 'Vehiculo', `${v.placa || '—'}  ·  ${v.marca || ''} ${v.linea || ''}`.trim()),
                    Campo('c2', 'Conductor', `${c.nombre_completo || '—'}${c.cedula ? `  ·  CC ${c.cedula}` : ''}`),
                    Campo('c3', 'Tipo', chequeo.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
                    Campo('c4', 'Kilometraje', chequeo.kilometraje != null ? `${chequeo.kilometraje.toLocaleString('es-CO')} km` : '—'),
                ]),
                h(Text, { key: 'tt', style: estilos.seccionTitulo }, 'Checklist'),
                h(View, { key: 'tab' }, [
                    h(View, { key: 'cab', style: s.tablaCab }, [
                        h(Text, { key: 'i', style: [s.colItem, s.th] }, 'Item'),
                        h(Text, { key: 'r', style: [s.colRes, s.th] }, 'Resultado'),
                    ]),
                    ...filas,
                ]),
            ]),
            h(Footer, { key: 'foot' }),
        ]));

    return renderToBuffer(doc);
};
