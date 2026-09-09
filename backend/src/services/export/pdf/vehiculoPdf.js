import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { COLORES, fechaLarga, etiquetaTipo, etiquetaEstado, colorDeEstado, estaVencido } from '../branding.js';
import { Header, Footer, estilos } from './documentoBase.js';

const h = React.createElement;

const s = StyleSheet.create({
    banda: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 22, borderLeft: `4pt solid ${COLORES.ok}`, backgroundColor: '#EAF3DE' },
    vip: { marginLeft: 8, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: COLORES.alerta, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    celda: { width: '33.33%', marginBottom: 10 },
    tablaCab: { flexDirection: 'row', backgroundColor: COLORES.grisFondo, paddingVertical: 5, paddingHorizontal: 8 },
    tablaFila: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderTop: `0.5pt solid #f0f0f0` },
    col1: { flex: 1, fontSize: 9 },
    col2: { width: 130, fontSize: 9 },
    col3: { width: 90, textAlign: 'right', fontSize: 9 },
    chFecha: { width: 104, fontSize: 9, paddingRight: 12 },
    chCond: { flex: 1, fontSize: 9, paddingRight: 12 },
    chTipo: { width: 92, fontSize: 9 },
    chRes: { width: 80, textAlign: 'right', fontSize: 9 },
    th: { fontSize: 8, color: COLORES.grisSuave, textTransform: 'uppercase' },
});

const textoResultado = (e) => (e || '—').replace('_', ' ').toUpperCase();

const Campo = (key, etiqueta, valor) =>
    h(View, { key, style: s.celda }, [
        h(Text, { key: 'e', style: estilos.etiqueta }, etiqueta),
        h(Text, { key: 'v', style: estilos.valor }, valor || '—'),
    ]);

