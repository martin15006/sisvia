import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import { api } from "../../lib/api.js";
import "./ActividadPool.css";

const ETIQUETA_TIPO = { usuario: "Usuario", vehiculo: "Vehículo", chequeo: "Chequeo" };

function ActividadPool() {
    const { poolId } = useParams();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setCargando(true);
        api(`/suplencias/actividad/${poolId}`)
            .then((data) => setItems(data.actividad || []))
            .catch((err) => { if (!err.sesionExpirada) setError(err.message); })
            .finally(() => setCargando(false));
    }, [poolId]);

    return (
        <AdminLayout titulo="Actividad del pool">
            <div className="actividad-pool">
                <button className="actividad-pool-volver" onClick={() => navigate(-1)}>← Volver</button>
                <p className="actividad-pool-sub">
                    Acciones que hizo este conductor del pool (incluye lo que hizo mientras suplía al Coordinador).
                </p>

                {cargando && <div className="actividad-pool-estado">Cargando…</div>}
                {error && <div className="actividad-pool-error">⚠️ {error}</div>}
                {!cargando && !error && items.length === 0 && (
                    <div className="actividad-pool-vacio">Este conductor todavía no registra acciones.</div>
                )}

                <ul className="actividad-pool-lista">
                    {items.map((it) => (
                        <li key={`${it.tipo}-${it.id}`} className="actividad-pool-item">
                            <span className={`actividad-pool-chip actividad-pool-chip-${it.tipo}`}>
                                {ETIQUETA_TIPO[it.tipo] || it.tipo}
                            </span>
                            <span className="actividad-pool-accion">{it.accion}</span>
                            <span className="actividad-pool-fecha">
                                {new Date(it.created_at).toLocaleString("es-CO")}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </AdminLayout>
    );
}

export default ActividadPool;
