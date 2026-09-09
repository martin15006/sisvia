// useNotificaciones — hook global del Bloque C.
//
// Mantiene el contador de no leidas y la lista de notificaciones del admin.
//
// Doble estrategia para que el punto rojo aparezca lo antes posible en TODAS
// las paginas del admin:
//   1. REALTIME (Supabase): se suscribe a los INSERT de la tabla notificaciones
//      filtrados por el admin actual. Cuando entra una nueva, aparece al instante.
//   2. POLLING de respaldo cada 60s: por si el WebSocket de Realtime se cae o
//      no esta disponible, igual se sincroniza el contador.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "./useAuth.js";
import { supabaseRealtime } from "../lib/supabaseClient.js";

// Con Realtime activo, el polling solo es red de seguridad -> intervalo mas largo.
const INTERVALO_POLLING_MS = 60 * 1000; // 60 segundos

function useNotificaciones({ habilitado = true } = {}) {
    const { usuario } = useAuth();
    const [contadorNoLeidas, setContadorNoLeidas] = useState(0);
    const [lista, setLista] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(false);
    const timerRef = useRef(null);

    const refrescarContador = useCallback(async () => {
        if (!habilitado) return;
        try {
            const data = await api("/notificaciones/no-leidas/count");
            setContadorNoLeidas(data.count || 0);
        } catch {
            // Falla silenciosa — el polling intentara de nuevo
        }
    }, [habilitado]);

    const cargarLista = useCallback(async () => {
        if (!habilitado) return;
        setCargandoLista(true);
        try {
            const data = await api("/notificaciones?limite=10");
            setLista(data.notificaciones || []);
        } catch {
            setLista([]);
        } finally {
            setCargandoLista(false);
        }
    }, [habilitado]);

    const marcarLeida = useCallback(async (id) => {
        try {
            await api(`/notificaciones/${id}/leer`, { method: "PATCH" });
            setLista((prev) =>
                prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
            );
            setContadorNoLeidas((prev) => Math.max(0, prev - 1));
        } catch {
            refrescarContador();
            cargarLista();
        }
    }, [refrescarContador, cargarLista]);

    const marcarTodasLeidas = useCallback(async () => {
        try {
            await api("/notificaciones/leer-todas", { method: "PATCH" });
            setLista((prev) => prev.map((n) => ({ ...n, leida: true })));
            setContadorNoLeidas(0);
        } catch {
            refrescarContador();
        }
    }, [refrescarContador]);

    // ===== Polling de respaldo =====
    useEffect(() => {
        if (!habilitado) {
            if (timerRef.current) clearInterval(timerRef.current);
            return undefined;
        }
        refrescarContador();
        timerRef.current = setInterval(refrescarContador, INTERVALO_POLLING_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [habilitado, refrescarContador]);

    // ===== Realtime (instantaneo) =====
    useEffect(() => {
        if (!habilitado || !usuario?.id || !supabaseRealtime) return undefined;

        // Canal unico por usuario. Escucha solo los INSERT dirigidos a este admin.
        const canal = supabaseRealtime
            .channel(`notif_${usuario.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notificaciones",
                    filter: `destinatario_id=eq.${usuario.id}`,
                },
                (payload) => {
                    const nueva = payload.new;
                    if (!nueva) return;
                    // Subir el contador y poner la nueva al inicio de la lista
                    setContadorNoLeidas((prev) => prev + 1);
                    setLista((prev) => {
                        // Evitar duplicados si el polling ya la trajo
                        if (prev.some((n) => n.id === nueva.id)) return prev;
                        return [nueva, ...prev].slice(0, 10);
                    });
                }
            )
            .subscribe();

        return () => {
            supabaseRealtime.removeChannel(canal);
        };
    }, [habilitado, usuario?.id]);

    return {
        contadorNoLeidas,
        lista,
        cargandoLista,
        cargarLista,
        marcarLeida,
        marcarTodasLeidas,
        refrescarContador,
    };
}

export default useNotificaciones;
