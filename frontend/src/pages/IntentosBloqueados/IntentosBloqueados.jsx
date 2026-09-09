// Lista de intentos de chequeo que el sistema bloqueo (conductor no apto, vehiculo desactivado, etc.)

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import Toast from "../../components/Toast/Toast.jsx";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import "./IntentosBloqueados.css";

const RAZONES = [
    { valor: "", label: "Todas las razones" },
    { valor: "conductor_no_apto", label: "Conductor no apto" },
    { valor: "vehiculo_desactivado", label: "Vehículo desactivado" },
    { valor: "vehiculo_no_existe", label: "Vehículo no encontrado / fuera de sede" },
];

const CONFIG_RAZON = {
    conductor_no_apto: {
        label: "Conductor no apto",
        clase: "rojo",
        descripcion: "El conductor respondió que no estaba en condiciones aptas para conducir.",
    },
    vehiculo_desactivado: {
        label: "Vehículo desactivado",
        clase: "naranja",
        descripcion: "El conductor intentó usar un vehículo que el admin tiene desactivado.",
    },
    vehiculo_no_existe: {
        label: "Vehículo no encontrado",
        clase: "morado",
        descripcion: "El vehículo no existe o no pertenece a la sede del conductor.",
    },
};

const LIMITE_POR_PAGINA = 20;

const formatearFechaHora = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

