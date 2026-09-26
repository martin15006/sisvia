// "Exportar todo" de una empresa (pacto para-empresas, HU-04 · RNF-02): junta sus
// datos y los escribe en el .zip. Todo se trae en lotes (no una consulta por
// chequeo): con 1.000 chequeos, una por chequeo tardaria minutos solo en ir y
// volver de la base. Los PDF se arman en varios hilos (pdfEnHilos.js).
import { supabase } from '../../config/supabase.js';
import { MARCA } from '../../config/marca.js';
import { deLaEmpresa } from '../scopeReglas.js';
import { obtenerMapaEmails } from '../email.service.js';
import { cabeceraDeSede, etiquetaCargo } from './branding.js';
import { crearGeneradorPdf } from './pdf/pdfEnHilos.js';
import { aCsv } from './csv.js';
import { ARCHIVOS_CSV, nombrePdfChequeo, textoLeeme } from './respaldoReglas.js';

const PAGINA = 1000;       // tope de filas por consulta de Supabase
const LOTE_CHEQUEOS = 100; // chequeos por consulta de respuestas (la URL lleva sus ids)
const CONSULTAS_A_LA_VEZ = 4;

export class RespaldoCortado extends Error {}

// Todas las filas, de a 1.000 (Supabase no devuelve mas por consulta).
const todas = async (armar) => {
    const filas = [];
    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await armar().range(desde, desde + PAGINA - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < PAGINA) return filas;
    }
};

const enLotes = (lista, tamano) => {
    const lotes = [];
    for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
    return lotes;
};

// Respuestas de muchos chequeos (tablas sin empresa_id: se piden por chequeo_id),
// de a 4 consultas a la vez.
const respuestasDe = async (tabla, campos, idsChequeos) => {
    const filas = [];
    for (const grupo of enLotes(enLotes(idsChequeos, LOTE_CHEQUEOS), CONSULTAS_A_LA_VEZ)) {
        const partes = await Promise.all(grupo.map((lote) =>
            todas(() => supabase.from(tabla).select(campos).in('chequeo_id', lote).order('id'))));
        for (const parte of partes) filas.push(...parte);
    }
    return filas;
};

// Catalogo (items y preguntas) por id: se cruza aca, no en cada una de las
// 39.000 filas de respuestas (la respuesta pesa la mitad).
const porId = async (tabla, campos, ids) => {
    const mapa = new Map();
    for (const lote of enLotes([...new Set(ids)], 200)) {
        const { data, error } = await supabase.from(tabla).select(campos).in('id', lote);
        if (error) throw error;
        for (const fila of data || []) mapa.set(fila.id, fila);
    }
    return mapa;
};

