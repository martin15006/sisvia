import { supabase } from "../config/supabase.js";

const INTERVALO_MS = 4 * 60 * 1000;

let intervaloId = null;
let fallosConsecutivos = 0;

const latido = async () => {
    const inicio = Date.now();
    try {
        const { error } = await supabase
            .from("vehiculos")
            .select("id", { head: true, count: "exact" })
            .limit(1);

        if (error) {
            fallosConsecutivos += 1;
            console.warn(
                `[KEEP-ALIVE] Latido fallido (${fallosConsecutivos}):`,
                error.message
            );
            return;
        }

        if (fallosConsecutivos > 0) {
            console.log(
                `[KEEP-ALIVE] Conexion recuperada despues de ${fallosConsecutivos} fallos (${Date.now() - inicio}ms)`
            );
            fallosConsecutivos = 0;
        }
    } catch (err) {
        fallosConsecutivos += 1;
        console.warn(
            `[KEEP-ALIVE] Excepcion en latido (${fallosConsecutivos}):`,
            err.message
        );
    }
};

// Bloqueante en el arranque: espera el primer latido antes de declarar el servidor listo
// Esto evita que la primera peticion del cliente pegue con la conexion Supabase fria
// (BUG-001: el cliente devuelve arrays vacios sin error cuando la conexion no esta caliente)
export const iniciarKeepAlive = async () => {
    if (intervaloId) return;
    console.log("[KEEP-ALIVE] Calentando conexion Supabase...");
    await latido();
    if (fallosConsecutivos === 0) {
        console.log(`[KEEP-ALIVE] Conexion lista. Activo cada ${INTERVALO_MS / 1000}s`);
    } else {
        console.warn(`[KEEP-ALIVE] Conexion inestable al arrancar. Activo cada ${INTERVALO_MS / 1000}s`);
    }
    intervaloId = setInterval(latido, INTERVALO_MS);
};

export const detenerKeepAlive = () => {
    if (!intervaloId) return;
    clearInterval(intervaloId);
    intervaloId = null;
    console.log("[KEEP-ALIVE] Detenido");
};
