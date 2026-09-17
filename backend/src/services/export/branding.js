import { supabase } from '../../config/supabase.js';
import { ORGANIZACION, LOGO_PATH } from '../../config/marca.js';

export { LOGO_PATH };

// Paleta del producto para los documentos
export const COLORES = {
    primario: '#1350D8',
    primarioOscuro: '#0E3CA3',
    grisTexto: '#1A1A1A',
    grisSuave: '#5F5E5A',
    grisLinea: '#E5E5E5',
    grisFondo: '#F1EFE8',
    ok: '#3B6D11',
    alerta: '#BA7517',
    critico: '#A32D2D',
};

// Resuelve la sede de un documento a { sedeNombre, departamentoNombre } para el
// header dinamico "{Organizacion} · Regional {departamento} · {Sede}".
export const cabeceraDeSede = async (sedeId) => {
    if (!sedeId) return { sedeNombre: '', departamentoNombre: '' };
    const { data } = await supabase
        .from('sedes')
        .select('nombre, ciudad:ciudad_id ( departamento:departamento_id ( nombre ) )')
        .eq('id', sedeId)
        .maybeSingle();
    return {
        sedeNombre: data?.nombre || '',
        departamentoNombre: data?.ciudad?.departamento?.nombre || '',
    };
};

// "Mi organizacion · Regional Tolima · Sede Ibague"
export const lineaOrigen = ({ sedeNombre, departamentoNombre }) => {
    const partes = [ORGANIZACION];
    if (departamentoNombre) partes.push(`Regional ${departamentoNombre}`);
    if (sedeNombre) partes.push(sedeNombre);
    return partes.join(' · ');
};

export const fechaLarga = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
};
export const fechaHora = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

// Etiquetas legibles (espejo de las del frontend) para los documentos.
const TIPOS_VEHICULO = { camion: 'Camión', camioneta: 'Camioneta', tractocamion: 'Tractocamión', automovil: 'Automóvil', motocicleta: 'Motocicleta', motocarro: 'Motocarro', microbus: 'Microbús', buseta: 'Buseta', bus: 'Bus' };
export const etiquetaTipo = (t) => TIPOS_VEHICULO[t] || t || '—';

const ESTADOS_VEHICULO = { operativo: 'Operativo', observacion: 'Observación', alerta: 'Alerta', critico: 'Crítico', no_operativo: 'No operativo' };
export const etiquetaEstado = (e) => ESTADOS_VEHICULO[e] || e || '—';

// Origen de un REPORTE segun el scope del admin que lo genera (no hay un solo
// sede): admin de sede -> su sede; Director Regional -> su departamento;
// superadmin -> solo el nombre de la organizacion. El suplente usa la sede que cubre.
export const origenDeUsuario = async (usuario) => {
    const sedeId = usuario.sedeActiva || usuario.sede_id;
    if (sedeId) return cabeceraDeSede(sedeId);
    if (usuario.departamento_id) {
        const { data } = await supabase
            .from('departamentos')
            .select('nombre')
            .eq('id', usuario.departamento_id)
            .maybeSingle();
        return { sedeNombre: '', departamentoNombre: data?.nombre || '' };
    }
    return { sedeNombre: '', departamentoNombre: '' };
};

// Cargo legible (espejo de frontend/src/lib/roles.js). Un conductor del pool se
// muestra como "Pool de transporte".
const ETIQUETA_ROL = { superadmin: 'Administrador general', admin_departamental: 'Director Regional', admin_sede: 'Coordinador de sede', admin: 'Coordinador de sede', conductor: 'Conductor' };
export const etiquetaCargo = (rol, esPool) =>
    rol === 'conductor' && esPool ? 'Pool de transporte' : (ETIQUETA_ROL[rol] || rol || '—');

// Color del estado (operativo/observacion/alerta/critico/no_operativo) para banderas y badges.
export const colorDeEstado = (estado) =>
    estado === 'critico' || estado === 'no_operativo' ? COLORES.critico
        : estado === 'alerta' || estado === 'observacion' ? COLORES.alerta
            : COLORES.ok;

// ¿La fecha (vencimiento) ya pasó? Devuelve false si no hay fecha.
export const estaVencido = (fecha) => {
    if (!fecha) return false;
    const t = new Date(fecha).getTime();
    return Number.isFinite(t) && t < Date.now();
};
