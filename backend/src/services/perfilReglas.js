// Reglas PURAS de "Mi perfil" (pedido de Martín, 2026-09-23: "si no se ve
// cambios que el boton de guardar cambios este desactivado y al hacer un cambio
// tambien toque ingresar la contraseña de uno"). Sin base de datos, para
// probarlas con node --test.
import { normalizarTelefono } from '../utils/telefono.js';

export const MENSAJES_PERFIL = {
    sinCambios: 'No hay cambios para guardar.',
    escribeContrasena: 'Escribe tu contraseña para guardar los cambios.',
};

const nombreLimpio = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

// Lo que de verdad cambia entre la cuenta y lo que se pide guardar: solo esos
// campos se escriben. Si no queda nada, no hay nada que guardar (y no se pide
// la contraseña: ningún intento se gasta en balde).
//   actual: { nombre_completo, telefono, foto_url } tal como están en la base
//   pedido: los mismos campos, ya validados; los que no vienen no se tocan
export const cambiosDePerfil = (actual, pedido) => {
    const cambios = {};
    if (pedido.nombre_completo !== undefined && nombreLimpio(pedido.nombre_completo) !== nombreLimpio(actual?.nombre_completo)) {
        cambios.nombre_completo = nombreLimpio(pedido.nombre_completo);
    }
    if (pedido.telefono !== undefined && normalizarTelefono(pedido.telefono) !== normalizarTelefono(actual?.telefono)) {
        cambios.telefono = normalizarTelefono(pedido.telefono);
    }
    if (pedido.foto_url !== undefined && (pedido.foto_url || null) !== (actual?.foto_url || null)) {
        cambios.foto_url = pedido.foto_url || null;
    }
    return cambios;
};
