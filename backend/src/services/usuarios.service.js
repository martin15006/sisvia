import { supabase } from '../config/supabase.js';
import { insertarConRespaldo } from './respaldo.service.js';

export const generarPasswordTemporal = () => {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

export const contarAdminsActivos = async () => {
    const { count, error } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'admin')
        .eq('activo', true);

    if (error) throw error;
    return count;
};


export const registrarAuditoria = async ({
    usuarioAfectadoId,
    accionPorId,
    accion,
    detalles = {},
}) => {
    // Con la IP y el navegador si lo hace el equipo SISVIA (enmienda 1 de portada-publica, HU-07).
    await insertarConRespaldo('auditoria_usuarios', {
        usuario_afectado_id: usuarioAfectadoId,
        accion_por_id: accionPorId,
        accion,
        detalles,
    });
};