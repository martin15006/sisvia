// Guardar un registro con la IP y el navegador del pedido (pacto portada-publica,
// enmienda 1: HU-07). Si la base todavia no tiene las columnas (el codigo llego
// antes que la migracion 2026-09-28_registro_ip.sql), guarda igual sin ellas:
// el registro no se pierde.
import { supabase } from '../config/supabase.js';
import { respaldoDelPedido } from '../middlewares/contextoPedido.js';

// PGRST204: columna que no existe · PGRST202: funcion con esos parametros que no existe.
const faltaLaMigracion = (error) => error?.code === 'PGRST204' || error?.code === 'PGRST202';

export const insertarConRespaldo = async (tabla, fila, respaldo = respaldoDelPedido()) => {
    const conRespaldo = { ...fila, ...respaldo };
    const { error } = await supabase.from(tabla).insert(conRespaldo);
    if (error && faltaLaMigracion(error) && Object.keys(respaldo).length) {
        return supabase.from(tabla).insert(fila);
    }
    return { error };
};

// Las funciones de la marca de dueño: con p_ip y p_navegador si la base ya las tiene.
export const rpcConRespaldo = async (funcion, parametros, respaldo = respaldoDelPedido()) => {
    const extra = respaldo.ip ? { p_ip: respaldo.ip, p_navegador: respaldo.navegador ?? null } : {};
    const resultado = await supabase.rpc(funcion, { ...parametros, ...extra });
    if (resultado.error && faltaLaMigracion(resultado.error) && Object.keys(extra).length) {
        return supabase.rpc(funcion, parametros);
    }
    return resultado;
};
