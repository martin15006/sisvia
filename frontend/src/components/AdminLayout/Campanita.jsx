// Campanita de notificaciones en el header del admin (Bloque C paso 3).
// Antes era placeholder. Ahora:
//   - Polling cada 30s del contador no leidas (punto rojo).
//   - Click abre dropdown con las ultimas 10 notificaciones.
//   - Cada notificacion clicable: marca como leida + navega al url_destino.
//   - Boton "Marcar todas como leidas" al pie.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotificaciones from "../../hooks/useNotificaciones.js";
import { iconoDe, colorDe, tiempoRelativo } from "../../lib/notificacionesUtils.js";
import "./Campanita.css";

function Campanita() {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const wrapperRef = useRef(null);
    const {
        contadorNoLeidas,
        lista,
        cargandoLista,
        cargarLista,
        marcarLeida,
        marcarTodasLeidas,
    } = useNotificaciones({ habilitado: true });

    // Cargar la lista al abrir el dropdown
    useEffect(() => {
        if (abierto) cargarLista();
    }, [abierto, cargarLista]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!abierto) return undefined;
        const onClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [abierto]);

    const onClickNotif = async (n) => {
        if (!n.leida) await marcarLeida(n.id);
        setAbierto(false);
        if (n.url_destino) navigate(n.url_destino);
    };

    const tieneNotificaciones = contadorNoLeidas > 0;
    const titulo = tieneNotificaciones
        ? `Tienes ${contadorNoLeidas} notificación${contadorNoLeidas === 1 ? "" : "es"} sin leer`
        : "No tienes notificaciones nuevas";

    return (
        <div className="campanita-wrapper" ref={wrapperRef}>
            <button
                type="button"
                className="campanita"
                onClick={() => setAbierto((v) => !v)}
                title={titulo}
                aria-label={titulo}
                aria-expanded={abierto}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {tieneNotificaciones && (
                    <span className="campanita-punto" aria-hidden="true">
                        {contadorNoLeidas > 9 ? "9+" : contadorNoLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="campanita-dropdown" role="dialog">
                    <div className="campanita-dropdown-header">
                        <strong>Notificaciones</strong>
                        {tieneNotificaciones && (
                            <button
                                type="button"
                                className="campanita-link-leer-todas"
                                onClick={marcarTodasLeidas}
                            >
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <div className="campanita-dropdown-body">
                        {cargandoLista && (
                            <div className="campanita-vacio">Cargando...</div>
                        )}
                        {!cargandoLista && lista.length === 0 && (
                            <div className="campanita-vacio">
                                No tienes notificaciones todavía.
                            </div>
                        )}
                        {!cargandoLista &&
                            lista.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`campanita-item ${n.leida ? "" : "campanita-item-no-leida"}`}
                                    onClick={() => onClickNotif(n)}
                                >
                                    <span className={`campanita-item-icono campanita-icono-${colorDe(n.tipo)}`}>
                                        {iconoDe(n.tipo)}
                                    </span>
                                    <div className="campanita-item-cuerpo">
                                        <div className="campanita-item-titulo">
                                            {n.titulo}
                                        </div>
                                        <div className="campanita-item-mensaje">
                                            {n.mensaje}
                                        </div>
                                        <div className="campanita-item-tiempo">
                                            {tiempoRelativo(n.created_at)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Campanita;