function IntentosBloqueados() {
    const navigate = useNavigate();
    const { usuario } = useAuth();

    const [intentos, setIntentos] = useState([]);
    const [total, setTotal] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [toast, setToast] = useState(null);

    // Filtros
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [razon, setRazon] = useState("");
    const [soloNoNotificados, setSoloNoNotificados] = useState(false);
    const [pagina, setPagina] = useState(1);

    const cargarIntentos = useCallback(async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.append("fecha_desde", fechaDesde);
            if (fechaHasta) params.append("fecha_hasta", fechaHasta);
            if (razon) params.append("razon", razon);
            if (soloNoNotificados) params.append("solo_no_notificados", "true");
            params.append("pagina", String(pagina));
            params.append("limite", String(LIMITE_POR_PAGINA));

            const data = await api(`/chequeos/intentos-bloqueados?${params.toString()}`);
            setIntentos(data.intentos || []);
            setTotal(data.total || 0);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setCargando(false);
        }
    }, [fechaDesde, fechaHasta, razon, soloNoNotificados, pagina]);

    useEffect(() => {
        cargarIntentos();
    }, [cargarIntentos]);

    const limpiarFiltros = () => {
        setFechaDesde("");
        setFechaHasta("");
        setRazon("");
        setSoloNoNotificados(false);
        setPagina(1);
    };

    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA));

    return (
        <AdminLayout titulo="Intentos bloqueados">
            {/* Barra de página (sin botones de navegacion — el sidebar los cubre) */}
            <section className="bloq-barra-pagina">
                <div className="bloq-barra-titulo">
                    <h1>Intentos bloqueados</h1>
                    <p>{total} intento{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"} por el sistema</p>
                </div>
            </section>

            {/* Aviso explicativo */}
            <section className="bloq-aviso">
                <strong>¿Qué son los intentos bloqueados?</strong>
                <p>
                    Cada vez que un conductor intenta iniciar un chequeo y el sistema lo rechaza
                    (porque no está apto, porque el vehículo está desactivado, o porque intenta usar un
                    vehículo de otra sede), queda registrado acá para auditoría y notificación al administrador.
                </p>
            </section>

            {/* Filtros */}
            <section className="bloq-filtros">
                <div className="bloq-filtro">
                    <label>Fecha desde</label>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => { setFechaDesde(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="bloq-filtro">
                    <label>Fecha hasta</label>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => { setFechaHasta(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="bloq-filtro">
                    <label>Razón del bloqueo</label>
                    <select
                        value={razon}
                        onChange={(e) => { setRazon(e.target.value); setPagina(1); }}
                    >
                        {RAZONES.map((r) => (
                            <option key={r.valor} value={r.valor}>{r.label}</option>
                        ))}
                    </select>
                </div>
                <div className="bloq-filtro-checks">
                    <label className="bloq-check">
                        <input
                            type="checkbox"
                            checked={soloNoNotificados}
                            onChange={(e) => { setSoloNoNotificados(e.target.checked); setPagina(1); }}
                        />
                        <span className="bloq-check-textos">
                            <span className="bloq-check-titulo">Solo pendientes de notificar</span>
                            <span className="bloq-check-ayuda">
                                Muestra solo los intentos sobre los que el administrador todavía no recibió notificación.
                            </span>
                        </span>
                    </label>
                    <button className="bloq-boton-limpiar" onClick={limpiarFiltros}>
                        Limpiar filtros
                    </button>
                </div>
            </section>

            {/* Lista */}
            <main className="bloq-main">
                {cargando && <div className="bloq-cargando">Cargando intentos...</div>}

                {!cargando && intentos.length === 0 && (
                    <div className="bloq-vacio">
                        No se encontraron intentos bloqueados con los filtros actuales. Esto es bueno:
                        significa que en este rango los conductores empezaron sus chequeos sin que el sistema los rechazara.
                    </div>
                )}

                {!cargando && intentos.length > 0 && (
                    <div className="bloq-lista">
                        {intentos.map((i) => {
                            const config = CONFIG_RAZON[i.razon] || {
                                label: i.razon || "Razón desconocida",
                                clase: "gris",
                                descripcion: "",
                            };
                            return (
                                <article key={i.id} className={`bloq-card bloq-card-${config.clase}`}>
                                    <div className="bloq-card-cabecera">
                                        <div className="bloq-card-razon">
                                            <span className={`bloq-card-razon-badge bloq-card-razon-badge-${config.clase}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <span className={i.notificado_admin ? "bloq-badge-notificado" : "bloq-badge-pendiente"}>
                                            {i.notificado_admin ? "NOTIFICADO" : "PENDIENTE DE NOTIFICAR"}
                                        </span>
                                    </div>

                                    {config.descripcion && (
                                        <p className="bloq-card-explicacion">{config.descripcion}</p>
                                    )}

                                    <dl className="bloq-card-meta">
                                        <div>
                                            <dt>Conductor</dt>
                                            <dd>
                                                {i.conductor?.nombre_completo || "—"}
                                                {i.conductor?.cedula && (
                                                    <span className="bloq-meta-secundario"> · CC {i.conductor.cedula}</span>
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Vehículo</dt>
                                            <dd>
                                                {i.vehiculo ? (
                                                    <>
                                                        <strong>{i.vehiculo.placa}</strong>
                                                        {i.vehiculo.marca && (
                                                            <span className="bloq-meta-secundario">
                                                                {" "}· {i.vehiculo.marca} {i.vehiculo.linea}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="bloq-meta-secundario">
                                                        Sin vehículo seleccionado (bloqueo previo)
                                                    </span>
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Fecha y hora</dt>
                                            <dd>{formatearFechaHora(i.fecha)}</dd>
                                        </div>
                                    </dl>

                                    {i.detalle && (
                                        <div className="bloq-card-detalle">
                                            <div className="bloq-card-detalle-label">Detalle:</div>
                                            <div className="bloq-card-detalle-texto">{i.detalle}</div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {!cargando && totalPaginas > 1 && (
                    <div className="bloq-paginacion">
                        <button
                            disabled={pagina === 1}
                            onClick={() => setPagina(pagina - 1)}
                        >
                            ← Anterior
                        </button>
                        <span className="bloq-paginacion-info">
                            Página {pagina} de {totalPaginas}
                        </span>
                        <button
                            disabled={pagina >= totalPaginas}
                            onClick={() => setPagina(pagina + 1)}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </main>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default IntentosBloqueados;
