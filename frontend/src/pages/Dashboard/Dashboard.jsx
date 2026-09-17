// Dashboard administrativo — version final con datos reales (Bloque B paso 4).
// Consume /api/dashboard/stats y muestra:
//   1) Saludo + fecha de hoy
//   2) 4 cajas grandes de KPIs del dia
//   3) Seccion "Necesita atencion" con 3 grupos de alertas linkeables
//
// Auto-refresh cada 60 segundos para que el admin vea los numeros del dia
// actualizados sin tener que recargar manualmente.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import ModalInformeSuperior from "./ModalInformeSuperior.jsx";
import "./Dashboard.css";

// Los cinco estados en orden de severidad. El mismo orden manda en la franja
// y en la leyenda, para que la lectura sea siempre la misma.
const ESTADOS_FLOTA = [
    { clave: "operativo", etiqueta: "Operativo" },
    { clave: "observacion", etiqueta: "Observación" },
    { clave: "alerta", etiqueta: "Alerta" },
    { clave: "critico", etiqueta: "Crítico" },
    { clave: "no_operativo", etiqueta: "No operativo" },
];

// La banda de "No pueden salir" muestra el MOTIVO del bloqueo, no el estado del
// vehículo: un camión con el SOAT vencido puede estar en estado 'operativo' y
// aun así no poder circular. Pintarle una banda verde contradiría la lista.
// `tono` es el color de estado con el que se pinta (severidad equivalente).
const MOTIVO_BLOQUEO = {
    desactivado:       { etiqueta: "Desactivado",   tono: "no_operativo" },
    documento_vencido: { etiqueta: "Doc. vencido",  tono: "critico" },
    no_operativo:      { etiqueta: "No operativo",  tono: "no_operativo" },
    critico:           { etiqueta: "Crítico",       tono: "critico" },
};

// Helper: formato de fecha tipo "viernes 5 de junio de 2026"
const formatearFechaHoy = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Helper: clasifica los dias restantes en niveles de urgencia.
// Umbrales acordados con el usuario: <=15 dias = critico (rojo), <=30 dias = urgente (naranja)
const nivelLicencia = (dias) => {
    if (dias < 0) return "vencido";   // ya vencio (rojo invertido)
    if (dias <= 15) return "critico"; // <= 15 dias (rojo)
    if (dias <= 30) return "urgente"; // <= 30 dias (naranja)
    return "normal";                  // > 30 dias (verde)
};

