import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { COLORES, fechaLarga, etiquetaCargo, etiquetaTipo, colorDeEstado, estaVencido } from '../branding.js';
import { Header, Footer, estilos } from './documentoBase.js';

const h = React.createElement;

const s = StyleSheet.create({
    banda: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 22, borderLeft: `4pt solid ${COLORES.ok}`, backgroundColor: '#EAF3DE' },
    nombre: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORES.primarioOscuro },
    cargo: { marginLeft: 10, fontSize: 9, color: COLORES.grisSuave },
    pool: { marginLeft: 8, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: COLORES.alerta, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    celda: { width: '33.33%', marginBottom: 10 },
    tablaCab: { flexDirection: 'row', backgroundColor: COLORES.grisFondo, paddingVertical: 5, paddingHorizontal: 8 },
    tablaFila: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderTop: `0.5pt solid #f0f0f0` },
    col1: { flex: 1, fontSize: 9 },
    col3: { width: 90, textAlign: 'right', fontSize: 9 },
    chFecha: { width: 104, fontSize: 9, paddingRight: 12 },
    chVeh: { flex: 1, fontSize: 9, paddingRight: 12 },
    chTipo: { width: 92, fontSize: 9 },
    chRes: { width: 80, textAlign: 'right', fontSize: 9 },
    th: { fontSize: 8, color: COLORES.grisSuave, textTransform: 'uppercase' },
});

const textoResultado = (c) => c.cerrado ? (c.resultado_estado || '—').replace('_', ' ').toUpperCase() : 'EN PROCESO';

const Campo = (key, etiqueta, valor) =>
    h(View, { key, style: s.celda }, [
        h(Text, { key: 'e', style: estilos.etiqueta }, etiqueta),
        h(Text, { key: 'v', style: estilos.valor }, valor || '—'),
    ]);

export const conductorPdfBuffer = async ({ conductor, chequeos, origen }) => {
    const ce = conductor.sede || {};
    const ubic = [ce.nombre, ce.ciudad?.nombre, ce.ciudad?.departamento?.nombre].filter(Boolean).join(' · ');
    const licVencida = estaVencido(conductor.licencia_vencimiento);

    const filasChequeos = (chequeos || []).length
        ? chequeos.map((c, i) =>
            h(View, { key: i, style: s.tablaFila }, [
                h(Text, { key: 'f', style: s.chFecha }, fechaLarga(c.fecha)),
                h(Text, { key: 'v', style: s.chVeh }, c.vehiculo?.placa || '—'),
                h(Text, { key: 't', style: s.chTipo }, c.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
                h(Text, { key: 'r', style: [s.chRes, { color: c.cerrado ? colorDeEstado(c.resultado_estado) : COLORES.grisSuave, fontFamily: 'Helvetica-Bold' }] }, textoResultado(c)),
            ]))
        : [h(View, { key: 'vacio', style: s.tablaFila }, h(Text, { style: { fontSize: 9, color: COLORES.grisSuave } }, 'Sin chequeos registrados.'))];

    const doc = h(Document, null,
        h(Page, { size: 'A4', style: estilos.page }, [
            h(Header, {
                key: 'head',
                titulo: 'Ficha de conductor',
                origen,
                meta: [`CC ${conductor.cedula || '—'}`, etiquetaCargo(conductor.rol, conductor.es_pool)],
            }),
            h(View, { key: 'banda', style: s.banda }, [
                h(Text, { key: 'n', style: s.nombre }, conductor.nombre_completo || '—'),
                h(Text, { key: 'c', style: s.cargo }, etiquetaCargo(conductor.rol, conductor.es_pool)),
                conductor.es_pool ? h(Text, { key: 'p', style: s.pool }, 'POOL') : null,
                h(Text, { key: 'a', style: { marginLeft: 'auto', fontSize: 9, color: COLORES.grisSuave } }, conductor.activo ? 'Activo' : 'Inactivo'),
            ]),
            h(View, { key: 'body', style: estilos.cuerpo }, [
                h(Text, { key: 'tid', style: estilos.seccionTitulo }, 'Identificación'),
                h(View, { key: 'grid', style: s.grid }, [
                    Campo('g1', 'Cédula', conductor.cedula),
                    Campo('g2', 'Teléfono', conductor.telefono),
                    Campo('g3', 'Correo', conductor.email),
                    Campo('g4', 'Cargo', etiquetaCargo(conductor.rol, conductor.es_pool)),
                ]),
                h(Text, { key: 'tlic', style: estilos.seccionTitulo }, 'Licencia de conducción'),
                h(View, { key: 'tablic' }, [
                    h(View, { key: 'cab', style: s.tablaCab }, [
                        h(Text, { key: 'a', style: [s.col1, s.th] }, 'Dato'),
                        h(Text, { key: 'b', style: [s.col3, s.th] }, 'Valor'),
                    ]),
                    h(View, { key: 'l1', style: s.tablaFila }, [h(Text, { key: 'a', style: s.col1 }, 'Número'), h(Text, { key: 'b', style: s.col3 }, conductor.licencia_numero || '—')]),
                    h(View, { key: 'l2', style: s.tablaFila }, [h(Text, { key: 'a', style: s.col1 }, 'Categoría'), h(Text, { key: 'b', style: s.col3 }, conductor.licencia_categoria || '—')]),
                    h(View, { key: 'l3', style: s.tablaFila }, [
                        h(Text, { key: 'a', style: s.col1 }, 'Vencimiento'),
                        h(Text, { key: 'b', style: [s.col3, { color: licVencida ? COLORES.critico : COLORES.grisTexto, fontFamily: licVencida ? 'Helvetica-Bold' : 'Helvetica' }] }, `${fechaLarga(conductor.licencia_vencimiento)}${licVencida ? '  ⚠ VENCIDA' : ''}`),
                    ]),
                ]),
                h(Text, { key: 'tss', style: estilos.seccionTitulo }, 'Seguridad social'),
                h(View, { key: 'gridss', style: s.grid }, [
                    Campo('s1', 'EPS', conductor.eps),
                    Campo('s2', 'ARL', conductor.arl),
                ]),
                h(Text, { key: 'tub', style: estilos.seccionTitulo }, 'Ubicación'),
                h(Text, { key: 'ubv', style: { fontSize: 10 } }, ubic || '—'),
                ce.direccion ? h(Text, { key: 'dir', style: { fontSize: 9, color: COLORES.grisSuave, marginTop: 2 } }, ce.direccion) : null,
                h(Text, { key: 'tch', style: estilos.seccionTitulo }, 'Últimos chequeos'),
                h(View, { key: 'tabch' }, [
                    h(View, { key: 'cab', style: s.tablaCab }, [
                        h(Text, { key: 'f', style: [s.chFecha, s.th] }, 'Fecha'),
                        h(Text, { key: 'v', style: [s.chVeh, s.th] }, 'Vehículo'),
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
