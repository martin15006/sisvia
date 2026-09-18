import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import {
    obtenerChequeoEnCurso,
    actualizarChequeoEnCurso,
    limpiarChequeoEnCurso,
} from "../../lib/chequeoEnCurso.js";
import "./SeleccionVehiculo.css";

// Etiqueta legible del estado ("no_operativo" -> "No operativo").
const ETIQUETA_ESTADO = {
    operativo: "Operativo",
    observacion: "Observación",
    alerta: "Alerta",
    critico: "Crítico",
    no_operativo: "No operativo",
};
const etiquetaEstado = (estado) => ETIQUETA_ESTADO[estado] || "Sin estado";

function SeleccionVehiculo() {
    const navigate = useNavigate();

    // Estado del chequeo en curso
    const [chequeoEnCurso, setChequeoEnCurso] = useState(null);

    // Lista de vehiculos
    const [vehiculos, setVehiculos] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(true);
    const [errorLista, setErrorLista] = useState(null);

    // Filtro de busqueda
    const [busqueda, setBusqueda] = useState("");

    // Vehiculo seleccionado y kilometraje
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [kilometraje, setKilometraje] = useState("");
    const [errorForm, setErrorForm] = useState(null);
    const [iniciando, setIniciando] = useState(false);

    // Cargar el chequeo en curso al montar
    useEffect(() => {
        const enCurso = obtenerChequeoEnCurso();
        if (!enCurso || !enCurso.respuestas_aptitud) {
            // No hay aptitud guardada → no debe estar aqui
            navigate("/conductor");
            return;
        }
        setChequeoEnCurso(enCurso);
    }, [navigate]);

    // Cargar lista de vehiculos disponibles (con debounce sobre busqueda)
    useEffect(() => {
        if (!chequeoEnCurso) return;

        setCargandoLista(true);
        setErrorLista(null);

        const timer = setTimeout(() => {
            const qs = busqueda.trim()
                ? `?busqueda=${encodeURIComponent(busqueda.trim())}`
                : "";
            api(`/chequeos/vehiculos-disponibles${qs}`)
                .then((data) => {
                    setVehiculos(data.vehiculos || []);
                })
                .catch((err) => {
                    if (!err.sesionExpirada) setErrorLista(err.message);
                })
                .finally(() => setCargandoLista(false));
        }, 250);

        return () => clearTimeout(timer);
    }, [busqueda, chequeoEnCurso]);

    const seleccionarVehiculo = (v) => {
        setVehiculoSeleccionado(v);
        setKilometraje(v.kilometraje_actual ? String(v.kilometraje_actual) : "");
        setErrorForm(null);
    };

    const cerrarSeleccion = () => {
        setVehiculoSeleccionado(null);
        setKilometraje("");
        setErrorForm(null);
    };

    const cancelarTodo = () => {
        limpiarChequeoEnCurso();
        navigate("/conductor");
    };

    const iniciarChequeo = async () => {
        setErrorForm(null);

        const km = parseInt(kilometraje, 10);
        if (isNaN(km) || km < 0) {
            setErrorForm("El kilometraje debe ser un número válido (ej: 45000).");
            return;
        }

        // Si el km es menor al actual, advertimos
        const kmActual = vehiculoSeleccionado.kilometraje_actual || 0;
        if (km < kmActual) {
            setErrorForm(
                `El kilometraje no puede ser menor al registrado (${kmActual.toLocaleString()} km).`
            );
            return;
        }

        setIniciando(true);
        try {
            const resp = await api("/chequeos/iniciar", {
                method: "POST",
                body: {
                    vehiculo_id: vehiculoSeleccionado.id,
                    tipo: chequeoEnCurso.tipo,
                    kilometraje: km,
                    respuestas_aptitud: chequeoEnCurso.respuestas_aptitud,
                },
            });

            // Guardar chequeo_id y datos del vehiculo en sessionStorage
            actualizarChequeoEnCurso({
                paso: "items",
                chequeo_id: resp.chequeo.id,
                vehiculo: resp.vehiculo,
                kilometraje: km,
            });

            navigate("/conductor/chequeo/items");
        } catch (err) {
            if (!err.sesionExpirada) {
                setErrorForm(err.message);
            }
        } finally {
            setIniciando(false);
        }
    };

    if (!chequeoEnCurso) {
        return (
            <div className="selveh-pagina">
                <div className="selveh-estado">Cargando...</div>
            </div>
        );
    }

    const etiquetaTipo =
        chequeoEnCurso.tipo === "postoperacional"
            ? "Post-operacional"
            : "Preoperacional";

    return (
        <div className="selveh-pagina">
            {/* Header */}
            <header className="selveh-header">
                <button className="selveh-volver-chip" onClick={cancelarTodo}>
                    ← Cancelar
                </button>
                <img src="/logo.png" alt="SISVIA" className="selveh-mini-logo" />
                <div className="selveh-header-titulo">
                    <div className="selveh-header-paso">Paso 2 de 4</div>
                    <div className="selveh-header-tipo">Selección de vehículo · {etiquetaTipo}</div>
                </div>
            </header>

            <main className="selveh-main">
                {/* Buscador */}
                <div className="selveh-buscador-wrap">
                    <label className="selveh-buscador-label">
                        Buscar por placa
                    </label>
                    <input
                        type="text"
                        className="selveh-buscador"
                        placeholder="Ej: OCJ123"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
                        autoFocus
                    />
                </div>

                {/* Lista */}
                <div className="selveh-lista-wrap">
                    <div className="selveh-lista-titulo">
                        {cargandoLista
                            ? "Buscando..."
                            : `${vehiculos.length} vehículo${vehiculos.length === 1 ? "" : "s"} disponible${vehiculos.length === 1 ? "" : "s"}`}
                    </div>

                    {errorLista && (
                        <div className="selveh-error-lista">{errorLista}</div>
                    )}

                    {!cargandoLista && !errorLista && vehiculos.length === 0 && (
                        <div className="selveh-vacio">
                            No hay vehículos disponibles en tu sede
                            {busqueda.trim() && ` con la búsqueda "${busqueda.trim()}"`}.
                        </div>
                    )}

                    <div className="selveh-lista">
                        {vehiculos.map((v) => (
                            <button
                                key={v.id}
                                className={`selveh-card selveh-card-${v.estado}`}
                                onClick={() => seleccionarVehiculo(v)}
                            >
                                <div className="selveh-card-placa">{v.placa}</div>
                                <div className="selveh-card-detalle">
                                    {v.marca} {v.linea} · {v.modelo_anio || "s/año"}
                                </div>
                                <div className="selveh-card-extra">
                                    <span className={`selveh-card-estado selveh-card-estado-${v.estado}`}>
                                        {etiquetaEstado(v.estado)}
                                    </span>
                                    {typeof v.kilometraje_actual === "number" && (
                                        <span className="selveh-card-km">
                                            {v.kilometraje_actual.toLocaleString()} km
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Modal de confirmacion del vehiculo */}
            {vehiculoSeleccionado && (
                <div className="selveh-modal-overlay">
                    <div className="selveh-modal">
                        <div className="selveh-modal-titulo">Confirmar vehículo</div>

                        <div className="selveh-modal-vehiculo">
                            <div className="selveh-modal-placa">{vehiculoSeleccionado.placa}</div>
                            <div className="selveh-modal-marca">
                                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.linea}
                            </div>
                            <span className={`selveh-card-estado selveh-card-estado-${vehiculoSeleccionado.estado}`}>
                                {etiquetaEstado(vehiculoSeleccionado.estado)}
                            </span>
                        </div>

                        <div className="selveh-modal-form">
                            <label className="selveh-modal-label" htmlFor="km">
                                Kilometraje actual
                            </label>
                            <input
                                id="km"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                className="selveh-modal-input"
                                value={kilometraje}
                                onChange={(e) => setKilometraje(e.target.value)}
                                placeholder="Ej: 45000"
                            />
                            {typeof vehiculoSeleccionado.kilometraje === "number" && (
                                <div className="selveh-modal-hint">
                                    Último registrado: <strong>{vehiculoSeleccionado.kilometraje.toLocaleString()} km</strong>
                                </div>
                            )}
                        </div>

                        {errorForm && (
                            <div className="selveh-modal-error">{errorForm}</div>
                        )}

                        <div className="selveh-modal-botones">
                            <button
                                className="selveh-modal-boton selveh-modal-boton-cancelar"
                                onClick={cerrarSeleccion}
                                disabled={iniciando}
                            >
                                Volver atrás
                            </button>
                            <button
                                className="selveh-modal-boton selveh-modal-boton-confirmar"
                                onClick={iniciarChequeo}
                                disabled={iniciando || !kilometraje}
                            >
                                {iniciando ? "Iniciando..." : "Iniciar chequeo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SeleccionVehiculo;
