import { supabase } from '../config/supabase.js';
import { normalizarDocumento } from '../utils/documento.js';

// IMPORTANTE: este helper NO debe filtrar por activo=true.
// Antes filtrabamos por activo=true aqui, pero eso provocaba que los conductores
// desactivados que intentaban entrar con su cedula vieran "Credenciales invalidas"
// (porque no se resolvia el email), en lugar del mensaje correcto "Cuenta desactivada".
//
// El chequeo de activo se hace despues en el controller, *despues* de validar
// que la contraseña sea correcta. Esto evita filtrar la existencia de cuentas
// a atacantes externos (account enumeration) y a la vez le da un mensaje claro
// al usuario legitimo que si conoce su contraseña.
export const buscarEmailPorCedula = async (cedula) => {
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cedula', cedula)
        .single();

    if (error || !usuario) return null;

    const { data, error: errAuth } = await supabase.auth.admin.getUserById(
        usuario.id
    );

    if (errAuth) return null;
    return data?.user?.email ?? null;
};


export const resolverIdentificador = async (identificador) => {
    if (identificador.includes('@')) {
        return identificador;
    }

    // Sin puntos ni espacios: "1.012.345.678" encuentra la cedula 1012345678.
    return await buscarEmailPorCedula(normalizarDocumento(identificador) || identificador);
};


export const obtenerPerfil = async (userId) => {
    // Join con sedes para tener sede_nombre disponible en una sola query
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            *,
            sedes:sede_id (
                id,
                nombre
            )
        `)
        .eq('id', userId)
        .single();

    if (error) throw error;
    // Aplanar el join: exponer solo sede_nombre como campo plano
    if (data) {
        data.sede_nombre = data.sedes?.nombre || null;
        delete data.sedes;
    }
    return data;
};