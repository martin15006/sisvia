// Utilidades compartidas para mostrar notificaciones (campanita + pagina completa).
// Centraliza el icono, el color y el tiempo relativo para no duplicar logica.

// Icono por tipo (texto corto dentro del circulo)
export const ICONOS_TIPO = {
    chequeo_operativo: "✓",
    chequeo_observacion: "i",
    chequeo_alerta: "!",
    chequeo_critico: "!",
    chequeo_no_operativo: "✕",
    chequeo_abandonado: "✗",
    intento_bloqueado_aptitud: "✗",
    intento_bloqueado_vehiculo: "✗",
    licencia_proxima_vencer: "⏱",
    licencia_vencida: "⏱",
    soat_proximo_vencer: "⏱",
    rtm_proximo_vencer: "⏱",
    extintor_proximo_vencer: "⏱",
    vehiculo_sin_runt: "📋",
    informe_escalado: "📤",
    sistema: "•",
};

// Color del circulo segun el tipo. Para los chequeos sigue el semaforo del
// sistema: verde/azul/amarillo/rojo/gris. Los demas usan colores semanticos.
export const COLOR_TIPO = {
    chequeo_operativo: "verde",
    chequeo_observacion: "azul",
    chequeo_alerta: "amarillo",
    chequeo_critico: "rojo",
    chequeo_no_operativo: "gris",
    chequeo_abandonado: "rojo",
    intento_bloqueado_aptitud: "naranja",
    intento_bloqueado_vehiculo: "naranja",
    licencia_proxima_vencer: "naranja",
    licencia_vencida: "rojo",
    soat_proximo_vencer: "naranja",
    rtm_proximo_vencer: "naranja",
    extintor_proximo_vencer: "naranja",
    vehiculo_sin_runt: "naranja",
    informe_escalado: "azul",
    sistema: "verde",
};

export const iconoDe = (tipo) => ICONOS_TIPO[tipo] || "•";
export const colorDe = (tipo) => COLOR_TIPO[tipo] || "verde";

// "hace 5 min", "hace 2 horas", etc.
export const tiempoRelativo = (iso) => {
    if (!iso) return "";
    const ahora = new Date();
    const cuando = new Date(iso);
    const segs = Math.floor((ahora - cuando) / 1000);
    if (segs < 60) return "ahora mismo";
    const mins = Math.floor(segs / 60);
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} ${hrs === 1 ? "hora" : "horas"}`;
    const dias = Math.floor(hrs / 24);
    if (dias < 7) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
    return cuando.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};
