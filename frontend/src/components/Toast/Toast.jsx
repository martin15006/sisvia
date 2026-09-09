import { useEffect, useState } from "react";
import "./Toast.css";

const DURACION_SALIDA = 300;

function Toast({ mensaje, tipo = "exito", duracion = 3500, posicion = "abajo-derecha", onCerrar }) {
    const [saliendo, setSaliendo] = useState(false);

    useEffect(() => {
        if (!mensaje) return;
        setSaliendo(false);
        const t = setTimeout(() => setSaliendo(true), duracion);
        return () => clearTimeout(t);
    }, [mensaje, duracion]);

    useEffect(() => {
        if (!saliendo) return;
        const t = setTimeout(onCerrar, DURACION_SALIDA);
        return () => clearTimeout(t);
    }, [saliendo, onCerrar]);

    const cerrarManual = () => setSaliendo(true);

    if (!mensaje) return null;

    return (
        <div
            className={`toast toast-${tipo} toast-pos-${posicion} ${saliendo ? "toast-saliendo" : ""}`}
            role="status"
        >
            <div className="toast-icono">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    {tipo === "exito" && <polyline points="3 8 7 12 13 4" />}
                    {tipo === "error" && (
                        <>
                            <line x1="4" y1="4" x2="12" y2="12" />
                            <line x1="12" y1="4" x2="4" y2="12" />
                        </>
                    )}
                    {tipo === "advertencia" && (
                        <>
                            <line x1="8" y1="3" x2="8" y2="10" />
                            <line x1="8" y1="13" x2="8" y2="13" />
                        </>
                    )}
                    {tipo === "info" && (
                        <>
                            <line x1="8" y1="7" x2="8" y2="12" />
                            <line x1="8" y1="4" x2="8" y2="4" />
                        </>
                    )}
                </svg>
            </div>
            <div className="toast-mensaje">{mensaje}</div>
            <button
                type="button"
                className="toast-cerrar"
                onClick={cerrarManual}
                aria-label="Cerrar"
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                >
                    <path d="M1 1 L11 11 M11 1 L1 11" />
                </svg>
            </button>
            <div className="toast-progreso"></div>
        </div>
    );
}

export default Toast;
