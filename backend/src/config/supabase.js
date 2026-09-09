import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// validaciones
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        'Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env'
    );
}

// cliente de supabase 
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// ============================================================================
// CLIENTE DE AUTENTICACION — DESECHABLE, UNO POR OPERACION
// ============================================================================
// `signInWithPassword()` GUARDA la sesion del usuario dentro del cliente que lo
// ejecuta. Si se llama sobre el cliente `supabase` de arriba, ese cliente deja
// de mandar la llave service_role y pasa a mandar el token del usuario (rol
// `authenticated`). Como RLS esta activo y sin politicas, a partir de ese
// momento TODAS las consultas a tablas de ese cliente devuelven 0 filas — y el
// cliente es un singleton del modulo, asi que el proceso entero queda roto
// hasta reiniciarlo. Peor aun: la sesion de un usuario se filtraria a las
// consultas de otro.
//
// Por eso toda verificacion de contraseña usa un cliente NUEVO que se descarta:
// se ensucia el desechable y el compartido nunca se entera.
export const crearClienteAuth = () =>
    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
