import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import ModalVehiculo from "./components/ModalVehiculo.jsx";
import "./VehiculosAdmin.css";

const ESTADOS = {
    operativo: { texto: "Operativo", color: "verde" },
    observacion: { texto: "Observación", color: "azul" },
    alerta: { texto: "Alerta", color: "amarillo" },
    critico: { texto: "Crítico", color: "rojo" },
    no_operativo: { texto: "No operativo", color: "oscuro" },
};

const FILTRO_INACTIVOS = "inactivos";

const TIPOS_LABEL = {
    camion: "Camión",
    camioneta: "Camioneta",
    tractocamion: "Tractocamión",
    microbus: "Microbús",
    buseta: "Buseta",
    bus: "Bus",
};

function VehiculosAdmin() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [vehiculos, setVehiculos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [vehiculoEnEdicion, setVehiculoEnEdicion] = useState(null);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    const [refrescando, setRefrescando] = useState(false);
    const [toast, setToast] = useState(null);

    // Navegación territorial: el Nacional ve Departamentos → Sedes → Vehículos;
    // el Regional ve las Sedes de su departamento → Vehículos; el Coordinador ve
    // sus vehículos directo. La "vista" se deriva del rol + lo que el admin haya
    // seleccionado (sin estado extra ni efectos).
    const nivelBase =
        usuario?.rol === "superadmin" ? "departamentos"
            : usuario?.rol === "admin_departamental" ? "sedes"
                : "vehiculos";
    const [deptoSel, setDeptoSel] = useState(null);
    const [sedeSel, setSedeSel] = useState(null);
    const [busquedaNivel, setBusquedaNivel] = useState(""); // buscar departamento/sede
    const vista = sedeSel ? "vehiculos"
        : nivelBase === "vehiculos" ? "vehiculos"
            : (nivelBase === "departamentos" && !deptoSel) ? "departamentos"
                : "sedes";

    const mostrarToast = (mensaje, tipo = "exito", posicion = "abajo-derecha") => {
        setToast({ mensaje, tipo, posicion, key: Date.now() });
    };

    const cargarVehiculos = async ({ silencioso = false } = {}) => {
        if (silencioso) {
            setRefrescando(true);
        } else {
            setCargando(true);
        }
        setError(null);
        try {
            const data = await api("/vehiculos");
            setVehiculos(data.vehiculos);
            setUltimaActualizacion(new Date());
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    };

    useEffect(() => {
        if (usuario) cargarVehiculos();
    }, [usuario]);

    useEffect(() => {
        if (!usuario) return;
        const intervalo = setInterval(() => {
            cargarVehiculos({ silencioso: true });
        }, 30000);
        return () => clearInterval(intervalo);
    }, [usuario]);

    // Si el admin entró a una sede, todo (filtros, conteos, grid) se acota a ese
    // sede; si no, trabaja sobre todos los vehículos visibles según su scope.
    const vehiculosBase = sedeSel
        ? vehiculos.filter((v) => v.sede?.id === sedeSel.id)
        : vehiculos;

    const vehiculosFiltrados = vehiculosBase.filter((v) => {
        if (filtroEstado === FILTRO_INACTIVOS) {
            if (v.activo) return false;
        } else if (filtroEstado !== "todos") {
            if (v.estado !== filtroEstado) return false;
        }
        if (filtroTipo !== "todos" && v.tipo !== filtroTipo) return false;
        if (busqueda) {
            const q = busqueda.toLowerCase();
            const match =
                v.placa?.toLowerCase().includes(q) ||
                v.marca?.toLowerCase().includes(q) ||
                v.linea?.toLowerCase().includes(q);
            if (!match) return false;
        }
        return true;
    });

    const conteoEstados = vehiculosBase.reduce((acc, v) => {
        if (v.activo) acc[v.estado] = (acc[v.estado] || 0) + 1;
        return acc;
    }, {});

    const conteoInactivos = vehiculosBase.filter((v) => !v.activo).length;

    // Agrupa los vehículos por departamento o por sede, con conteo de alertas
    // (críticos / no operativos) para las tarjetas de los niveles superiores.
    const agruparNivel = (lista, clave) => {
        const mapa = new Map();
        for (const v of lista) {
            const k = clave(v);
            if (!k?.id) continue;
            if (!mapa.has(k.id)) mapa.set(k.id, { ...k, total: 0, criticos: 0, noOperativos: 0 });
            const g = mapa.get(k.id);
            g.total++;
            if (v.activo && v.estado === "critico") g.criticos++;
            if (v.activo && v.estado === "no_operativo") g.noOperativos++;
        }
        return [...mapa.values()].sort(
            (a, b) => (b.criticos + b.noOperativos) - (a.criticos + a.noOperativos) || a.nombre.localeCompare(b.nombre)
        );
    };
    const departamentos = agruparNivel(vehiculos, (v) => {
        const d = v.sede?.ciudad?.departamento;
        return d ? { id: d.id, nombre: d.nombre } : null;
    });
    const sedesDelNivel = agruparNivel(
        deptoSel ? vehiculos.filter((v) => v.sede?.ciudad?.departamento?.id === deptoSel.id) : vehiculos,
        (v) => (v.sede ? { id: v.sede.id, nombre: v.sede.nombre, ciudad: v.sede.ciudad?.nombre } : null)
    );

    const entrarDepto = (d) => { setDeptoSel(d); setSedeSel(null); setBusquedaNivel(""); };
    const entrarSede = (c) => setSedeSel(c);
    const volver = () => {
        if (vista === "vehiculos") setSedeSel(null);
        else if (vista === "sedes") setDeptoSel(null);
        setBusquedaNivel("");
    };
    const puedeVolver = vista !== nivelBase;

    // Buscador de los niveles superiores (departamentos / sedes).
    const gruposNivel = vista === "departamentos" ? departamentos : vista === "sedes" ? sedesDelNivel : [];
    const qNivel = busquedaNivel.trim().toLowerCase();
    const gruposNivelFiltrados = qNivel
        ? gruposNivel.filter((g) => g.nombre.toLowerCase().includes(qNivel) || (g.ciudad || "").toLowerCase().includes(qNivel))
        : gruposNivel;

    const desactivar = async (id, placa) => {
        if (!confirm(`¿Desactivar el vehículo ${placa}?`)) return;
        try {
            await api(`/vehiculos/${id}/desactivar`, { method: "PATCH" });
            mostrarToast(`Vehículo ${placa} desactivado`, "advertencia");
            cargarVehiculos({ silencioso: true });
        } catch (err) {
            mostrarToast(err.message, "error");
        }
    };

    const reactivar = async (id, placa) => {
        try {
            await api(`/vehiculos/${id}/reactivar`, { method: "PATCH" });
            mostrarToast(`Vehículo ${placa} reactivado`, "exito");
            cargarVehiculos({ silencioso: true });
        } catch (err) {
            mostrarToast(err.message, "error");
        }
    };

    const eliminar = async (id, placa) => {
        if (!confirm(`¿Eliminar permanentemente el vehículo ${placa}? Esta acción no se puede deshacer.`))
            return;
        try {
            await api(`/vehiculos/${id}`, { method: "DELETE" });
            mostrarToast(`Vehículo ${placa} eliminado exitosamente`, "exito");
            cargarVehiculos({ silencioso: true });
        } catch (err) {
            mostrarToast(err.message, "error");
        }
    };

    const obtenerFotoPrincipal = (v) => {
        const principal = v.fotos?.find((f) => f.es_principal);
        return principal?.url || v.fotos?.[0]?.url || null;
    };

    return (
        <AdminLayout titulo="Gestión de vehículos">
            <div className="vehiculos-admin-contenido">
                <div className="vehiculos-admin-encabezado">
                    <div>
                        <h1 className="vehiculos-admin-titulo">Vehículos</h1>
                        <p className="vehiculos-admin-subtitulo">
                            {vista === "departamentos"
                                ? `${departamentos.length} departamento${departamentos.length === 1 ? "" : "s"} con vehículos`
                                : vista === "sedes"
                                    ? `${sedesDelNivel.length} sede${sedesDelNivel.length === 1 ? "" : "s"}${deptoSel ? ` · ${deptoSel.nombre}` : ""}`
                                    : `${vehiculosBase.length} registrados · ${vehiculosFiltrados.length} visibles${sedeSel ? ` · ${sedeSel.nombre}` : ""}`}
                            {ultimaActualizacion && (
                                <span className="vehiculos-admin-actualizado">
                                    · Actualizado a las {ultimaActualizacion.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="vehiculos-admin-acciones-header">
                        <button
                            className={`vehiculos-admin-boton-refrescar ${refrescando ? "refrescando" : ""}`}
                            onClick={() => cargarVehiculos({ silencioso: true })}
                            disabled={cargando || refrescando}
                            title="Refrescar listado"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                            </svg>
                            Refrescar
                        </button>
                        <button
                            className="vehiculos-admin-boton-crear"
                            onClick={() => setModalCrearAbierto(true)}
                        >
                            + Crear vehículo
                        </button>
                    </div>
                </div>

                {/* Barra de navegación territorial: volver + ruta (depto › sede) */}
                {puedeVolver && (
                    <div className="vehiculos-nivel-barra animar-fade-in">
                        <button className="vehiculos-nivel-volver" onClick={volver}>← Volver</button>
                        <span className="vehiculos-nivel-ruta">
                            {deptoSel && <span>{deptoSel.nombre}</span>}
                            {sedeSel && <span> › {sedeSel.nombre}</span>}
                        </span>
                    </div>
                )}

                {/* NIVELES SUPERIORES: buscador + tarjetas de departamentos o de sedes */}
                {(vista === "departamentos" || vista === "sedes") && !cargando && !error && gruposNivel.length > 0 && (
                    <div className="vehiculos-admin-filtros animar-fade-in">
                        <input
                            type="text"
                            className="vehiculos-admin-busqueda"
                            placeholder={vista === "departamentos" ? "Buscar departamento..." : "Buscar sede o ciudad..."}
                            value={busquedaNivel}
                            onChange={(e) => setBusquedaNivel(e.target.value)}
                        />
                    </div>
                )}

                {(vista === "departamentos" || vista === "sedes") && !cargando && !error && (
                    gruposNivel.length === 0 ? (
                        <div className="vehiculos-admin-vacio">No hay vehículos registrados todavía.</div>
                    ) : gruposNivelFiltrados.length === 0 ? (
                        <div className="vehiculos-admin-vacio">
                            No se encontró ningún {vista === "departamentos" ? "departamento" : "sede"} con “{busquedaNivel}”.
                        </div>
                    ) : (
                        <div className="vehiculos-niveles-grid animar-fade-in">
                            {gruposNivelFiltrados.map((g) => (
                                <button
                                    key={g.id}
                                    className="vehiculos-nivel-card"
                                    onClick={() => (vista === "departamentos" ? entrarDepto(g) : entrarSede(g))}
                                >
                                    <div className="vehiculos-nivel-card-nombre">{g.nombre}</div>
                                    {g.ciudad && <div className="vehiculos-nivel-card-sub">{g.ciudad}</div>}
                                    <div className="vehiculos-nivel-card-total">
                                        {g.total} vehículo{g.total === 1 ? "" : "s"}
                                    </div>
                                    <div className="vehiculos-nivel-card-alertas">
                                        {g.criticos > 0 && (
                                            <span className="vehiculos-nivel-alerta rojo">{g.criticos} crítico{g.criticos === 1 ? "" : "s"}</span>
                                        )}
                                        {g.noOperativos > 0 && (
                                            <span className="vehiculos-nivel-alerta gris">{g.noOperativos} no operativo{g.noOperativos === 1 ? "" : "s"}</span>
                                        )}
                                        {g.criticos === 0 && g.noOperativos === 0 && (
                                            <span className="vehiculos-nivel-alerta ok">Sin alertas</span>
                                        )}
                                    </div>
                                    <div className="vehiculos-nivel-card-flecha">Ver →</div>
                                </button>
                            ))}
                        </div>
                    )
                )}

                {vista === "vehiculos" && (<>
                <div className="vehiculos-admin-resumen animar-fade-in">
                    <div
                        className="vehiculos-admin-resumen-item"
                        onClick={() => setFiltroEstado("todos")}
                    >
                        <div className="vehiculos-admin-resumen-num">{vehiculosBase.length}</div>
                        <div className="vehiculos-admin-resumen-label">Total</div>
                    </div>
                    {Object.entries(ESTADOS).map(([key, info]) => (
                        <div
                            key={key}
                            className={`vehiculos-admin-resumen-item vehiculos-admin-resumen-${info.color}`}
                            onClick={() => setFiltroEstado(filtroEstado === key ? "todos" : key)}
                        >
                            <div className="vehiculos-admin-resumen-num">{conteoEstados[key] || 0}</div>
                            <div className="vehiculos-admin-resumen-label">{info.texto}</div>
                        </div>
                    ))}
                    <div
                        className="vehiculos-admin-resumen-item vehiculos-admin-resumen-gris"
                        onClick={() => setFiltroEstado(filtroEstado === FILTRO_INACTIVOS ? "todos" : FILTRO_INACTIVOS)}
                    >
                        <div className="vehiculos-admin-resumen-num">{conteoInactivos}</div>
                        <div className="vehiculos-admin-resumen-label">Inactivos</div>
                    </div>
                </div>

                <div className="vehiculos-admin-filtros animar-fade-in">
                    <input
                        type="text"
                        className="vehiculos-admin-busqueda"
                        placeholder="Buscar por placa, marca o línea..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        className="vehiculos-admin-select"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="todos">Todos los estados</option>
                        {Object.entries(ESTADOS).map(([key, info]) => (
                            <option key={key} value={key}>{info.texto}</option>
                        ))}
                        <option value={FILTRO_INACTIVOS}>Inactivos</option>
                    </select>
                    <select
                        className="vehiculos-admin-select"
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                        <option value="todos">Todos los tipos</option>
                        {Object.entries(TIPOS_LABEL).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                </>)}

                {cargando && (
                    <div className="vehiculos-admin-estado-cargando">Cargando vehículos...</div>
                )}

                {error && (
                    <div className="vehiculos-admin-estado-error animar-shake">⚠️ {error}</div>
                )}

                {vista === "vehiculos" && !cargando && !error && vehiculosFiltrados.length === 0 && (
                    <div className="vehiculos-admin-vacio">
                        No hay vehículos que coincidan con los filtros.
                    </div>
                )}

                {vista === "vehiculos" && !cargando && !error && vehiculosFiltrados.length > 0 && (
                    <div className="vehiculos-admin-grid animar-fade-in">
                        {vehiculosFiltrados.map((v) => {
                            const estadoInfo = ESTADOS[v.estado] || ESTADOS.operativo;
                            const fotoPrincipal = obtenerFotoPrincipal(v);
                            return (
                                <div
                                    key={v.id}
                                    className={`vehiculo-card vehiculo-card-${estadoInfo.color} ${!v.activo ? "vehiculo-card-inactivo" : ""}`}
                                >
                                    <div className="vehiculo-card-foto">
                                        {fotoPrincipal ? (
                                            <img src={fotoPrincipal} alt={v.placa} />
                                        ) : (
                                            <div className="vehiculo-card-foto-placeholder">
                                                <span>🚛</span>
                                                <span className="vehiculo-card-sin-foto">Sin foto</span>
                                            </div>
                                        )}
                                        <div className={`vehiculo-card-estado-badge vehiculo-card-badge-${estadoInfo.color}`}>
                                            {estadoInfo.texto}
                                            {v.nivel_criticidad > 0 && ` ${v.nivel_criticidad}%`}
                                        </div>
                                        {v.es_vip && (
                                            <div
                                                className="vehiculo-card-vip-badge"
                                                title="Vehículo especial / de dirección (VIP) — Pool de transporte"
                                            >
                                                ⭐ VIP
                                            </div>
                                        )}
                                    </div>

                                    <div className="vehiculo-card-info">
                                        <div className="vehiculo-card-placa">{v.placa}</div>
                                        <div className="vehiculo-card-marca">
                                            {v.marca} {v.linea}
                                        </div>
                                        <div className="vehiculo-card-meta">
                                            <span className="vehiculo-card-tipo">{TIPOS_LABEL[v.tipo]}</span>
                                            {v.modelo_anio && (
                                                <span className="vehiculo-card-anio">{v.modelo_anio}</span>
                                            )}
                                        </div>
                                        {v.kilometraje_actual && (
                                            <div className="vehiculo-card-km">
                                                {v.kilometraje_actual.toLocaleString()} km
                                            </div>
                                        )}
                                    </div>

                                    <div className="vehiculo-card-acciones">
                                        <button
                                            className="vehiculo-card-accion"
                                            onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                        >
                                            Detalle
                                        </button>
                                        <button
                                            className="vehiculo-card-accion"
                                            onClick={() => setVehiculoEnEdicion(v)}
                                        >
                                            Editar
                                        </button>
                                        {v.activo ? (
                                            <button
                                                className="vehiculo-card-accion vehiculo-card-accion-warning"
                                                onClick={() => desactivar(v.id, v.placa)}
                                            >
                                                Desactivar
                                            </button>
                                        ) : (
                                            <button
                                                className="vehiculo-card-accion vehiculo-card-accion-success"
                                                onClick={() => reactivar(v.id, v.placa)}
                                            >
                                                Reactivar
                                            </button>
                                        )}
                                        <button
                                            className="vehiculo-card-accion vehiculo-card-accion-danger"
                                            onClick={() => eliminar(v.id, v.placa)}
                                        >
                                            Eliminar
                                        </button>
                                        <BotonExportar
                                            base={`/export/vehiculo/${v.id}`}
                                            nombre={`vehiculo-${v.placa || v.id}`}
                                            compacto
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ModalVehiculo
                abierto={modalCrearAbierto}
                onCerrar={() => setModalCrearAbierto(false)}
                mostrarToast={mostrarToast}
                onGuardado={(vehiculoCreado) => {
                    const placa = vehiculoCreado?.placa;
                    mostrarToast(
                        placa
                            ? `Vehículo ${placa} creado exitosamente`
                            : "Vehículo creado exitosamente",
                        "exito"
                    );
                    cargarVehiculos({ silencioso: true });
                }}
            />

            <ModalVehiculo
                abierto={vehiculoEnEdicion !== null}
                onCerrar={() => setVehiculoEnEdicion(null)}
                vehiculo={vehiculoEnEdicion}
                mostrarToast={mostrarToast}
                onGuardado={(vehiculoActualizado) => {
                    const placa = vehiculoActualizado?.placa || vehiculoEnEdicion?.placa;
                    mostrarToast(
                        `Vehículo ${placa} actualizado exitosamente`,
                        "exito"
                    );
                    cargarVehiculos({ silencioso: true });
                }}
            />

            {toast && (
                <Toast
                    key={toast.key}
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    posicion={toast.posicion}
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default VehiculosAdmin;
