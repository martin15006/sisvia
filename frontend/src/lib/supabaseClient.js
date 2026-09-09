// Cliente de Supabase para el FRONTEND.
// Se usa UNICAMENTE para Realtime (suscripcion a notificaciones en vivo).
// Todo lo demas (CRUD, auth) sigue pasando por nuestro backend via api.js.
//
// Usa la ANON KEY (publica, segura para el navegador), nunca la service_role.
// Las variables vienen de frontend/.env con prefijo VITE_ (requisito de Vite).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables, exportamos null y el codigo que lo use debe
// degradar elegantemente al polling (no rompe la app).
// El Realtime es un EXTRA: si algo de esto falla, la app tiene que seguir
// funcionando con el polling de respaldo. Por eso nada de lo de aqui puede
// lanzar una excepcion — una excepcion en este modulo deja la pantalla EN
// BLANCO, porque se importa durante el arranque de React.
const crearCliente = () => {
    if (!url || !anonKey) {
        console.warn(
            "[realtime] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
            "Las notificaciones funcionaran solo con polling."
        );
        return null;
    }
    // Un valor mal pegado en el .env (por ejemplo con el nombre de la variable
    // repetido: VITE_SUPABASE_URL=VITE_SUPABASE_URL=https://...) hacia que
    // createClient lanzara "Invalid supabaseUrl" y tumbara TODA la app.
    if (!/^https?:\/\//.test(url)) {
        console.warn(
            `[realtime] VITE_SUPABASE_URL no parece una URL: "${url}". ` +
            "Revisa que no tenga el nombre de la variable repetido. " +
            "Sigo con polling."
        );
        return null;
    }
    try {
        return createClient(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            realtime: { params: { eventsPerSecond: 5 } },
        });
    } catch (e) {
        console.warn("[realtime] No se pudo iniciar:", e.message, "— sigo con polling.");
        return null;
    }
};

export const supabaseRealtime = crearCliente();