// escribe todo en `zip` (crearZip). cortado(): true si el que descarga se fue (CB-01).
export const generarRespaldo = async ({ empresa, zip, quien, fecha, cortado = () => false }) => {
    const deEmpresa = (tabla, campos, orden = 'id') => todas(() => deLaEmpresa(supabase.from(tabla).select(campos), empresa.id).order(orden));

    const [sedes, usuarios, vehiculos, chequeos, intentos, mensajes, respuestasBuzon] = await Promise.all([
        deEmpresa('sedes', 'id, nombre, direccion, activo, created_at, ciudad:ciudad_id ( nombre, departamento:departamento_id ( nombre ) )'),
        deEmpresa('usuarios', 'id, cedula, nombre_completo, telefono, rol, es_pool, licencia_numero, licencia_categoria, licencia_vencimiento, eps, arl, activo, created_at, sede:sede_id ( nombre ), departamento:departamento_id ( nombre )'),
        deEmpresa('vehiculos', '*, sede:sede_id ( nombre )'),
        deEmpresa('chequeos_preoperacionales', `
            id, fecha, tipo, kilometraje, resultado_estado, resultado_criticidad, tiene_falla_critica,
            items_cumple_count, items_no_cumple_count, items_no_aplica_count, cerrado, fecha_cierre,
            abandonado, motivo_abandono, notas_generales, sede_id, vehiculo_id, conductor_id, created_at,
            vehiculo:vehiculos ( placa, marca, linea ),
            conductor:usuarios!chequeos_preoperacionales_conductor_id_fkey ( nombre_completo, cedula )
        `, 'fecha'),
        deEmpresa('intentos_chequeo_bloqueado', `
            id, fecha, razon, detalle, sede_id,
            conductor:usuarios!intentos_chequeo_bloqueado_conductor_id_fkey ( nombre_completo, cedula ),
            vehiculo:vehiculos ( placa )
        `, 'fecha'),
        // CB-21: los mensajes a SISVIA y su hilo (HU-18)
        deEmpresa('buzon_mensajes', 'id, created_at, tipo, estado, autor_nombre, autor_cargo, mensaje, pantalla, navegador, adjunto_nombre, resuelto_en', 'created_at'),
        deEmpresa('buzon_respuestas', 'id, mensaje_id, created_at, de_sisvia, autor_nombre, texto, adjunto_nombre', 'created_at'),
    ]);

    // Chequeos e intentos guardan la sede sin clave foranea: su nombre sale de la lista de sedes.
    const conSede = (fila) => ({ ...fila, sede: sedes.find((x) => x.id === fila.sede_id) || null });
    chequeos.forEach((c, i) => { chequeos[i] = conSede(c); });
    const idsChequeos = chequeos.map((c) => c.id);

    const [respuestas, aptitud, correos] = await Promise.all([
        respuestasDe('respuestas_chequeo', 'id, chequeo_id, item_id, estado, observacion', idsChequeos),
        respuestasDe('respuestas_aptitud', 'id, chequeo_id, pregunta_id, respuesta, es_apto', idsChequeos),
        usuarios.length ? obtenerMapaEmails() : new Map(),
    ]);
    const [items, preguntas] = await Promise.all([
        porId('items_chequeo', 'id, descripcion, orden, es_critico, categoria:categorias_chequeo ( nombre )', respuestas.map((r) => r.item_id)),
        porId('preguntas_aptitud', 'id, pregunta, orden', aptitud.map((r) => r.pregunta_id)),
    ]);
    for (const r of respuestas) r.item = items.get(r.item_id) || null;
    for (const r of aptitud) r.pregunta = preguntas.get(r.pregunta_id) || null;
    const orden = (a, b) => (a.item?.orden || 0) - (b.item?.orden || 0);
    respuestas.sort((a, b) => (a.chequeo_id === b.chequeo_id ? orden(a, b) : a.chequeo_id < b.chequeo_id ? -1 : 1));

    const filas = {
        'sedes.csv': sedes,
        'usuarios.csv': usuarios.map((u) => ({ ...u, email: correos.get(u.id) || '', cargo: etiquetaCargo(u.rol, u.es_pool) })),
        'vehiculos.csv': vehiculos,
        'chequeos.csv': chequeos,
        'respuestas_chequeo.csv': respuestas,
        'respuestas_aptitud.csv': aptitud,
        'mensajes_a_sisvia.csv': mensajes,
        'respuestas_a_mensajes.csv': respuestasBuzon,
        'intentos_bloqueados.csv': intentos.map(conSede),
    };

    // 1) El LEEME y los CSV (HU-04.3: con sus encabezados aunque esten vacios)
    const cantidades = Object.fromEntries(Object.entries(filas).map(([k, v]) => [k, v.length]));
    cantidades.pdf = chequeos.length;
    await zip.agregar('LEEME.txt', textoLeeme({ producto: MARCA.nombre, empresa: empresa.nombre, fecha, quien, cantidades }));
    for (const [archivo, columnas] of ARCHIVOS_CSV) {
        if (cortado()) throw new RespaldoCortado();
        await zip.agregar(archivo, aCsv(columnas, filas[archivo]));
    }

    // 2) Un PDF por chequeo, con el mismo generador del boton "PDF" del detalle
    if (chequeos.length > 0) {
        const respuestasPorChequeo = new Map();
        for (const r of respuestas) {
            if (!respuestasPorChequeo.has(r.chequeo_id)) respuestasPorChequeo.set(r.chequeo_id, []);
            respuestasPorChequeo.get(r.chequeo_id).push(r);
        }
        const origenes = new Map(); // una cabecera por sede, no una por chequeo
        for (const sedeId of new Set(chequeos.map((c) => c.sede_id))) origenes.set(sedeId, await cabeceraDeSede(sedeId));

        const pdf = crearGeneradorPdf();
        try {
            // De a dos por hilo: siempre hay uno esperando mientras se escribe el anterior.
            for (const lote of enLotes(chequeos, Math.max(2, pdf.hilos * 2))) {
                if (cortado()) throw new RespaldoCortado();
                const pdfs = await Promise.all(lote.map((c) => pdf.generar({
                    chequeo: { ...c, respuestas_chequeo: respuestasPorChequeo.get(c.id) || [] },
                    origen: origenes.get(c.sede_id),
                })));
                for (let i = 0; i < lote.length; i++) await zip.agregar(nombrePdfChequeo(lote[i]), pdfs[i]);
            }
        } finally {
            await pdf.cerrar();
        }
    }

    return { archivos: zip.archivos, chequeos: chequeos.length };
};
