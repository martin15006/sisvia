// Pagina "Todas las notificaciones" (Bloque C — complemento del dropdown).
// Lista paginada con filtro Todas / No leidas + marcar leidas.
// Reusa el endpoint GET /api/notificaciones?pagina=&limite=&solo_no_leidas=

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import { iconoDe, colorDe, tiempoRelativo } from "../../lib/notificacionesUtils.js";
import "./Notificaciones.css";

const LIMITE = 20;

function Notificaciones() {
    const navigate = useNavigate();

    const [lista, setLista] = useState([]);
    const [total, setTotal] = useState(0);
    const [pagina, setPagina] = useState(1);
    const [soloNoLeidas, setSoloNoLeidas] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [toast, setToast] = useState(null);

    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            params.append("pagina", String(pagina));
            params.append("limite", String(LIMITE));
            if (soloNoLeidas) params.append("solo_no_leidas", "true");

            const data = await api(`/notificaciones?${params.toString()}`);
            setLista(data.notificaciones || []);
            setTotal(data.total || 0);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setCargando(false);
        }
    }, [pagina, soloNoLeidas]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const onClickNotif = async (n) => {
        if (!n.leida) {
            try {
                await api(`/notificaciones/${n.id}/leer`, { method: "PATCH" });
            } catch {
                // si falla igual navegamos
            }
        }
        if (n.url_destino) navigate(n.url_destino);
    };

    const marcarTodas = async () => {
        try {
            await api("/notificaciones/leer-todas", { method: "PATCH" });
            setToast({ mensaje: "Todas marcadas como leídas", tipo: "exito" });
            cargar();
        } catch (err) {
            if (!err.sesionExpirada) setToast({ mensaje: err.message, tipo: "error" });
        }
    };

    const cambiarFiltro = (valor) => {
        setSoloNoLeidas(valor);
        setPagina(1);
    };

    return (
        <AdminLayout titulo="Notificaciones">
            <div className="notif-pagina">
                {/* Barra de filtros + accion */}
                <div className="notif-barra">
                    <div className="notif-filtros">
                        <button
                            className={`notif-filtro ${!soloNoLeidas ? "notif-filtro-activo" : ""}`}
                            onClick={() => cambiarFiltro(false)}
                        >
                            Todas
                        </button>
                        <button
                            className={`notif-filtro ${soloNoLeidas ? "notif-filtro-activo" : ""}`}
                            onClick={() => cambiarFiltro(true)}
                        >
                            Solo no leídas
                        </button>
                    </div>
                    <button className="notif-marcar-todas" onClick={marcarTodas}>
                        Marcar todas como leídas
                    </button>
                </div>

                {cargando && (
                    <div className="notif-estado">Cargando notificaciones...</div>
                )}

                {!cargando && lista.length === 0 && (
                    <div className="notif-vacio">
                        {soloNoLeidas
                            ? "No tienes notificaciones sin leer."
                            : "No tienes notificaciones todavía."}
                    </div>
                )}

                {!cargando && lista.length > 0 && (
                    <ul className="notif-lista">
                        {lista.map((n) => (
                            <li key={n.id}>
                                <button
                                    className={`notif-item ${n.leida ? "" : "notif-item-no-leida"}`}
                                    onClick={() => onClickNotif(n)}
                                >
                                    <span className={`notif-item-icono notif-icono-${colorDe(n.tipo)}`}>
                                        {iconoDe(n.tipo)}
                                    </span>
                                    <div className="notif-item-cuerpo">
                                        <div className="notif-item-titulo">{n.titulo}</div>
                                        <div className="notif-item-mensaje">{n.mensaje}</div>
                                        <div className="notif-item-tiempo">
                                            {tiempoRelativo(n.created_at)}
                                            {n.leida ? " · leída" : ""}
                                        </div>
                                    </div>
                                    {!n.leida && <span className="notif-item-punto" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Paginacion */}
                {!cargando && total > LIMITE && (
                    <div className="notif-paginacion">
                        <button
                            className="notif-pag-boton"
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina <= 1}
                        >
                            ← Anterior
                        </button>
                        <span className="notif-pag-info">
                            Página {pagina} de {totalPaginas}
                        </span>
                        <button
                            className="notif-pag-boton"
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                            disabled={pagina >= totalPaginas}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3000}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default Notificaciones;
