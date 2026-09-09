// Pagina de detalle (vista de "ficha completa") de un usuario en modo lectura.
// Acceso: solo admin, ruta /admin/usuarios/:id. Boton "Ver perfil" desde la tabla.
// Diseno (ver explicacion en bitacora.semana-4.fase 4):
//   - Hero: foto + nombre + rol + sede + estado
//   - Datos personales (cedula, correo, telefono)
//   - Licencia + seguridad social (solo si es conductor)
//   - Resumen de chequeos (solo si es conductor)
//   - Actividad reciente (auditoria_usuarios)
// Acciones administrativas: 1 sola, "Editar perfil", que abre el modal de edicion
// existente (no se duplican aqui acciones de cambiar correo/cedula).

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { etiquetaCargo } from "../../lib/roles.js";
import Footer from "../../components/Footer/Footer.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import BotonVolver from "../../components/BotonVolver/BotonVolver.jsx";
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import ModalEditarUsuario from "../UsuariosAdmin/components/ModalEditarUsuario.jsx";
import "./PerfilUsuario.css";

// Etiquetas legibles para las acciones de auditoria
const ETIQUETAS_ACCION = {
    creado: "Cuenta creada",
    editado: "Datos editados",
    desactivado: "Cuenta desactivada",
    reactivado: "Cuenta reactivada",
    password_reseteado: "Contraseña reseteada",
    cambio_correo: "Correo cambiado",
    cambio_cedula: "Cédula cambiada",
    eliminado: "Cuenta eliminada",
};

// Estado del último chequeo → color de badge
const COLOR_RESULTADO = {
    operativo: "verde",
    observacion: "amarillo",
    alerta: "naranja",
    critico: "rojo",
    no_operativo: "rojo",
};

// Formato de fecha tipo "28 may 2026, 14:30"
const formatearFechaCorta = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Para fechas de vencimiento (sin hora)
const formatearFechaSimple = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

// Devuelve string tipo "9 meses", "12 días", "vencida hace 3 días".
// Umbrales: <0=vencido (rojo invertido), <=15=critico (rojo), <=30=urgente (naranja), >30=normal (verde)
const tiempoHasta = (iso) => {
    if (!iso) return null;
    const ahora = new Date();
    const objetivo = new Date(iso);
    const diffMs = objetivo - ahora;
    const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (dias < 0) return { texto: `vencida hace ${Math.abs(dias)} días`, vencido: true };
    if (dias === 0) return { texto: "vence hoy", vencido: false, critico: true };
    if (dias <= 15) return { texto: `${dias} días`, vencido: false, critico: true };
    if (dias <= 30) return { texto: `${dias} días`, vencido: false, urgente: true };
    if (dias <= 365) {
        const meses = Math.round(dias / 30);
        return { texto: `${meses} ${meses === 1 ? "mes" : "meses"}`, vencido: false };
    }
    const anios = Math.floor(dias / 365);
    return { texto: `${anios} ${anios === 1 ? "año" : "años"}`, vencido: false };
};

