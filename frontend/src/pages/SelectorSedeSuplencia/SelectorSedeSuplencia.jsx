// Pool · Suplencia Fase B: cuando el pool cubre VARIAS sedes (toda una regional),
// elige acá a cuál entrar a gestionar (uno a la vez). Al elegir, guardamos la sede
// activo, recargamos la sesión (/auth/me ya manda el header) y entramos al panel.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { setSedeActiva } from "../../lib/sedeActiva.js";
import "./SelectorSedeSuplencia.css";

function SelectorSedeSuplencia() {
    const { usuario, actualizarUsuario } = useAuth();
    const navigate = useNavigate();
    const [cargandoId, setCargandoId] = useState(null);

    if (!usuario) return null;

    const sedes = usuario.suplencia_sedes || [];
    const deptoNombre = usuario.suplencia?.departamento?.nombre;

    const elegir = async (sede) => {
        setCargandoId(sede.id);
        setSedeActiva(sede.id);
        try {
            const data = await api("/auth/me"); // ya manda X-Sede-Activo
            actualizarUsuario(data.usuario);
            navigate("/dashboard");
        } catch {
            setCargandoId(null);
        }
    };

    return (
        <div className="selsede-pagina">
            <div className="selsede-card animar-fade-in-up">
                <img src="/logo.png" alt="SISVIA" className="selsede-logo" />
                <h1 className="selsede-titulo">Elegí la sede a gestionar</h1>
                <p className="selsede-sub">
                    Estás supliendo{deptoNombre ? ` la Regional ${deptoNombre}` : ""}. Entrá a un
                    sede para gestionarlo; podés volver acá cuando quieras para cambiar.
                </p>

                <div className="selsede-lista">
                    {sedes.map((c) => {
                        const activo = usuario.sede_activa === c.id;
                        return (
                            <button
                                key={c.id}
                                className={`selsede-item ${activo ? "selsede-item-activo" : ""}`}
                                onClick={() => elegir(c)}
                                disabled={cargandoId !== null}
                            >
                                <span className="selsede-item-icono">🏢</span>
                                <span className="selsede-item-nombre">{c.nombre}</span>
                                {cargandoId === c.id
                                    ? <span className="selsede-item-badge">Entrando…</span>
                                    : activo
                                        ? <span className="selsede-item-badge">Actual</span>
                                        : <span className="selsede-item-flecha">→</span>}
                            </button>
                        );
                    })}
                    {sedes.length === 0 && (
                        <p className="selsede-vacio">No hay sedes para gestionar en esta suplencia.</p>
                    )}
                </div>

                <button className="selsede-volver" onClick={() => navigate("/conductor")}>
                    ← Volver a mi panel de conductor
                </button>
            </div>
        </div>
    );
}

export default SelectorSedeSuplencia;
