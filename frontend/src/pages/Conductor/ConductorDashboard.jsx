// Dashboard del conductor — rediseñado en Tarea #103 con el ConductorLayout.
// Estructura:
//   1) Hero: foto del conductor + saludo + fecha + rol
//   2) Los 2 circulos centrales (Preoperacional + Post-operacional) intactos
//   3) Card con info de licencia (categoria, numero, vencimiento)
//
// Cualquier cambio en el layout general (header/footer) vive en ConductorLayout.

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { enSuplencia, cubreVariasSedes } from "../../lib/roles.js";
import ConductorLayout from "../../components/ConductorLayout/ConductorLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import "./ConductorDashboard.css";

// Helper: fecha tipo "viernes 5 de junio de 2026"
const formatearFechaHoy = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Helper: texto humano para "tiempo hasta el vencimiento" de la licencia.
// Umbrales: <0=vencido, <=15=critico (rojo), <=30=urgente (naranja), >30=normal (verde).
const tiempoHasta = (iso) => {
    if (!iso) return null;
    const ahora = new Date();
    const objetivo = new Date(iso);
    const diffMs = objetivo - ahora;
    const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (dias < 0) return { texto: `vencida hace ${Math.abs(dias)} días`, nivel: "vencido" };
    if (dias === 0) return { texto: "vence hoy", nivel: "critico" };
    if (dias <= 15) return { texto: `${dias} día${dias === 1 ? "" : "s"}`, nivel: "critico" };
    if (dias <= 30) return { texto: `${dias} día${dias === 1 ? "" : "s"}`, nivel: "urgente" };
    if (dias <= 365) {
        const meses = Math.round(dias / 30);
        return { texto: `${meses} ${meses === 1 ? "mes" : "meses"}`, nivel: "normal" };
    }
    const anios = Math.floor(dias / 365);
    return { texto: `${anios} ${anios === 1 ? "año" : "años"}`, nivel: "normal" };
};