function PerfilUsuario() {
    const { id } = useParams();
    const { usuario: usuarioActual, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [toast, setToast] = useState(null);

    const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

    const cargarPerfil = async () => {
        setCargando(true);
        setError(null);
        try {
            const resp = await api(`/usuarios/${id}/perfil-detalle`);
            setData(resp);
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPerfil();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const cerrar = () => {
        cerrarSesion();
        navigate("/login");
    };

    if (cargando) {
        return (
            <div className="perfil-pagina">
                <div className="perfil-cargando">Cargando perfil...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="perfil-pagina">
                <div className="perfil-error animar-shake">⚠️ {error}</div>
                <BotonVolver a="/admin/usuarios" texto="Volver a usuarios" />
            </div>
        );
    }

    if (!data?.usuario) return null;

    const { usuario, chequeos, actividad_reciente } = data;
    const esConductor = usuario.rol === "conductor";
    const vencimiento = tiempoHasta(usuario.licencia_vencimiento);

    return (
        <div className="perfil-pagina">
            {/* Header igual que el resto del admin */}
            <header className="perfil-header">
                <div className="perfil-logo-wrapper">
                    <img src="/logo.png" alt="SISVIA" className="perfil-logo-img" />
                    <div className="perfil-logo">Gestión de Flota</div>
                </div>
                <div className="perfil-usuario-header">
                    <div className="perfil-usuario-info">
                        <div className="perfil-usuario-nombre">{usuarioActual.nombre_completo}</div>
                        <div className="perfil-usuario-rol">{usuarioActual.rol}</div>
                    </div>
                    <button className="perfil-logout" onClick={cerrar}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="perfil-main">
                <div className="perfil-acciones-top">
                    <BotonVolver a="/admin/usuarios" texto="Volver a usuarios" />
                    <div className="perfil-acciones-derecha">
                        <button
                            className="perfil-boton-editar"
                            onClick={() => setModalEditarAbierto(true)}
                        >
                            Editar perfil
                        </button>
                        {esConductor && (
                            <BotonExportar
                                base={`/export/conductor/${usuario.id}`}
                                nombre={`conductor-${usuario.cedula || usuario.id}`}
                            />
                        )}
                    </div>
                </div>

                {/* ===== HERO: foto + datos resumen ===== */}
                <section className="perfil-hero animar-fade-in">
                    {usuario.foto_url ? (
                        <img
                            src={usuario.foto_url}
                            alt={usuario.nombre_completo}
                            className="perfil-hero-foto"
                        />
                    ) : (
                        <div className="perfil-hero-foto-placeholder">
                            {usuario.nombre_completo?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="perfil-hero-info">
                        <h1 className="perfil-hero-nombre">{usuario.nombre_completo}</h1>
                        <div className="perfil-hero-meta">
                            <span className={`perfil-rol-badge perfil-rol-${usuario.rol}`}>
                                {etiquetaCargo(usuario)}
                                {usuario.supliendo && " · suplencia"}
                            </span>
                            {usuario.sede_nombre && (
                                <span className="perfil-hero-sede">
                                    {usuario.sede_nombre}
                                </span>
                            )}
                        </div>
                        <div className="perfil-hero-estado">
                            <span
                                className={`perfil-estado-badge ${usuario.activo ? "activo" : "inactivo"
                                    }`}
                            >
                                {usuario.activo ? "Activo" : "Inactivo"}
                            </span>
                            {usuario.debe_cambiar_password && (
                                <span className="perfil-estado-badge advertencia">
                                    Pendiente cambio de contraseña
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* ===== DATOS PERSONALES ===== */}
                <section className="perfil-seccion animar-fade-in">
                    <h2 className="perfil-seccion-titulo">Datos personales</h2>
                    <div className="perfil-grid-datos">
                        <div className="perfil-dato">
                            <div className="perfil-dato-label">Cédula</div>
                            <div className="perfil-dato-valor">{usuario.cedula || "—"}</div>
                        </div>
                        <div className="perfil-dato">
                            <div className="perfil-dato-label">Correo electrónico</div>
                            <div className="perfil-dato-valor">
                                {usuario.email || (
                                    <span className="perfil-dato-vacio">(sin correo registrado)</span>
                                )}
                            </div>
                        </div>
                        <div className="perfil-dato">
                            <div className="perfil-dato-label">Teléfono</div>
                            <div className="perfil-dato-valor">{usuario.telefono || "—"}</div>
                        </div>
                        <div className="perfil-dato">
                            <div className="perfil-dato-label">Registrado</div>
                            <div className="perfil-dato-valor">
                                {formatearFechaCorta(usuario.created_at)}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== LICENCIA + SEGURIDAD SOCIAL (solo conductor) ===== */}
                {esConductor && (
                    <section className="perfil-seccion animar-fade-in">
                        <h2 className="perfil-seccion-titulo">Licencia y seguridad social</h2>
                        <div className="perfil-grid-datos">
                            <div className="perfil-dato">
                                <div className="perfil-dato-label">Número de licencia</div>
                                <div className="perfil-dato-valor">
                                    {usuario.licencia_numero || "—"}
                                </div>
                            </div>
                            <div className="perfil-dato">
                                <div className="perfil-dato-label">Categoría</div>
                                <div className="perfil-dato-valor">
                                    {usuario.licencia_categoria || "—"}
                                </div>
                            </div>
                            <div className="perfil-dato">
                                <div className="perfil-dato-label">Vence</div>
                                <div className="perfil-dato-valor">
                                    {formatearFechaSimple(usuario.licencia_vencimiento)}
                                    {vencimiento && (
                                        <span
                                            className={`perfil-vencimiento ${vencimiento.vencido
                                                ? "vencido"
                                                : vencimiento.critico
                                                    ? "critico"
                                                    : vencimiento.urgente
                                                        ? "urgente"
                                                        : ""
                                                }`}
                                        >
                                            {vencimiento.texto}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="perfil-dato">
                                <div className="perfil-dato-label">EPS</div>
                                <div className="perfil-dato-valor">{usuario.eps || "—"}</div>
                            </div>
                            <div className="perfil-dato">
                                <div className="perfil-dato-label">ARL</div>
                                <div className="perfil-dato-valor">{usuario.arl || "—"}</div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ===== RESUMEN DE CHEQUEOS (solo conductor) ===== */}
                {esConductor && chequeos && (
                    <section className="perfil-seccion animar-fade-in">
                        <h2 className="perfil-seccion-titulo">Historial de chequeos</h2>
                        <div className="perfil-stats">
                            <div className="perfil-stat">
                                <div className="perfil-stat-numero">{chequeos.total_cerrados}</div>
                                <div className="perfil-stat-label">Chequeos completados</div>
                            </div>
                            <div className="perfil-stat">
                                <div
                                    className={`perfil-stat-numero ${chequeos.intentos_bloqueados > 0 ? "advertencia" : ""
                                        }`}
                                >
                                    {chequeos.intentos_bloqueados}
                                </div>
                                <div className="perfil-stat-label">Intentos bloqueados</div>
                            </div>
                        </div>

                        {chequeos.ultimo ? (
                            <div className="perfil-ultimo-chequeo">
                                <div className="perfil-ultimo-chequeo-header">
                                    Último chequeo
                                </div>
                                <div className="perfil-ultimo-chequeo-body">
                                    <div>
                                        <span className="perfil-ultimo-label">Placa:</span>{" "}
                                        <strong>{chequeos.ultimo.placa || "—"}</strong>
                                    </div>
                                    <div>
                                        <span className="perfil-ultimo-label">Fecha:</span>{" "}
                                        {formatearFechaCorta(
                                            chequeos.ultimo.fecha_cierre || chequeos.ultimo.fecha
                                        )}
                                    </div>
                                    <div>
                                        <span className="perfil-ultimo-label">Resultado:</span>{" "}
                                        {chequeos.ultimo.cerrado ? (
                                            <span
                                                className={`perfil-resultado-badge perfil-resultado-${COLOR_RESULTADO[chequeos.ultimo.resultado_estado] || "gris"
                                                    }`}
                                            >
                                                {chequeos.ultimo.resultado_estado || "—"}
                                            </span>
                                        ) : (
                                            <span className="perfil-resultado-badge perfil-resultado-gris">
                                                en curso
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="perfil-link-ver-chequeo"
                                    onClick={() =>
                                        navigate(`/admin/chequeos/${chequeos.ultimo.id}`)
                                    }
                                >
                                    Ver detalle del chequeo →
                                </button>
                            </div>
                        ) : (
                            <div className="perfil-sin-datos">
                                Este conductor aún no ha realizado ningún chequeo.
                            </div>
                        )}
                    </section>
                )}

                {/* ===== ACTIVIDAD RECIENTE ===== */}
                <section className="perfil-seccion animar-fade-in">
                    <h2 className="perfil-seccion-titulo">Actividad reciente</h2>
                    {actividad_reciente.length === 0 ? (
                        <div className="perfil-sin-datos">
                            No hay actividad registrada para este usuario.
                        </div>
                    ) : (
                        <ul className="perfil-timeline">
                            {actividad_reciente.map((a) => (
                                <li key={a.id} className="perfil-timeline-item">
                                    <span className="perfil-timeline-marcador" aria-hidden="true" />
                                    <div className="perfil-timeline-body">
                                        <div className="perfil-timeline-titulo">
                                            {ETIQUETAS_ACCION[a.accion] || a.accion}
                                        </div>
                                        <div className="perfil-timeline-meta">
                                            {formatearFechaCorta(a.fecha)} · por{" "}
                                            <strong>{a.actor_nombre}</strong>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>

            <Footer />

            {/* Modal de edicion reutilizado de UsuariosAdmin.
                Al guardar, mostramos toast y recargamos el perfil para reflejar cambios. */}
            <ModalEditarUsuario
                abierto={modalEditarAbierto}
                onCerrar={() => setModalEditarAbierto(false)}
                usuario={usuario}
                onEditado={(nombre, mensajePersonalizado) => {
                    mostrarToast(
                        mensajePersonalizado || `Cambios guardados${nombre ? ` para ${nombre}` : ""}`,
                        "exito"
                    );
                    cargarPerfil();
                }}
            />

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default PerfilUsuario;