// Helper: texto humano para dias restantes
const textoLicencia = (dias) => {
    if (dias < 0) return `vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
    if (dias === 0) return "vence hoy";
    if (dias === 1) return "vence mañana";
    return `vence en ${dias} días`;
};

function Dashboard() {
    const { usuario } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [modalInforme, setModalInforme] = useState(false);
    const [toast, setToast] = useState(null);

    const cargarStats = async () => {
        try {
            const data = await api("/dashboard/stats");
            setStats(data);
            setError(null);
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (usuario) cargarStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario]);

    // Auto-refresh cada 60s para mantener los numeros del dia actualizados
    useEffect(() => {
        if (!usuario) return;
        const interval = setInterval(cargarStats, 60000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario]);

    if (!usuario) return null;

    // Conteo total de alertas para mostrar al usuario en el header de la seccion.
    // chequeos_abandonados puede no venir en backends viejos -> uso optional chaining.
    const totalAlertas = stats
        ? stats.alertas.licencias_por_vencer.length +
          stats.alertas.vehiculos_sin_runt.length +
          stats.alertas.vehiculos_no_operativos.length +
          (stats.alertas.chequeos_abandonados?.length || 0)
        : 0;

    // Flag de scope para mostrar texto contextual al admin.
    // 'global' = superadmin (ve todo); cualquier otro = ve su area asignada.
    const esScopeLimitado = stats?.scope && stats.scope.tipo !== "global";

    return (
        <AdminLayout titulo="Dashboard">
            {/* ===== Saludo ===== */}
            <div className="dashboard-bienvenida animar-fade-in-up">
                <div>
                    <h2 className="dashboard-saludo">
                        Hola, {usuario.nombre_completo?.split(" ")[0]}
                    </h2>
                    <p className="dashboard-fecha">{formatearFechaHoy()}</p>
                    {esScopeLimitado && (
                        <p className="dashboard-scope">
                            Estás viendo los datos de tu área asignada.
                        </p>
                    )}
                </div>
                {/* El administrador general no tiene superior a quién escalar -> no se le muestra */}
                {usuario.rol !== "superadmin" && (
                    <button
                        className="dashboard-boton-informe"
                        onClick={() => setModalInforme(true)}
                        title="Enviar un informe a tu superior"
                    >
                        📤 Informar a mi superior
                    </button>
                )}
            </div>

            {/* ===== Estado de error ===== */}
            {error && (
                <div className="dashboard-error animar-shake">
                    ⚠️ {error}
                    <button className="dashboard-error-reintentar" onClick={cargarStats}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* ===== KPIs del dia ===== */}
            <section className="dashboard-seccion animar-fade-in">
                <h3 className="dashboard-seccion-titulo">Números de hoy</h3>
                <div className="dashboard-kpis">
                    <div
                        className="dashboard-kpi dashboard-kpi-clickeable"
                        onClick={() => navigate("/admin/chequeos")}
                        title="Ir a chequeos realizados"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.chequeos_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Chequeos del día</div>
                    </div>

                    <div
                        className={`dashboard-kpi dashboard-kpi-clickeable ${
                            !cargando && stats?.kpis.chequeos_no_operativos_del_dia > 0
                                ? "dashboard-kpi-alerta"
                                : ""
                        }`}
                        onClick={() => navigate("/admin/chequeos")}
                        title="Ver chequeos con resultado no operativo"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.chequeos_no_operativos_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">No operativos</div>
                    </div>

                    <div
                        className={`dashboard-kpi dashboard-kpi-clickeable ${
                            !cargando && stats?.kpis.intentos_bloqueados_del_dia > 0
                                ? "dashboard-kpi-alerta"
                                : ""
                        }`}
                        onClick={() => navigate("/admin/chequeos/intentos-bloqueados")}
                        title="Ver intentos bloqueados"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.intentos_bloqueados_del_dia ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Intentos bloqueados</div>
                    </div>

                    <div
                        className="dashboard-kpi dashboard-kpi-clickeable"
                        onClick={() => navigate("/admin/usuarios")}
                        title="Ir a gestión de usuarios"
                    >
                        <div className="dashboard-kpi-numero">
                            {cargando ? "—" : stats?.kpis.conductores_activos ?? 0}
                        </div>
                        <div className="dashboard-kpi-label">Conductores activos</div>
                    </div>
                </div>
            </section>

            {/* ===== Estado de la flota (franja proporcional) ===== */}
            {stats?.flota && stats.flota.total > 0 && (
                <section className="dashboard-seccion animar-fade-in">
                    <h3 className="dashboard-seccion-titulo">
                        Estado de la flota
                        <span className="dashboard-flota-total">
                            {stats.flota.total} {stats.flota.total === 1 ? "vehículo" : "vehículos"}
                        </span>
                    </h3>

                    {/* Una barra proporcional dice de un vistazo lo que cuatro
                        contadores sueltos no dicen: cuánto pesa cada estado. */}
                    <div
                        className="dashboard-flota-barra"
                        role="img"
                        aria-label={ESTADOS_FLOTA.map(
                            (e) => `${e.etiqueta}: ${stats.flota[e.clave]}`
                        ).join(", ")}
                    >
                        {ESTADOS_FLOTA.map((e) =>
                            stats.flota[e.clave] > 0 ? (
                                <div
                                    key={e.clave}
                                    className={`dashboard-flota-tramo dashboard-flota-${e.clave}`}
                                    style={{ flexGrow: stats.flota[e.clave] }}
                                    title={`${e.etiqueta}: ${stats.flota[e.clave]}`}
                                />
                            ) : null
                        )}
                    </div>

                    <ul className="dashboard-flota-leyenda">
                        {ESTADOS_FLOTA.map((e) => (
                            <li key={e.clave} className="dashboard-flota-item">
                                <span className={`dashboard-flota-punto dashboard-flota-${e.clave}`} />
                                <span className="dashboard-flota-etiqueta">{e.etiqueta}</span>
                                <span className="dashboard-flota-cifra">{stats.flota[e.clave]}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ===== No pueden salir ===== */}
            {stats?.no_pueden_salir && stats.no_pueden_salir.length > 0 && (
                <section className="dashboard-seccion animar-fade-in">
                    <h3 className="dashboard-seccion-titulo">
                        No pueden salir
                        <span className="dashboard-seccion-badge">
                            {stats.no_pueden_salir.length}
                        </span>
                    </h3>

                    <div className="dashboard-bloqueados">
                        {stats.no_pueden_salir.map((v) => (
                            <button
                                key={v.id}
                                className="dashboard-bloqueado"
                                onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                title="Ver detalle del vehículo"
                            >
                                {/* La banda dice el veredicto antes que cualquier dato */}
                                <span
                                    className={`dashboard-bloqueado-banda dashboard-banda-${
                                        MOTIVO_BLOQUEO[v.motivo]?.tono || v.estado
                                    }`}
                                >
                                    {MOTIVO_BLOQUEO[v.motivo]?.etiqueta || v.detalle}
                                </span>
                                <span className="dashboard-bloqueado-placa">{v.placa}</span>
                                <span className="dashboard-bloqueado-motivo">{v.detalle}</span>
                                <span className="dashboard-bloqueado-sede">{v.sede_nombre}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Necesita atencion ===== */}
            <section className="dashboard-seccion animar-fade-in">
                <h3 className="dashboard-seccion-titulo">
                    Necesita atención
                    {totalAlertas > 0 && (
                        <span className="dashboard-seccion-badge">{totalAlertas}</span>
                    )}
                </h3>

                {cargando && (
                    <div className="dashboard-cargando">Cargando alertas...</div>
                )}

                {!cargando && totalAlertas === 0 && (
                    <div className="dashboard-sin-alertas">
                        Todo está en orden. No hay nada que requiera atención inmediata.
                    </div>
                )}

                {!cargando && totalAlertas > 0 && (
                    <div className="dashboard-alertas">
                        {/* === Licencias por vencer === */}
                        {stats.alertas.licencias_por_vencer.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Licencias por vencer
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.licencias_por_vencer.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.licencias_por_vencer.slice(0, 5).map((u) => {
                                        const nivel = nivelLicencia(u.dias_restantes);
                                        return (
                                            <li
                                                key={u.id}
                                                className={`dashboard-item-alerta dashboard-item-${nivel}`}
                                                onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                                                title="Ver perfil del conductor"
                                            >
                                                <span className="dashboard-item-nombre">
                                                    {u.nombre_completo}
                                                </span>
                                                <span className="dashboard-item-meta">
                                                    {textoLicencia(u.dias_restantes)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {stats.alertas.licencias_por_vencer.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/usuarios")}
                                    >
                                        Ver los {stats.alertas.licencias_por_vencer.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Vehiculos sin RUNT === */}
                        {stats.alertas.vehiculos_sin_runt.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Vehículos sin RUNT cargado
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.vehiculos_sin_runt.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.vehiculos_sin_runt.slice(0, 5).map((v) => (
                                        <li
                                            key={v.id}
                                            className="dashboard-item-alerta dashboard-item-urgente"
                                            onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                            title="Ver detalle del vehículo"
                                        >
                                            <span className="dashboard-item-nombre">{v.placa}</span>
                                            <span className="dashboard-item-meta">
                                                {v.marca}
                                                {v.linea ? ` ${v.linea}` : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.vehiculos_sin_runt.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/vehiculos")}
                                    >
                                        Ver los {stats.alertas.vehiculos_sin_runt.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Chequeos abandonados hoy (Tarea #104) === */}
                        {stats.alertas.chequeos_abandonados?.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Chequeos abandonados hoy
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.chequeos_abandonados.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.chequeos_abandonados.slice(0, 5).map((c) => (
                                        <li
                                            key={c.id}
                                            className="dashboard-item-alerta dashboard-item-critico"
                                            onClick={() => navigate(`/admin/chequeos/${c.id}`)}
                                            title="Ver detalle del chequeo abandonado"
                                        >
                                            <span className="dashboard-item-nombre">
                                                {c.conductor_nombre}
                                            </span>
                                            <span className="dashboard-item-meta">
                                                {c.placa} · {c.motivo_abandono || "abandonado"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.chequeos_abandonados.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/chequeos")}
                                    >
                                        Ver los {stats.alertas.chequeos_abandonados.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}

                        {/* === Vehiculos no operativos o bloqueados === */}
                        {stats.alertas.vehiculos_no_operativos.length > 0 && (
                            <div className="dashboard-grupo-alerta">
                                <div className="dashboard-grupo-titulo">
                                    Vehículos no operativos o bloqueados
                                    <span className="dashboard-grupo-cantidad">
                                        {stats.alertas.vehiculos_no_operativos.length}
                                    </span>
                                </div>
                                <ul className="dashboard-lista-alerta">
                                    {stats.alertas.vehiculos_no_operativos.slice(0, 5).map((v) => (
                                        <li
                                            key={v.id}
                                            className="dashboard-item-alerta dashboard-item-critico"
                                            onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                                            title="Ver detalle del vehículo"
                                        >
                                            <span className="dashboard-item-nombre">{v.placa}</span>
                                            <span className="dashboard-item-meta">
                                                {!v.activo
                                                    ? "desactivado"
                                                    : v.estado === "no_operativo"
                                                        ? "no operativo"
                                                        : v.estado}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {stats.alertas.vehiculos_no_operativos.length > 5 && (
                                    <button
                                        className="dashboard-ver-mas"
                                        onClick={() => navigate("/admin/vehiculos")}
                                    >
                                        Ver los {stats.alertas.vehiculos_no_operativos.length - 5} restantes →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <ModalInformeSuperior
                abierto={modalInforme}
                onCerrar={() => setModalInforme(false)}
                onEnviado={(msg) => setToast({ mensaje: msg, tipo: "exito" })}
            />
            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={4000}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

export default Dashboard;