export const vehiculoPdfBuffer = async ({ vehiculo, chequeos, origen }) => {
    const ce = vehiculo.sede || {};
    const ciudad = ce.ciudad?.nombre || '';
    const depto = ce.ciudad?.departamento?.nombre || '';
    const ubic = [ce.nombre, ciudad, depto].filter(Boolean).join(' · ');

    const docFilas = [
        ['SOAT', vehiculo.soat_vencimiento],
        ['Revisión técnico-mecánica', vehiculo.rtm_vencimiento],
        ['Extintor', vehiculo.extintor_vencimiento],
        ['Último cambio de aceite', vehiculo.ultimo_cambio_aceite],
    ].map(([etiqueta, fecha], i) => {
        const vencido = etiqueta !== 'Último cambio de aceite' && estaVencido(fecha);
        return h(View, { key: i, style: s.tablaFila }, [
            h(Text, { key: 'd', style: s.col1 }, etiqueta),
            h(Text, { key: 'f', style: [s.col3, { color: vencido ? COLORES.critico : COLORES.grisTexto, fontFamily: vencido ? 'Helvetica-Bold' : 'Helvetica' }] },
                `${fechaLarga(fecha)}${vencido ? '  ⚠' : ''}`),
        ]);
    });

    const filasChequeos = (chequeos || []).length
        ? chequeos.map((c, i) =>
            h(View, { key: i, style: s.tablaFila }, [
                h(Text, { key: 'f', style: s.chFecha }, fechaLarga(c.fecha)),
                h(Text, { key: 'co', style: s.chCond }, c.conductor?.nombre_completo || '—'),
                h(Text, { key: 't', style: s.chTipo }, c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
                h(Text, { key: 'r', style: [s.chRes, { color: colorDeEstado(c.resultado_estado), fontFamily: 'Helvetica-Bold' }] }, textoResultado(c.resultado_estado)),
            ]))
        : [h(View, { key: 'vacio', style: s.tablaFila }, h(Text, { style: { fontSize: 9, color: COLORES.grisSuave } }, 'Sin chequeos cerrados registrados.'))];

    const doc = h(Document, null,
        h(Page, { size: 'A4', style: estilos.page }, [
            h(Header, {
                key: 'head',
                titulo: 'Ficha de vehículo',
                origen,
                meta: [`Placa ${vehiculo.placa || '—'}`, etiquetaTipo(vehiculo.tipo)],
            }),
            h(View, { key: 'banda', style: [s.banda, { borderLeftColor: colorDeEstado(vehiculo.estado) }] }, [
                h(Text, { key: 't', style: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colorDeEstado(vehiculo.estado) } },
                    `Estado: ${etiquetaEstado(vehiculo.estado).toUpperCase()}`),
                vehiculo.nivel_criticidad != null
                    ? h(Text, { key: 'c', style: { marginLeft: 10, fontSize: 9, color: COLORES.grisSuave } }, `Criticidad ${vehiculo.nivel_criticidad}%`)
                    : null,
                vehiculo.es_vip ? h(Text, { key: 'v', style: s.vip }, 'VIP') : null,
                h(Text, { key: 'a', style: { marginLeft: 'auto', fontSize: 9, color: COLORES.grisSuave } }, vehiculo.activo ? 'Activo' : 'Inactivo'),
            ]),
            h(View, { key: 'body', style: estilos.cuerpo }, [
                h(Text, { key: 'tid', style: estilos.seccionTitulo }, 'Identificación'),
                h(View, { key: 'grid', style: s.grid }, [
                    Campo('g1', 'Marca y línea', `${vehiculo.marca || '—'} ${vehiculo.linea || ''}`.trim()),
                    Campo('g2', 'Tipo', etiquetaTipo(vehiculo.tipo)),
                    Campo('g3', 'Año modelo', vehiculo.modelo_anio ? String(vehiculo.modelo_anio) : '—'),
                    Campo('g4', 'Color', vehiculo.color),
                    Campo('g5', 'VIN / Chasis', vehiculo.vin),
                    Campo('g6', 'Kilometraje actual', vehiculo.kilometraje_actual != null ? `${Number(vehiculo.kilometraje_actual).toLocaleString('es-CO')} km` : '—'),
                ]),
                h(Text, { key: 'tdoc', style: estilos.seccionTitulo }, 'Documentación y vencimientos'),
                h(View, { key: 'tabdoc' }, [
                    h(View, { key: 'cab', style: s.tablaCab }, [
                        h(Text, { key: 'd', style: [s.col1, s.th] }, 'Documento'),
                        h(Text, { key: 'f', style: [s.col3, s.th] }, 'Vence'),
                    ]),
                    ...docFilas,
                ]),
                h(Text, { key: 'tub', style: estilos.seccionTitulo }, 'Ubicación'),
                h(Text, { key: 'ubv', style: { fontSize: 10 } }, ubic || '—'),
                ce.direccion ? h(Text, { key: 'dir', style: { fontSize: 9, color: COLORES.grisSuave, marginTop: 2 } }, ce.direccion) : null,
                vehiculo.notas ? h(Text, { key: 'tnot', style: estilos.seccionTitulo }, 'Notas y observaciones') : null,
                vehiculo.notas ? h(Text, { key: 'notv', style: { fontSize: 10 } }, vehiculo.notas) : null,
                h(Text, { key: 'tch', style: estilos.seccionTitulo }, 'Últimos chequeos'),
                h(View, { key: 'tabch' }, [
                    h(View, { key: 'cab', style: s.tablaCab }, [
                        h(Text, { key: 'f', style: [s.chFecha, s.th] }, 'Fecha'),
                        h(Text, { key: 'co', style: [s.chCond, s.th] }, 'Conductor'),
                        h(Text, { key: 't', style: [s.chTipo, s.th] }, 'Tipo'),
                        h(Text, { key: 'r', style: [s.chRes, s.th] }, 'Resultado'),
                    ]),
                    ...filasChequeos,
                ]),
            ]),
            h(Footer, { key: 'foot' }),
        ]));

    return renderToBuffer(doc);
};
