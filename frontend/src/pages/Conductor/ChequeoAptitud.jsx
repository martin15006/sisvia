// Pantalla de Aptitud del conductor (5 preguntas, una por pantalla).
// Las preguntas se administran desde Panel Admin -> Catalogo del chequeo.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import {
    guardarChequeoEnCurso,
    limpiarChequeoEnCurso,
} from "../../lib/chequeoEnCurso.js";
import "./ChequeoAptitud.css";

function ChequeoAptitud() {
    const [searchParams] = useSearchParams();
    const tipo = searchParams.get("tipo") || "preoperacional";
    const navigate = useNavigate();

    const [preguntas, setPreguntas] = useState([]);
    const [indiceActual, setIndiceActual] = useState(0);
    const [respuestas, setRespuestas] = useState([]);
    const [respuestaPendiente, setRespuestaPendiente] = useState(null);

    const [bloqueada, setBloqueada] = useState(false);
    const [preguntasFallidas, setPreguntasFallidas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    // Cargar las 5 preguntas del catalogo al inicio
    useEffect(() => {
        api("/chequeos/catalogo")
            .then((data) => {
                const ordenadas = (data.preguntas_aptitud || []).sort(
                    (a, b) => a.orden - b.orden
                );
                setPreguntas(ordenadas);
            })
            .catch((err) => {
                if (!err.sesionExpirada) setError(err.message);
            })
            .finally(() => setCargando(false));
    }, []);

    const preguntaActual = preguntas[indiceActual];
    const totalPreguntas = preguntas.length;

    const seleccionarRespuesta = (respuesta) => {
        setRespuestaPendiente(respuesta);
    };

    const cancelarConfirmacion = () => {
        setRespuestaPendiente(null);
    };

    const confirmarRespuesta = async () => {
        const nuevasRespuestas = [
            ...respuestas,
            { pregunta_id: preguntaActual.id, respuesta: respuestaPendiente },
        ];
        setRespuestas(nuevasRespuestas);
        setRespuestaPendiente(null);

        // Si quedan más preguntas, avanzar
        if (indiceActual + 1 < totalPreguntas) {
            setIndiceActual(indiceActual + 1);
            return;
        }

        // Última pregunta respondida → evaluar si es apto
        const noAptas = nuevasRespuestas.filter((r) => {
            const p = preguntas.find((p) => p.id === r.pregunta_id);
            return p && r.respuesta !== p.respuesta_apta;
        });

        if (noAptas.length === 0) {
            // Apto: guardar en sessionStorage y pasar a seleccionar vehiculo
            guardarChequeoEnCurso({
                tipo,
                paso: "vehiculo",
                respuestas_aptitud: nuevasRespuestas,
            });
            navigate("/conductor/chequeo/vehiculo");
            return;
        }

        // No apto: registrar el intento en backend + mostrar pantalla de bloqueo
        setEnviando(true);
        try {
            const resp = await api("/chequeos/aptitud-no-apta", {
                method: "POST",
                body: { respuestas_aptitud: nuevasRespuestas },
            });
            setPreguntasFallidas(resp.preguntas_fallidas || []);
        } catch (err) {
            if (!err.sesionExpirada) {
                // Aún así mostramos la pantalla de bloqueo, pero con detalle
                // de las preguntas calculado en frontend
                const enriquecidas = noAptas.map((r) => {
                    const p = preguntas.find((p) => p.id === r.pregunta_id);
                    return {
                        pregunta_id: r.pregunta_id,
                        pregunta: p?.pregunta,
                        respuesta_dada: r.respuesta,
                        respuesta_esperada: p?.respuesta_apta,
                    };
                });
                setPreguntasFallidas(enriquecidas);
            }
        } finally {
            setEnviando(false);
            setBloqueada(true);
            limpiarChequeoEnCurso();
        }
    };

    const volverAlInicio = () => {
        limpiarChequeoEnCurso();
        navigate("/conductor");
    };

    // === Renders ===

    if (cargando) {
        return (
            <div className="aptitud-pagina">
                <div className="aptitud-estado">Cargando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="aptitud-pagina">
                <div className="aptitud-estado aptitud-estado-error">{error}</div>
                <button className="aptitud-boton-volver" onClick={volverAlInicio}>
                    Volver al inicio
                </button>
            </div>
        );
    }

    if (bloqueada) {
        return (
            <div className="aptitud-pagina aptitud-bloqueada">
                <div className="aptitud-bloqueada-tarjeta">
                    <div className="aptitud-bloqueada-icono">!</div>
                    <h1 className="aptitud-bloqueada-titulo">No estás en condiciones aptas</h1>
                    <p className="aptitud-bloqueada-texto">
                        No puedes hacer el chequeo del vehículo en este momento.
                        Se notificó al administrador.
                    </p>

                    {preguntasFallidas.length > 0 && (
                        <div className="aptitud-bloqueada-detalle">
                            <div className="aptitud-bloqueada-detalle-titulo">
                                {preguntasFallidas.length === 1
                                    ? "Pregunta que no fue apta:"
                                    : `Preguntas que no fueron aptas (${preguntasFallidas.length}):`}
                            </div>
                            <ul className="aptitud-bloqueada-lista">
                                {preguntasFallidas.map((f, i) => (
                                    <li key={i}>{f.pregunta}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        className="aptitud-boton-volver"
                        onClick={volverAlInicio}
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    if (!preguntaActual) {
        return (
            <div className="aptitud-pagina">
                <div className="aptitud-estado aptitud-estado-error">
                    No hay preguntas disponibles
                </div>
            </div>
        );
    }

    return (
        <div className="aptitud-pagina">
            {/* Header con progreso */}
            <header className="aptitud-header">
                <button
                    className="aptitud-volver-chip"
                    onClick={volverAlInicio}
                >
                    ← Cancelar
                </button>
                <img src="/logo.png" alt="SISVIA" className="aptitud-mini-logo" />
                <div className="aptitud-progreso-wrap">
                    <div className="aptitud-progreso-texto">
                        {indiceActual + 1} de {totalPreguntas}
                    </div>
                    <div className="aptitud-progreso-barra">
                        <div
                            className="aptitud-progreso-relleno"
                            style={{ width: `${((indiceActual + 1) / totalPreguntas) * 100}%` }}
                        />
                    </div>
                </div>
            </header>

            <main className="aptitud-main">
                <div className="aptitud-etiqueta">
                    {tipo === "postoperacional" ? "Aptitud · Post-operacional" : "Aptitud · Preoperacional"}
                </div>

                <h1 className="aptitud-pregunta">{preguntaActual.pregunta}</h1>

                <div className="aptitud-botones">
                    <button
                        className="aptitud-boton aptitud-boton-si"
                        onClick={() => seleccionarRespuesta("si")}
                        disabled={enviando}
                    >
                        SÍ
                    </button>
                    <button
                        className="aptitud-boton aptitud-boton-no"
                        onClick={() => seleccionarRespuesta("no")}
                        disabled={enviando}
                    >
                        NO
                    </button>
                </div>
            </main>

            {/* Modal de confirmación */}
            {respuestaPendiente && (
                <div className="aptitud-modal-overlay">
                    <div className="aptitud-modal">
                        <div className="aptitud-modal-icono">
                            {respuestaPendiente === "si" ? "✓" : "✕"}
                        </div>
                        <div className="aptitud-modal-pregunta">
                            {preguntaActual.pregunta}
                        </div>
                        <div className="aptitud-modal-confirma">
                            ¿Tu respuesta es <strong>{respuestaPendiente === "si" ? "SÍ" : "NO"}</strong>?
                        </div>
                        <div className="aptitud-modal-botones">
                            <button
                                className="aptitud-modal-boton aptitud-modal-boton-cancelar"
                                onClick={cancelarConfirmacion}
                                disabled={enviando}
                            >
                                Volver atrás
                            </button>
                            <button
                                className="aptitud-modal-boton aptitud-modal-boton-confirmar"
                                onClick={confirmarRespuesta}
                                disabled={enviando}
                            >
                                {enviando ? "Enviando..." : "Sí, confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChequeoAptitud;
