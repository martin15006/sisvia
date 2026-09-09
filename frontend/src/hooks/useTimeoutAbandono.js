// useTimeoutAbandono — detecta inactividad del conductor durante un chequeo en curso
// y notifica al admin que el chequeo fue abandonado (Tarea #104).
//
// Comportamiento:
//   1. Arranca un timer de N minutos al montar.
//   2. Cualquier interaccion (click, touch, keydown, scroll, mousemove) resetea el timer.
//   3. Si el timer llega a 0 → llama al endpoint /api/chequeos/:id/abandonar con motivo='inactividad'
//      → muestra modal "Tu chequeo fue cancelado por inactividad" → redirige al /conductor.
//   4. Si el usuario cierra la pestaña/navegador (beforeunload) → llama al endpoint con
//      motivo='cerro_pestana' usando navigator.sendBeacon (sobrevive al cierre).
//
// Uso:
//   import useTimeoutAbandono from "../../hooks/useTimeoutAbandono.js";
//   useTimeoutAbandono(chequeoId);
//
// Si chequeoId es null/undefined, el hook no hace nada (el flujo no ha empezado todavia).

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../lib/api.js";

const MINUTOS_DEFECTO = 2;

function useTimeoutAbandono(chequeoId, minutos = MINUTOS_DEFECTO) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const yaAbandonadoRef = useRef(false);

    useEffect(() => {
        // Sin chequeo activo no hay nada que vigilar
        if (!chequeoId) return undefined;

        const milisegundos = minutos * 60 * 1000;
        const apiUrl = `${API_URL}/chequeos/${chequeoId}/abandonar`;

        // Llama al backend para marcar abandono. Se usa una version con fetch
        // normal y otra con sendBeacon (para cuando la pestaña ya se va a cerrar).
        const marcarAbandono = async (motivo) => {
            if (yaAbandonadoRef.current) return;
            yaAbandonadoRef.current = true;
            const token = localStorage.getItem("token");
            try {
                await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                    body: JSON.stringify({ motivo }),
                });
            } catch {
                // Falla silenciosa: el backend tambien tiene barreras propias
            }
        };

        // Para el cierre de pestaña usamos sendBeacon con un Blob que incluye Authorization
        // como query param (sendBeacon no soporta headers custom).
        const marcarAbandonoBeacon = (motivo) => {
            if (yaAbandonadoRef.current) return;
            yaAbandonadoRef.current = true;
            const token = localStorage.getItem("token");
            // sendBeacon no permite headers, asi que mandamos el token en el body como
            // fallback. El endpoint sigue requiriendo Authorization, asi que esto
            // solo funciona si el backend acepta token tambien por body.
            // Por seguridad, mantenemos el comportamiento: si sendBeacon no autentica,
            // simplemente el evento no se registra (mejor que romper la salida del user).
            try {
                const data = new Blob(
                    [JSON.stringify({ motivo, token })],
                    { type: "application/json" }
                );
                navigator.sendBeacon(apiUrl, data);
            } catch {
                // Ignorar — el usuario ya se va
            }
        };

        const enInactividad = async () => {
            await marcarAbandono("inactividad");
            // Mostrar mensaje y redirigir
            alert(
                "Tu chequeo fue cancelado por inactividad de " +
                    minutos +
                    " minutos. El administrador ha sido notificado. " +
                    "Si necesitas continuar, debes iniciar un chequeo nuevo."
            );
            navigate("/conductor");
        };

        const resetearTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(enInactividad, milisegundos);
        };

        const onBeforeUnload = () => {
            marcarAbandonoBeacon("cerro_pestana");
        };

        // Eventos que cuentan como "actividad"
        const eventos = ["click", "touchstart", "keydown", "scroll", "mousemove"];
        eventos.forEach((ev) => window.addEventListener(ev, resetearTimer, { passive: true }));
        window.addEventListener("beforeunload", onBeforeUnload);

        // Arrancar el primer timer
        resetearTimer();

        // Cleanup al desmontar (el conductor terminó el flujo correctamente)
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            eventos.forEach((ev) => window.removeEventListener(ev, resetearTimer));
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [chequeoId, minutos, navigate]);
}

export default useTimeoutAbandono;