function ConductorDashboard() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);
    // Qué círculo está verificando disponibilidad de vehículos (null = ninguno).
    // Sirve para deshabilitar los botones y mostrar "Verificando…" en el clicado.
    const [verificandoTipo, setVerificandoTipo] = useState(null);

    // Si llegó acá porque le finalizaron la suplencia, avisarle (mensaje neutro).
    useEffect(() => {
        if (location.state?.suplenciaTerminada) {
            setToast({
                mensaje: "Tu suplencia terminó. Volviste a tu panel de conductor.",
                tipo: "info",
            });
            // Limpiar el state para que no se repita al refrescar/navegar.
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    if (!usuario) return null;

    const primerNombre = usuario.nombre_completo?.split(" ")[0] || "Conductor";
    const vencimiento = tiempoHasta(usuario.licencia_vencimiento);
    // Inicial del nombre para el placeholder cuando no hay foto
    const inicial = usuario.nombre_completo?.charAt(0).toUpperCase() || "C";

    // ¿La licencia esta vencida? (Tarea #106). Comparamos solo fechas.
    const licenciaVencida = (() => {
        if (!usuario.licencia_vencimiento) return false;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const v = new Date(usuario.licencia_vencimiento);
        v.setHours(0, 0, 0, 0);
        return v < hoy;
    })();

    // Maneja el clic en un circulo. Antes de mandar al conductor a la aptitud
    // hacemos DOS validaciones tempranas para no hacerle perder tiempo:
    //   1) Licencia vigente (si esta vencida, avisa y no avanza).
    //   2) Que HAYA vehiculos disponibles para el en su sede. Asi no completa
    //      toda la aptitud para descubrir recien en el Paso 2 que no hay vehiculos.
    //      El endpoint ya respeta la matriz pool/VIP (pool -> solo VIP; normal ->
    //      solo no-VIP), asi que sirve igual para los conductores del pool.
    // (El backend igual valida todo; esto es solo para mejor experiencia.)
    const iniciarChequeo = async (tipo) => {
        if (licenciaVencida) {
            const v = new Date(usuario.licencia_vencimiento);
            const fecha = v.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
            setToast({
                mensaje: `Tu licencia de conducción está vencida desde el ${fecha}. Debes renovarla antes de operar un vehículo. Contacta al administrador del sistema.`,
                tipo: "error",
            });
            return;
        }

        setVerificandoTipo(tipo);
        try {
            const data = await api("/chequeos/vehiculos-disponibles");
            const hayVehiculos = (data.vehiculos || []).length > 0;
            if (!hayVehiculos) {
                setToast({
                    mensaje:
                        "No hay vehículos disponibles para ti en tu sede en este momento. Avísale al Coordinador de sede antes de iniciar el chequeo.",
                    tipo: "error",
                });
                return;
            }
            navigate(`/conductor/chequeo/aptitud?tipo=${tipo}`);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({
                    mensaje:
                        err.message ||
                        "No se pudo verificar la disponibilidad de vehículos. Revisa tu conexión e intenta de nuevo.",
                    tipo: "error",
                });
            }
        } finally {
            setVerificandoTipo(null);
        }
    };

    // Hay una verificación en curso (cualquiera de los dos círculos).
    const verificando = verificandoTipo !== null;

    // Suplencia (Pool · Paso 2): si está supliendo al Coordinador, mostramos un
    // aviso con acceso al panel admin (que ya tiene habilitado por rol efectivo).
    const supliendo = enSuplencia(usuario);
    const hastaSuplencia = usuario?.suplencia?.hasta
        ? new Date(usuario.suplencia.hasta).toLocaleDateString("es-CO")
        : null;
    const variosSedes = cubreVariasSedes(usuario);
    // Texto de a quién/qué está supliendo: una regional entera o un solo sede.
    const fraseSuplencia = usuario?.suplencia?.departamento?.nombre
        ? `Estás supliendo a los Coordinadores de Flota de la Regional ${usuario.suplencia.departamento.nombre}`
        : `Estás supliendo al Coordinador de sede${usuario?.suplencia?.sede?.nombre || usuario?.sede_nombre
            ? ` de ${usuario?.suplencia?.sede?.nombre || usuario.sede_nombre}` : ""}`;

    return (
        <ConductorLayout>
            {/* Contenedor principal que agrupa hero + circulos + licencia
                en un solo "card" visual grande. */}
            <div className="cond-contenedor animar-fade-in-up">

            {/* ===== Hero: foto + saludo + fecha ===== */}
            <section className="cond-hero">
                {usuario.foto_url ? (
                    <img
                        src={usuario.foto_url}
                        alt={usuario.nombre_completo}
                        className="cond-hero-foto"
                    />
                ) : (
                    <div className="cond-hero-foto-placeholder">{inicial}</div>
                )}
                <div className="cond-hero-saludo">Hola,</div>
                <h1 className="cond-hero-nombre">{primerNombre}</h1>
                {/* Tipo de conductor: normal (flota general) o pool (vehículos
                    especiales/VIP). El pool se resalta con una pastilla morada. */}
                <div className={`cond-hero-rol${usuario.es_pool ? " cond-hero-rol-pool" : ""}`}>
                    {usuario.es_pool ? "⭐ Pool de transporte · vehículos VIP" : "Conductor"}
                </div>
                {usuario.sede_nombre && (
                    <div className="cond-hero-sede">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M3 21h18" />
                            <path d="M5 21V7l8-4v18" />
                            <path d="M19 21V11l-6-4" />
                            <line x1="9" y1="9" x2="9" y2="9.01" />
                            <line x1="9" y1="12" x2="9" y2="12.01" />
                            <line x1="9" y1="15" x2="9" y2="15.01" />
                            <line x1="9" y1="18" x2="9" y2="18.01" />
                        </svg>
                        <span>{usuario.sede_nombre}</span>
                    </div>
                )}
                <div className="cond-hero-fecha">{formatearFechaHoy()}</div>
            </section>

            {/* Aviso de suplencia: el pool está reemplazando al Coordinador */}
            {supliendo && (
                <section className="cond-suplencia-banner">
                    <div className="cond-suplencia-texto">
                        {fraseSuplencia}
                        {hastaSuplencia ? ` hasta el ${hastaSuplencia}` : " (sin fecha de fin)"}.
                    </div>
                    <button
                        className="cond-suplencia-boton"
                        onClick={() => navigate(variosSedes ? "/suplencia/sedes" : "/dashboard")}
                    >
                        {variosSedes ? "Elegir sede a gestionar" : "Entrar al panel de Coordinador"}
                    </button>
                </section>
            )}

            {/* Aviso fijo si la licencia esta vencida */}
            {licenciaVencida && (
                <div className="cond-licencia-bloqueo">
                    ⚠ Tu licencia de conducción está vencida. No puedes iniciar
                    chequeos hasta renovarla. Contacta al administrador del sistema.
                </div>
            )}

            {/* ===== Los 2 circulos a la sede ===== */}
            <section className="cond-circulos">
                <button
                    className={`cond-circulo cond-circulo-pre ${licenciaVencida ? "cond-circulo-bloqueado" : ""}`}
                    onClick={() => iniciarChequeo("preoperacional")}
                    disabled={verificando}
                    title={licenciaVencida ? "Licencia vencida — no disponible" : "Iniciar chequeo preoperacional"}
                >
                    <div className="cond-circulo-icono">🚛</div>
                    <div className="cond-circulo-titulo">Preoperacional</div>
                    <div className="cond-circulo-sub">
                        {verificandoTipo === "preoperacional" ? "Verificando…" : "Antes del recorrido"}
                    </div>
                </button>

                <button
                    className={`cond-circulo cond-circulo-post ${licenciaVencida ? "cond-circulo-bloqueado" : ""}`}
                    onClick={() => iniciarChequeo("postoperacional")}
                    disabled={verificando}
                    title={licenciaVencida ? "Licencia vencida — no disponible" : "Iniciar chequeo postoperacional"}
                >
                    <div className="cond-circulo-icono">🏁</div>
                    <div className="cond-circulo-titulo">Post-operacional</div>
                    <div className="cond-circulo-sub">
                        {verificandoTipo === "postoperacional" ? "Verificando…" : "Al regresar"}
                    </div>
                </button>
            </section>

            {/* ===== Card con info de licencia ===== */}
            {(usuario.licencia_numero || usuario.licencia_categoria || usuario.licencia_vencimiento) && (
                <section className="cond-licencia">
                    <div className="cond-licencia-encabezado">
                        <span className="cond-licencia-titulo">Mi licencia de conducción</span>
                    </div>
                    <div className="cond-licencia-grid">
                        {usuario.licencia_categoria && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Categoría</div>
                                <div className="cond-licencia-valor">
                                    {usuario.licencia_categoria}
                                </div>
                            </div>
                        )}
                        {usuario.licencia_numero && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Número</div>
                                <div className="cond-licencia-valor">
                                    {usuario.licencia_numero}
                                </div>
                            </div>
                        )}
                        {vencimiento && (
                            <div className="cond-licencia-campo">
                                <div className="cond-licencia-label">Vencimiento</div>
                                <div
                                    className={`cond-licencia-vencimiento cond-licencia-vencimiento-${vencimiento.nivel}`}
                                >
                                    {vencimiento.texto}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            </div>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={6000}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </ConductorLayout>
    );
}

export default ConductorDashboard;
