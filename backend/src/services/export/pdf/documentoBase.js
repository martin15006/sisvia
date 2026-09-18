import fs from 'fs';
import React from 'react';
import { Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORES, LOGO_PATH, lineaOrigen, fechaHora } from '../branding.js';

const h = React.createElement;

// El logo como data URI: @react-pdf lo embebe directo (un path local lo intenta
// resolver con fetch y falla en Node). Se lee una sola vez al cargar el modulo.
const LOGO_DATA_URI = 'data:image/png;base64,' + fs.readFileSync(LOGO_PATH).toString('base64');

export const estilos = StyleSheet.create({
    page: { paddingTop: 0, paddingBottom: 46, fontSize: 10, color: COLORES.grisTexto, fontFamily: 'Helvetica' },
    header: { backgroundColor: COLORES.primario, color: COLORES.sobreMarca, padding: 16, flexDirection: 'row', alignItems: 'center' },
    headerLogo: { width: 38, height: 38, backgroundColor: '#fff', borderRadius: 6, padding: 4, marginRight: 12 },
    headerTitulo: { fontSize: 15, fontFamily: 'Helvetica-Bold' },
    headerSub: { fontSize: 9, opacity: 0.9, marginTop: 2 },
    headerMeta: { marginLeft: 'auto', textAlign: 'right', fontSize: 8, opacity: 0.95 },
    cuerpo: { paddingHorizontal: 22, paddingTop: 14 },
    seccionTitulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORES.primarioOscuro, marginBottom: 6, marginTop: 10 },
    etiqueta: { fontSize: 8, color: COLORES.grisSuave, textTransform: 'uppercase', letterSpacing: 0.3 },
    valor: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingVertical: 9, backgroundColor: '#fafafa', borderTop: `0.5pt solid ${COLORES.grisLinea}`, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: COLORES.grisSuave },
});

// Header comun: logo + titulo + "{Organizacion} · Regional X · Sede" + meta (numero/fecha).
export const Header = ({ titulo, origen, meta }) =>
    h(View, { style: estilos.header }, [
        h(Image, { key: 'logo', style: estilos.headerLogo, src: LOGO_DATA_URI }),
        h(View, { key: 'txt' }, [
            h(Text, { key: 't', style: estilos.headerTitulo }, titulo),
            h(Text, { key: 's', style: estilos.headerSub }, lineaOrigen(origen)),
        ]),
        h(View, { key: 'meta', style: estilos.headerMeta },
            (meta || []).map((m, i) => h(Text, { key: i }, m))),
    ]);

// Footer fijo con paginado.
export const Footer = () =>
    h(View, { style: estilos.footer, fixed: true }, [
        h(Text, { key: 'l' }, `Generado el ${fechaHora(new Date().toISOString())} · SISVIA · Control de vehículos`),
        h(Text, { key: 'r', render: ({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}` }),
    ]);
