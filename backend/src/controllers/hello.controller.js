import { supabase } from "../config/supabase.js";

export const getHello = (req, res) => {
    res.json({
        mensaje: '¡Hola desde el backend del SISVIA!',
        timestamp: new Date().toISOString(),
    });
};

export const testSupabase = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1,
        });
        if (error) {
            return res.status(500).json({
                conectado: false,
                error: error.message,
            });
        }

        res.json({
            conectado: true,
            mensaje: 'Conexion a Supabase exitosa',
            usuariosRegistrados: data.users.length,
        });
    } catch (err) {
        res.status(500).json({
            conectado: false,
            error: err.message,
        });
    }
};