// "Exportar todo" de una empresa (pacto para-empresas, HU-04): que archivos lleva
// el .zip, sus columnas y sus nombres. PURO: sin base de datos, para node --test.
// Los datos los junta respaldo.js; las filas llegan ya con sus nombres legibles
// (sede, placa, conductor, cargo) para que el CSV se entienda sin cruzar ids.

import { TIPOS_BUZON, ESTADOS_BUZON } from '../buzonReglas.js';

const ZONA = 'America/Bogota';

// 2026-09-21 en hora de Colombia (el servidor corre en UTC).
export const diaLocal = (fecha) => new Date(fecha).toLocaleDateString('en-CA', { timeZone: ZONA });

const slug = (texto) => String(texto || 'empresa')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'empresa';

// respaldo-transportes-del-sur-2026-09-21.zip
export const nombreRespaldo = (nombreEmpresa, fecha) => `respaldo-${slug(nombreEmpresa)}-${diaLocal(fecha)}.zip`;

// chequeos-pdf/2026-09-21_ABC123_1a2b3c4d.pdf (el id corto evita choques entre chequeos del mismo dia)
export const nombrePdfChequeo = (c) =>
    `chequeos-pdf/${diaLocal(c.fecha || c.created_at)}_${slug(c.vehiculo?.placa || 'sin-placa').toUpperCase()}_${String(c.id).slice(0, 8)}.pdf`;

const siNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '');

