// "Solicitudes" (pacto portada-publica, HU-04): las solicitudes de cita que las
// empresas dejan en la portada publica. Solo el equipo SISVIA, afuera de las
// empresas. Se marcan como contactadas o se borran (el borrado es de verdad).
import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Modal from "../../components/Modal/Modal.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { avisarCambioSolicitudes } from "../../lib/solicitudes.js";
import { avisarCambioNotificaciones } from "../../lib/notificacionesUtils.js";
import "./Solicitudes.css";

const CADA_CUANTO_MS = 30 * 1000;

const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const fechaCorta = (iso) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

// Como se muestra el telefono guardado: 3001234567 -> 300 123 4567.
const telefonoVisible = (t) => (/^3\d{9}$/.test(t) ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t);

function Solicitudes() {
    const { usuario, empresaActiva } = useAuth();
    const [solicitudes, setSolicitudes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [trabajando, setTrabajando] = useState(null); // id de la que se esta marcando o borrando
    const [aBorrar, setABorrar] = useState(null);
    const [errorAccion, setErrorAccion] = useState(null);

    // HU-04.6 (enmienda 1): la lista se pide al entrar y cada 30 s mientras la pestaña
    // esta a la vista. CB-16: lo que otra pestaña marco o borro aparece en la siguiente.
    useEffect(() => {
        let vivo = true;
        const pedir = () => api("/solicitudes")
            .then((r) => { if (vivo) { setSolicitudes(r.solicitudes || []); setError(null); } })
            .catch((err) => { if (vivo) setError(err.message); })
            .finally(() => { if (vivo) setCargando(false); });
        pedir();
        const reloj = setInterval(() => {
            if (document.visibilityState === "visible") pedir();
        }, CADA_CUANTO_MS);
        return () => { vivo = false; clearInterval(reloj); };
    }, []);

    // HU-03.1 (enmienda 2): desde la campanita se llega con ?solicitud=<id>: la página
    // baja hasta esa solicitud (una vez por cada una) y la deja resaltada.
    const [params] = useSearchParams();
    const elegida = params.get("solicitud");
    const bajadoA = useRef(null);
    useEffect(() => {
        if (cargando || !elegida || bajadoA.current === elegida) return;
        const tarjeta = document.getElementById(`solicitud-${elegida}`);
        if (!tarjeta) return;
        const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        tarjeta.scrollIntoView({ block: "center", behavior: quieto ? "auto" : "smooth" });
        bajadoA.current = elegida;
    }, [cargando, elegida, solicitudes]);

    if (usuario && usuario.rol !== "superadmin") return <Navigate to="/dashboard" replace />;

    const reemplazar = (nueva) => setSolicitudes((lista) => lista.map((s) => (s.id === nueva.id ? nueva : s)));

    const marcar = async (s) => {
        setTrabajando(s.id);
        setErrorAccion(null);
        try {
            const r = await api(`/solicitudes/${s.id}/contactada`, { method: "PATCH" });
            reemplazar(r.solicitud);
            avisarCambioSolicitudes();
            avisarCambioNotificaciones(); // HU-04.7: su aviso quedó leído; la campanita se pone al día
        } catch (err) {
            setErrorAccion({ id: s.id, texto: err.message });
        } finally {
            setTrabajando(null);
        }
    };

    const borrar = async () => {
        const s = aBorrar;
        setTrabajando(s.id);
        setErrorAccion(null);
        try {
            await api(`/solicitudes/${s.id}`, { method: "DELETE" });
            setSolicitudes((lista) => lista.filter((x) => x.id !== s.id));
            avisarCambioSolicitudes();
            setABorrar(null);
        } catch (err) {
            setErrorAccion({ id: s.id, texto: err.message });
            setABorrar(null);
        } finally {
            setTrabajando(null);
        }
    };

    const nuevas = solicitudes.filter((s) => s.estado === "nueva").length;

    return (
        <AdminLayout titulo="Solicitudes">
            <div className="solicitudes">
                <div className="solicitudes-encabezado">
                    <h1 className="solicitudes-titulo">Solicitudes</h1>
                    <p className="solicitudes-subtitulo">
                        Empresas que pidieron una cita desde la portada.
                        {nuevas > 0 && <> <strong>{nuevas} {nuevas === 1 ? "nueva" : "nuevas"}.</strong></>}
                    </p>
                    {empresaActiva && <p className="solicitudes-subtitulo">Estás dentro de una empresa: las solicitudes son del equipo, no de ella.</p>}
                </div>

                {cargando ? (
                    <p className="solicitudes-vacio">Cargando...</p>
                ) : error ? (
                    <p className="solicitudes-vacio">{error}</p>
                ) : solicitudes.length === 0 ? (
                    <p className="solicitudes-vacio">Todavía no hay solicitudes. Cuando una empresa llene el formulario de la portada, aparece aquí.</p>
                ) : (
                    <ul className="solicitudes-lista">
                        {solicitudes.map((s) => (
                            <li key={s.id} id={`solicitud-${s.id}`}
                                className={`solicitud${s.estado === "nueva" ? " solicitud--nueva" : ""}${s.id === elegida ? " solicitud--elegida" : ""}`}>
                                <div className="solicitud-cabeza">
                                    <div>
                                        <h2 className="solicitud-empresa">{s.empresa}</h2>
                                        <p className="solicitud-lugar">
                                            {s.ciudad}{s.vehiculos ? ` · ${s.vehiculos} ${s.vehiculos === 1 ? "vehículo" : "vehículos"}` : ""}
                                        </p>
                                    </div>
                                    <div className="solicitud-estado">
                                        <span className={`solicitud-sello solicitud-sello--${s.estado}`}>{s.estado === "nueva" ? "Nueva" : "Contactada"}</span>
                                        <time dateTime={s.created_at} title={fecha(s.created_at)}>{fecha(s.created_at)}</time>
                                    </div>
                                </div>

                                <dl className="solicitud-datos">
                                    <div><dt>Nombre</dt><dd>{s.nombre}</dd></div>
                                    <div>
                                        <dt>Teléfono</dt>
                                        <dd>
                                            {s.whatsapp
                                                ? <a href={s.whatsapp} target="_blank" rel="noreferrer">{telefonoVisible(s.telefono)} · WhatsApp</a>
                                                : telefonoVisible(s.telefono)}
                                        </dd>
                                    </div>
                                    <div><dt>Correo</dt><dd>{s.correo ? <a href={`mailto:${s.correo}`}>{s.correo}</a> : "No lo dejó"}</dd></div>
                                </dl>

                                {s.mensaje && <p className="solicitud-mensaje">{s.mensaje}</p>}

                                <div className="solicitud-pie">
                                    {s.estado === "contactada" ? (
                                        <p className="solicitud-contactada">Contactada por {s.contactada_por_nombre || "el equipo"} · {fechaCorta(s.contactada_en)}</p>
                                    ) : (
                                        <button type="button" className="solicitudes-boton solicitudes-boton--primario"
                                            onClick={() => marcar(s)} disabled={trabajando === s.id}>
                                            {trabajando === s.id ? "Guardando..." : "Marcar como contactada"}
                                        </button>
                                    )}
                                    {/* HU-04.3 (enmienda 1): primero se marca como contactada; recién ahí se puede borrar. */}
                                    {s.estado === "contactada" && (
                                        <button type="button" className="solicitudes-boton solicitudes-boton--peligro"
                                            onClick={() => setABorrar(s)} disabled={trabajando === s.id}>
                                            Borrar
                                        </button>
                                    )}
                                    {errorAccion?.id === s.id && <p className="solicitudes-error" role="alert">{errorAccion.texto}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal abierto={!!aBorrar} onCerrar={() => setABorrar(null)} titulo="Borrar solicitud" ancho="pequeno">
                {aBorrar && (
                    <div className="solicitudes-confirmar">
                        <p>¿Borrar la solicitud de {aBorrar.empresa}? No se puede deshacer.</p>
                        <div className="solicitudes-confirmar-botones">
                            <button type="button" className="solicitudes-boton" onClick={() => setABorrar(null)}>Cancelar</button>
                            <button type="button" className="solicitudes-boton solicitudes-boton--peligro-lleno" onClick={borrar} disabled={trabajando === aBorrar.id}>
                                {trabajando === aBorrar.id ? "Borrando..." : "Borrar"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}

export default Solicitudes;
