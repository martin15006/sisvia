import { supabase } from '../config/supabase.js';

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
    await supabase.from('auditoria_usuarios').insert({
        usuario_afectado_id: usuarioAfectadoId,
        accion_por_id: accionPorId,
        accion,
        detalles,
    });
};