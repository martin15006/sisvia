import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    obtenerChequeoEnCurso,
    limpiarChequeoEnCurso,
} from "../../lib/chequeoEnCurso.js";
import "./ChequeoResultado.css";

// Configuracion visual segun el estado resultante del chequeo
const CONFIG_ESTADO = {
    operativo: {
        titulo: "Vehículo OPERATIVO",
        subtitulo: "Puedes salir con el vehículo sin restricciones.",
        clase: "estado-operativo",
        icono: "✓",
        permitirOperar: true,
    },
    observacion: {
        titulo: "Vehículo en OBSERVACIÓN",
        subtitulo: "Puedes operar, pero hay detalles menores que reportar al administrador.",
        clase: "estado-observacion",
        icono: "i",
        permitirOperar: true,
    },
    alerta: {
        titulo: "Vehículo en ALERTA",
        subtitulo: "El vehículo tiene varias fallas. Reporta de inmediato al administrador antes de operar.",
        clase: "estado-alerta",
        icono: "!",
        permitirOperar: true,
    },
    critico: {
        titulo: "Vehículo en estado CRÍTICO",
        subtitulo: "El vehículo tiene fallas graves. Se recomienda no operar hasta revisión.",
        clase: "estado-critico",
        icono: "!",
        permitirOperar: false,
    },
    no_operativo: {
        titulo: "Vehículo NO OPERATIVO",
        subtitulo: "NO PUEDES operar este vehículo. Hay falla(s) crítica(s) o demasiadas fallas. Se notificó al administrador.",
        clase: "estado-no-operativo",
        icono: "X",
        permitirOperar: false,
    },
};

function ChequeoResultado() {
    const navigate = useNavigate();
    const [datos, setDatos] = useState(null);

    useEffect(() => {
        const enCurso = obtenerChequeoEnCurso();
        if (!enCurso || !enCurso.resultado) {
            navigate("/conductor");
            return;
        }
        setDatos(enCurso);
    }, [navigate]);

    const volverAlInicio = () => {
        limpiarChequeoEnCurso();
        navigate("/conductor");
    };

    if (!datos) {
        return (
            <div className="resultado-pagina">
                <div className="resultado-estado">Cargando...</div>
            </div>
        );
    }

    const resp = datos.resultado || {};
    const chequeo = resp.chequeo || {};
    const vehiculo = resp.vehiculo || datos.vehiculo || {};
    const actualizacion = resp.actualizacion_vehiculo;
    const sugerencia = resp.sugerencia_admin;

    const estadoFinal = chequeo.resultado_estado || vehiculo.estado_actual || "operativo";
    const config = CONFIG_ESTADO[estadoFinal] || CONFIG_ESTADO.operativo;

    // Los counts vienen del row del chequeo en BD (items_*_count) y el conteo
    // de criticos no cumple viene a nivel root de la respuesta del cierre.
    const totalCumple = chequeo.items_cumple_count ?? 0;
    const totalNoCumple = chequeo.items_no_cumple_count ?? 0;
    const totalNoAplica = chequeo.items_no_aplica_count ?? 0;
    const totalCriticos = resp.items_criticos_no_cumple ?? 0;

    return (
        <div className={`resultado-pagina ${config.clase}`}>
            <header className="resultado-mini-header">
                <img src="/logo.png" alt="SISVIA" className="resultado-mini-logo" />
            </header>
            <main className="resultado-main">
                {/* Tarjeta principal con resultado */}
                <div className="resultado-tarjeta">
                    <div className="resultado-icono">{config.icono}</div>
                    <h1 className="resultado-titulo">{config.titulo}</h1>
                    <p className="resultado-subtitulo">{config.subtitulo}</p>

                    {!config.permitirOperar && (
                        <div className="resultado-aviso-bloqueo">
                            NO OPERAR EL VEHÍCULO
                        </div>
                    )}
                </div>

                {/* Resumen del chequeo */}
                <div className="resultado-resumen">
                    <div className="resultado-resumen-titulo">Resumen del chequeo</div>

                    <div className="resultado-resumen-grid">
                        <div className="resultado-resumen-item">
                            <div className="resultado-resumen-numero resultado-numero-cumple">
                                {totalCumple}
                            </div>
                            <div className="resultado-resumen-label">Cumple</div>
                        </div>
                        <div className="resultado-resumen-item">
                            <div className="resultado-resumen-numero resultado-numero-no-cumple">
                                {totalNoCumple}
                            </div>
                            <div className="resultado-resumen-label">No cumple</div>
                        </div>
                        <div className="resultado-resumen-item">
                            <div className="resultado-resumen-numero resultado-numero-na">
                                {totalNoAplica}
                            </div>
                            <div className="resultado-resumen-label">N/A</div>
                        </div>
                    </div>

                    {totalCriticos > 0 && (
                        <div className="resultado-resumen-criticos">
                            <span className="resultado-resumen-criticos-badge">
                                {totalCriticos}
                            </span>
                            <span>
                                ítem{totalCriticos === 1 ? "" : "s"} crítico{totalCriticos === 1 ? "" : "s"} marcado{totalCriticos === 1 ? "" : "s"} como NO CUMPLE
                            </span>
                        </div>
                    )}
                </div>

                {/* Datos del vehiculo */}
                <div className="resultado-vehiculo">
                    <div className="resultado-vehiculo-placa">
                        {vehiculo.placa || "—"}
                    </div>
                    <div className="resultado-vehiculo-info">
                        Chequeo {chequeo.tipo === "postoperacional" ? "post-operacional" : "preoperacional"}
                    </div>
                </div>

                {/* Aviso de actualizacion del vehiculo */}
                {actualizacion && actualizacion.actualizado && (
                    <div className="resultado-aviso resultado-aviso-warning">
                        <strong>Estado del vehículo actualizado:</strong>{" "}
                        {actualizacion.estado_anterior?.toUpperCase()} → {actualizacion.estado_nuevo?.toUpperCase()}
                    </div>
                )}

                {/* Sugerencia al admin (mejora del estado) */}
                {sugerencia && (
                    <div className="resultado-aviso resultado-aviso-info">
                        Tu chequeo sugiere que el vehículo está mejor que su estado actual.
                        Se envió una sugerencia al administrador para revisar.
                    </div>
                )}

                <button className="resultado-boton-volver" onClick={volverAlInicio}>
                    Volver al inicio
                </button>
            </main>
        </div>
    );
}

export default ChequeoResultado;