// [archivo, columnas]; cada columna es [titulo, clave | (fila) => valor]
export const ARCHIVOS_CSV = [
    ['sedes.csv', [
        ['ID', 'id'], ['Nombre', 'nombre'], ['Ciudad', (s) => s.ciudad?.nombre], ['Departamento', (s) => s.ciudad?.departamento?.nombre],
        ['Dirección', 'direccion'], ['Activa', (s) => siNo(s.activo)], ['Creada', 'created_at'],
    ]],
    ['usuarios.csv', [
        ['ID', 'id'], ['Nombre', 'nombre_completo'], ['Cédula', 'cedula'], ['Correo', 'email'], ['Teléfono', 'telefono'],
        ['Cargo', 'cargo'], ['Sede', (u) => u.sede?.nombre], ['Departamento', (u) => u.departamento?.nombre],
        ['Licencia', 'licencia_numero'], ['Categoría de licencia', 'licencia_categoria'], ['Vence la licencia', 'licencia_vencimiento'],
        ['EPS', 'eps'], ['ARL', 'arl'], ['Activo', (u) => siNo(u.activo)], ['Creado', 'created_at'],
    ]],
    ['vehiculos.csv', [
        ['ID', 'id'], ['Placa', 'placa'], ['VIN', 'vin'], ['Marca', 'marca'], ['Línea', 'linea'], ['Tipo', 'tipo'],
        ['Modelo', 'modelo_anio'], ['Color', 'color'], ['Kilometraje', 'kilometraje_actual'], ['Sede', (v) => v.sede?.nombre],
        ['Estado', 'estado'], ['Criticidad (%)', 'nivel_criticidad'], ['Vence el SOAT', 'soat_vencimiento'],
        ['Vence la revisión técnico-mecánica', 'rtm_vencimiento'], ['Vence el extintor', 'extintor_vencimiento'],
        ['Último cambio de aceite', 'ultimo_cambio_aceite'], ['VIP', (v) => siNo(v.es_vip)], ['Activo', (v) => siNo(v.activo)],
        ['Dado de baja por traspaso', (v) => siNo(v.dado_de_baja)], ['Fecha de la baja', 'baja_en'], ['Motivo de la baja', 'baja_motivo'],
        ['RUNT', 'runt_url'], ['Notas', 'notas'], ['Creado', 'created_at'],
    ]],
    ['chequeos.csv', [
        ['ID', 'id'], ['Fecha', 'fecha'], ['Tipo', 'tipo'], ['Placa', (c) => c.vehiculo?.placa], ['Conductor', (c) => c.conductor?.nombre_completo],
        ['Cédula del conductor', (c) => c.conductor?.cedula], ['Sede', (c) => c.sede?.nombre], ['Kilometraje', 'kilometraje'],
        ['Resultado', 'resultado_estado'], ['Criticidad (%)', 'resultado_criticidad'], ['Con falla crítica', (c) => siNo(c.tiene_falla_critica)],
        ['Ítems que cumplen', 'items_cumple_count'], ['Ítems que no cumplen', 'items_no_cumple_count'], ['Ítems que no aplican', 'items_no_aplica_count'],
        ['Cerrado', (c) => siNo(c.cerrado)], ['Fecha de cierre', 'fecha_cierre'], ['Abandonado', (c) => siNo(c.abandonado)],
        ['Motivo del abandono', 'motivo_abandono'], ['Notas', 'notas_generales'], ['ID del vehículo', 'vehiculo_id'], ['ID del conductor', 'conductor_id'],
    ]],
    ['respuestas_chequeo.csv', [
        ['ID del chequeo', 'chequeo_id'], ['Categoría', (r) => r.item?.categoria?.nombre], ['Ítem', (r) => r.item?.descripcion],
        ['Crítico', (r) => siNo(r.item?.es_critico)], ['Resultado', 'estado'], ['Observación', 'observacion'],
    ]],
    ['respuestas_aptitud.csv', [
        ['ID del chequeo', 'chequeo_id'], ['Pregunta', (r) => r.pregunta?.pregunta],
        ['Respuesta', (r) => ({ si: 'Sí', no: 'No' })[r.respuesta] ?? r.respuesta], ['Apto', (r) => siNo(r.es_apto)],
    ]],
    // CB-21: lo que la empresa le escribio a SISVIA y lo que se le respondio (HU-18)
    ['mensajes_a_sisvia.csv', [
        ['ID', 'id'], ['Fecha', 'created_at'], ['Tipo', (m) => TIPOS_BUZON[m.tipo] || m.tipo], ['Estado', (m) => ESTADOS_BUZON[m.estado] || m.estado],
        ['Escribió', 'autor_nombre'], ['Cargo', 'autor_cargo'], ['Mensaje', 'mensaje'], ['Pantalla', 'pantalla'], ['Navegador', 'navegador'],
        ['Adjunto', 'adjunto_nombre'], ['Resuelto', 'resuelto_en'],
    ]],
    ['respuestas_a_mensajes.csv', [
        ['ID del mensaje', 'mensaje_id'], ['Fecha', 'created_at'], ['De', (r) => (r.de_sisvia ? 'Equipo SISVIA' : 'La empresa')],
        ['Escribió', 'autor_nombre'], ['Texto', 'texto'], ['Adjunto', 'adjunto_nombre'],
    ]],
    ['intentos_bloqueados.csv', [
        ['ID', 'id'], ['Fecha', 'fecha'], ['Razón', 'razon'], ['Detalle', 'detalle'], ['Placa', (i) => i.vehiculo?.placa],
        ['Conductor', (i) => i.conductor?.nombre_completo], ['Cédula del conductor', (i) => i.conductor?.cedula], ['Sede', (i) => i.sede?.nombre],
    ]],
];

export const textoLeeme = ({ producto, empresa, fecha, quien, cantidades }) => [
    `Respaldo de ${empresa} en ${producto}`,
    `Generado el ${new Date(fecha).toLocaleString('es-CO', { timeZone: ZONA, dateStyle: 'long', timeStyle: 'short' })} por ${quien}.`,
    '',
    'Qué trae:',
    ...ARCHIVOS_CSV.map(([archivo]) => { const n = cantidades[archivo] ?? 0; return `- ${archivo}: ${n} ${n === 1 ? 'fila' : 'filas'}`; }),
    `- chequeos-pdf/: un PDF por chequeo (${cantidades.pdf ?? 0})`,
    '',
    'Los CSV se abren con Excel (separador ";", texto en UTF-8).',
    'Se relacionan por sus columnas de ID: por ejemplo, respuestas_chequeo.csv trae el "ID del chequeo".',
    '',
].join('\r\n');
