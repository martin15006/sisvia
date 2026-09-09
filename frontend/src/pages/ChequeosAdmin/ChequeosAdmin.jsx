// Lista de chequeos para el admin: filtros por fecha, placa, estado, oficial/cerrado, paginacion.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import Toast from "../../components/Toast/Toast.jsx";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import "./ChequeosAdmin.css";

const ESTADOS = [
    { valor: "", label: "Todos los estados" },
    { valor: "operativo", label: "Operativo" },
    { valor: "observacion", label: "Observación" },
    { valor: "alerta", label: "Alerta" },
    { valor: "critico", label: "Crítico" },
    { valor: "no_operativo", label: "No operativo" },
];

const LIMITE_POR_PAGINA = 20;

const formatearFecha = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// El input acepta espacios y cualquier formato; la normalizacion (quitar espacios)
// se hace en el backend con normalizarPlaca para que ABC123 y ABC 123 matcheen igual.

function ChequeosAdmin() {
    const navigate = useNavigate();
    const { usuario } = useAuth();

    // Datos
    const [chequeos, setChequeos] = useState([]);
    const [total, setTotal] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [toast, setToast] = useState(null);

    // Filtros
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [placa, setPlaca] = useState("");
    const [resultadoEstado, setResultadoEstado] = useState("");
    const [soloOficiales, setSoloOficiales] = useState(false);
    const [soloCerrados, setSoloCerrados] = useState(false);

    // Paginacion
    const [pagina, setPagina] = useState(1);

    const cargarChequeos = useCallback(async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.append("fecha_desde", fechaDesde);
            if (fechaHasta) params.append("fecha_hasta", fechaHasta);
            if (placa.trim()) params.append("placa", placa.trim());
            if (resultadoEstado) params.append("resultado_estado", resultadoEstado);
            if (soloOficiales) params.append("solo_oficiales", "true");
            if (soloCerrados) params.append("solo_cerrados", "true");
            params.append("pagina", String(pagina));
            params.append("limite", String(LIMITE_POR_PAGINA));

            const data = await api(`/chequeos?${params.toString()}`);
            setChequeos(data.chequeos || []);
            setTotal(data.total || 0);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setCargando(false);
        }
    }, [fechaDesde, fechaHasta, placa, resultadoEstado, soloOficiales, soloCerrados, pagina]);

    useEffect(() => {
        cargarChequeos();
    }, [cargarChequeos]);

    const limpiarFiltros = () => {
        setFechaDesde("");
        setFechaHasta("");
        setPlaca("");
        setResultadoEstado("");
        setSoloOficiales(false);
        setSoloCerrados(false);
        setPagina(1);
    };

    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA));

    // Reporte: misma cara de filtros que la lista (sin paginación → trae todo lo visible).
    const baseReporte = (() => {
        const p = new URLSearchParams();
        if (fechaDesde) p.append("fecha_desde", fechaDesde);
        if (fechaHasta) p.append("fecha_hasta", fechaHasta);
        if (placa.trim()) p.append("placa", placa.trim());
        if (resultadoEstado) p.append("resultado_estado", resultadoEstado);
        if (soloOficiales) p.append("solo_oficiales", "true");
        if (soloCerrados) p.append("solo_cerrados", "true");
        const qs = p.toString();
        return `/export/reporte/chequeos${qs ? `?${qs}` : ""}`;
    })();

    return (
        <AdminLayout titulo="Chequeos preoperacionales">
            {/* Barra de página (sin botones de navegacion — el sidebar los cubre) */}
            <section className="cheqadmin-barra-pagina">
                <div className="cheqadmin-barra-titulo">
                    <h1>Chequeos preoperacionales</h1>
                    <p>{total} chequeo{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}</p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <BotonExportar base={baseReporte} nombre="reporte-chequeos" />
                </div>
            </section>

            {/* Filtros */}
            <section className="cheqadmin-filtros">
                <div className="cheqadmin-filtro">
                    <label>Fecha desde</label>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => { setFechaDesde(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="cheqadmin-filtro">
                    <label>Fecha hasta</label>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => { setFechaHasta(e.target.value); setPagina(1); }}
                    />
                </div>
                <div className="cheqadmin-filtro">
                    <label>Placa</label>
                    <input
                        type="text"
                        placeholder="Ej: ABC123 o ABC 123"
                        value={placa}
                        onChange={(e) => { setPlaca(e.target.value.toUpperCase()); setPagina(1); }}
                    />
                </div>
                <div className="cheqadmin-filtro">
                    <label>Estado del resultado</label>
                    <select
                        value={resultadoEstado}
                        onChange={(e) => { setResultadoEstado(e.target.value); setPagina(1); }}
                    >
                        {ESTADOS.map((e) => (
                            <option key={e.valor} value={e.valor}>{e.label}</option>
                        ))}
                    </select>
                </div>
                <div className="cheqadmin-filtro-checks">
                    <label className="cheqadmin-check">
                        <input
                            type="checkbox"
                            checked={soloOficiales}
                            onChange={(e) => { setSoloOficiales(e.target.checked); setPagina(1); }}
                        />
                        <span className="cheqadmin-check-textos">
                            <span className="cheqadmin-check-titulo">Solo oficiales</span>
                            <span className="cheqadmin-check-ayuda">
                                Excluye los rechequeos hechos el mismo día sobre el mismo vehículo. Deja solo el chequeo principal.
                            </span>
                        </span>
                    </label>
                    <label className="cheqadmin-check">
                        <input
                            type="checkbox"
                            checked={soloCerrados}
                            onChange={(e) => { setSoloCerrados(e.target.checked); setPagina(1); }}
                        />
                        <span className="cheqadmin-check-textos">
                            <span className="cheqadmin-check-titulo">Solo cerrados</span>
                            <span className="cheqadmin-check-ayuda">
                                Excluye los chequeos que el conductor empezó pero no terminó. Deja solo los que ya fueron finalizados con resultado.
                            </span>
                        </span>
                    </label>
                    <button className="cheqadmin-boton-limpiar" onClick={limpiarFiltros}>
                        Limpiar filtros
                    </button>
                </div>
            </section>

            {/* Lista */}
            <main className="cheqadmin-main">
                {cargando && <div className="cheqadmin-cargando">Cargando chequeos...</div>}

                {!cargando && chequeos.length === 0 && (
                    <div className="cheqadmin-vacio">
                        No se encontraron chequeos con los filtros actuales.
                    </div>
                )}

                {!cargando && chequeos.length > 0 && (
                    <div className="cheqadmin-lista">
                        {chequeos.map((c) => (
                            <article
                                key={c.id}
                                className={`cheqadmin-card cheqadmin-card-${c.resultado_estado || "pendiente"}`}
                                onClick={() => navigate(`/admin/chequeos/${c.id}`)}
                            >
                                <div className="cheqadmin-card-fila-superior">
                                    <div className="cheqadmin-card-placa">
                                        {c.vehiculo?.placa || "—"}
                                    </div>
                                    <div className="cheqadmin-card-badges">
                                        <span className={`cheqadmin-badge-tipo cheqadmin-badge-tipo-${c.tipo}`}>
                                            {c.tipo === "postoperacional" ? "POST" : "PRE"}
                                        </span>
                                        {c.es_oficial ? (
                                            <span className="cheqadmin-badge-oficial">OFICIAL</span>
                                        ) : (
                                            <span className="cheqadmin-badge-rechequeo">RECHEQUEO</span>
                                        )}
                                        {c.cerrado ? (
                                            <span className="cheqadmin-badge-cerrado">CERRADO</span>
                                        ) : c.abandonado ? (
                                            <span className="cheqadmin-badge-abandonado">
                                                ABANDONADO
                                            </span>
                                        ) : (
                                            <span className="cheqadmin-badge-abierto">EN PROCESO</span>
                                        )}
                                    </div>
                                </div>

                                <div className="cheqadmin-card-vehiculo">
                                    {c.vehiculo?.marca} {c.vehiculo?.linea} · {c.vehiculo?.modelo_anio || "s/año"}
                                </div>

                                <div className="cheqadmin-card-conductor">
                                    <span className="cheqadmin-card-conductor-label">Conductor:</span>{" "}
                                    {c.conductor?.nombre_completo || "—"}
                                    {c.conductor?.cedula && (
                                        <span className="cheqadmin-card-cedula"> · CC {c.conductor.cedula}</span>
                                    )}
                                </div>

                                <div className="cheqadmin-card-fila-inferior">
                                    <div className="cheqadmin-card-fecha">
                                        {formatearFecha(c.fecha)}
                                    </div>

                                    {c.cerrado && c.resultado_estado && (
                                        <span className={`cheqadmin-resultado cheqadmin-resultado-${c.resultado_estado}`}>
                                            {(c.resultado_estado || "").replace("_", " ").toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {c.cerrado && (
                                    <div className="cheqadmin-card-resumen">
                                        <span className="cheqadmin-resumen-cumple">
                                            {c.items_cumple_count ?? 0} Cumple
                                        </span>
                                        <span className="cheqadmin-resumen-no-cumple">
                                            {c.items_no_cumple_count ?? 0} No cumple
                                        </span>
                                        <span className="cheqadmin-resumen-na">
                                            {c.items_no_aplica_count ?? 0} N/A
                                        </span>
                                        {c.tiene_falla_critica && (
                                            <span className="cheqadmin-resumen-critico">
                                                FALLA CRÍTICA
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div
                                    className="cheqadmin-card-exportar"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <BotonExportar
                                        base={`/export/chequeo/${c.id}`}
                                        nombre={`chequeo-${c.vehiculo?.placa || c.id}`}
                                        compacto
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* Paginacion */}
                {!cargando && totalPaginas > 1 && (
                    <div className="cheqadmin-paginacion">
                        <button
                            disabled={pagina === 1}
                            onClick={() => setPagina(pagina - 1)}
                        >
                            ← Anterior
                        </button>
                        <span className="cheqadmin-paginacion-info">
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

export default ChequeosAdmin;
