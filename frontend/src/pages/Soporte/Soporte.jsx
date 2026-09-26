// "Soporte" (pacto para-empresas, HU-18): los mensajes a SISVIA y su hilo.
//   - Equipo SISVIA (afuera de las empresas): los de todas, los nuevos primero,
//     con filtro por estado; responde, marca resuelto y entra a la empresa.
//   - Administrador de empresa: los de su empresa; responde mientras no este resuelto.
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { api, apiArchivo } from "../../lib/api.js";
import { descargarArchivo } from "../../lib/descargar.js";
import {
    ESTADOS_BUZON, MENSAJE_MAX, ADJUNTO_ACEPTA, TEXTO_ADJUNTO_INVALIDO, adjuntoValido, tamanoLegible,
    abrirEscribirSisvia, avisarCambioBuzon, escucharCambioBuzon,
} from "../../lib/buzon.js";
import "./Soporte.css";

const FILTROS = [["", "Todos"], ["nuevo", "Nuevos"], ["en_revision", "En revisión"], ["resuelto", "Resueltos"]];

const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Adjunto({ adjunto, ruta }) {
    const [bajando, setBajando] = useState(false);
    const [error, setError] = useState(null);
    if (!adjunto) return null;
    const bajar = async () => {
        setBajando(true);
        setError(null);
        try { await descargarArchivo(ruta, adjunto.nombre); } catch (err) { setError(err.message); } finally { setBajando(false); }
    };
    return (
        <div className="soporte-adjunto">
            <button type="button" className="soporte-adjunto-boton" onClick={bajar} disabled={bajando}>
                📎 {bajando ? "Descargando..." : `${adjunto.nombre} · ${tamanoLegible(adjunto.bytes)}`}
            </button>
            {error && <span className="soporte-error">{error}</span>}
        </div>
    );
}

function Hilo({ id, esSisvia, onCambio }) {
    const navigate = useNavigate();
    const { entrarEmpresa } = useAuth();
    const [mensaje, setMensaje] = useState(null);
    const [error, setError] = useState(null);
    const [texto, setTexto] = useState("");
    const [adjunto, setAdjunto] = useState(null);
    const [errorRespuesta, setErrorRespuesta] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [confirmarResuelto, setConfirmarResuelto] = useState(false);
    const [version, setVersion] = useState(0); // sube al responder, para traer el hilo de nuevo

    // El hilo se desliza por dentro, como un chat: arranca abajo (lo ultimo) y
    // baja solo cuando llega algo nuevo, salvo que hayas subido a leer algo viejo.
    const conversacion = useRef(null);
    const pegadoAbajo = useRef(true);
    const cantidad = mensaje ? mensaje.respuestas.length : -1;
    const alDeslizar = (e) => {
        const lista = e.currentTarget;
        pegadoAbajo.current = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
    };
    useEffect(() => {
        const lista = conversacion.current;
        if (lista && pegadoAbajo.current) lista.scrollTop = lista.scrollHeight;
    }, [cantidad]);

    // Cambiar de mensaje arma un Hilo nuevo (key={id}); aca solo se trae el hilo.
    useEffect(() => {
        let vivo = true;
        api(`/buzon/${id}`)
            .then((r) => { if (vivo) { setMensaje(r.mensaje); setError(null); onCambio?.(); } })
            .catch((err) => { if (vivo && !err.sesionExpirada) setError(err.message); });
        return () => { vivo = false; };
    }, [id, version, onCambio]);

    useEffect(() => {
        const reloj = setInterval(() => {
            if (document.visibilityState === "visible") setVersion((v) => v + 1);
        }, 1000);
        return () => clearInterval(reloj);
    }, []);

    const elegirAdjunto = (e) => {
        const archivo = e.target.files?.[0] || null;
        e.target.value = "";
        if (archivo && !adjuntoValido(archivo)) return setErrorRespuesta(TEXTO_ADJUNTO_INVALIDO);
        setErrorRespuesta(null);
        setAdjunto(archivo);
    };

    const responder = async (e) => {
        e.preventDefault();
        if (!texto.trim()) return setErrorRespuesta("Escribe el mensaje.");
        setEnviando(true);
        setErrorRespuesta(null);
        try {
            const datos = new FormData();
            datos.append("texto", texto);
            if (adjunto) datos.append("adjunto", adjunto);
            await apiArchivo(`/buzon/${id}/respuestas`, datos);
            setTexto("");
            setAdjunto(null);
            pegadoAbajo.current = true;
            setVersion((v) => v + 1);
        } catch (err) {
            if (!err.sesionExpirada) setErrorRespuesta(err.message);
        } finally {
            setEnviando(false);
        }
    };

    const resolver = async () => {
        setEnviando(true);
        try {
            const r = await api(`/buzon/${id}/resolver`, { method: "POST" });
            setMensaje(r.mensaje);
            setConfirmarResuelto(false);
            onCambio?.();
        } catch (err) {
            if (!err.sesionExpirada) setErrorRespuesta(err.message);
        } finally {
            setEnviando(false);
        }
    };

    // HU-18.7: entra a la empresa (queda registrado, HU-16.1) y abre la pantalla desde donde se escribio.
    const verEnLaEmpresa = async () => {
        try {
            const r = await api(`/empresas/${mensaje.empresa_id}/entrar`, { method: "POST" });
            entrarEmpresa(r.empresa);
            navigate(mensaje.pantalla || "/dashboard");
        } catch (err) {
            if (!err.sesionExpirada) setErrorRespuesta(err.message);
        }
    };

    if (error) return <div className="soporte-vacio">{error}</div>;
    if (!mensaje) return <div className="soporte-vacio">Cargando el mensaje...</div>;
    const resuelto = mensaje.estado === "resuelto";
    // Como un chat: lo de mi lado (la empresa o el equipo SISVIA) a la derecha y en
    // amarillo; lo del otro lado, a la izquierda y en blanco.
    const lado = (deSisvia) => (deSisvia === esSisvia ? "soporte-burbuja--propia" : "soporte-burbuja--otra");

    return (
        <article className="soporte-hilo" aria-labelledby="soporte-hilo-titulo">
            <header className="soporte-hilo-cabecera">
                <div className="soporte-hilo-titulos">
                    <h2 className="soporte-hilo-titulo" id="soporte-hilo-titulo">{mensaje.tipo_texto}</h2>
                    <span className={`soporte-estado soporte-estado--${mensaje.estado}`}>{mensaje.estado_texto}</span>
                </div>
                <p className="soporte-hilo-quien">
                    {esSisvia && <b>{mensaje.empresa_nombre} · </b>}
                    {mensaje.autor_nombre}{mensaje.autor_cargo ? ` · ${mensaje.autor_cargo}` : ""} · {fecha(mensaje.created_at)}
                </p>
                {esSisvia && (
                    <dl className="soporte-hilo-datos">
                        <div><dt>Pantalla</dt><dd>{mensaje.pantalla || "—"}</dd></div>
                        <div><dt>Navegador</dt><dd>{mensaje.navegador || "—"}</dd></div>
                    </dl>
                )}
            </header>

            <ol className="soporte-conversacion" ref={conversacion} onScroll={alDeslizar} tabIndex={0} aria-label="Conversación">
                <li className={`soporte-burbuja ${lado(false)}`}>
                    <span className="soporte-burbuja-autor">{mensaje.autor_nombre} · {fecha(mensaje.created_at)}</span>
                    <p className="soporte-burbuja-texto">{mensaje.mensaje}</p>
                    <Adjunto adjunto={mensaje.adjunto} ruta={`/buzon/${mensaje.id}/adjunto`} />
                </li>
                {mensaje.respuestas.map((r) => (
                    <li key={r.id} className={`soporte-burbuja ${lado(r.de_sisvia)}`}>
                        <span className="soporte-burbuja-autor">
                            {r.de_sisvia ? `${r.autor_nombre} · equipo SISVIA` : r.autor_nombre} · {fecha(r.created_at)}
                        </span>
                        <p className="soporte-burbuja-texto">{r.texto}</p>
                        <Adjunto adjunto={r.adjunto} ruta={`/buzon/${mensaje.id}/respuestas/${r.id}/adjunto`} />
                    </li>
                ))}
            </ol>

            {resuelto ? (
                <div className="soporte-resuelto" role="status">
                    <p>{mensaje.aviso_resuelto}</p>
                    {!esSisvia && (
                        <button type="button" className="soporte-boton soporte-boton--primario" onClick={() => abrirEscribirSisvia()}>
                            Escribir un mensaje nuevo
                        </button>
                    )}
                </div>
            ) : (
                <form className="soporte-responder" onSubmit={responder} noValidate>
                    <label className="soporte-campo">
                        <span className="soporte-label">{esSisvia ? "Responder a la empresa" : "Responder"}</span>
                        <textarea
                            className="soporte-input"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            maxLength={MENSAJE_MAX}
                            rows={3}
                            disabled={enviando}
                        />
                    </label>
                    <div className="soporte-responder-pie">
                        {adjunto ? (
                            <span className="soporte-adjunto-elegido">
                                📎 {adjunto.name} · {tamanoLegible(adjunto.size)}
                                <button type="button" className="soporte-quitar" onClick={() => setAdjunto(null)} disabled={enviando}>Quitar</button>
                            </span>
                        ) : (
                            <label className="soporte-elegir">
                                <input type="file" accept={ADJUNTO_ACEPTA} onChange={elegirAdjunto} disabled={enviando} />
                                Adjuntar (JPG, PNG o PDF, hasta 5 MB)
                            </label>
                        )}
                        <button type="submit" className="soporte-boton soporte-boton--primario" disabled={enviando}>
                            {enviando ? "Enviando..." : "Responder"}
                        </button>
                    </div>
                    {errorRespuesta && <p className="soporte-error" role="alert">{errorRespuesta}</p>}
                </form>
            )}

            {esSisvia && (
                <div className="soporte-hilo-acciones">
                    <button type="button" className="soporte-boton" onClick={verEnLaEmpresa}>
                        Ver en la empresa
                    </button>
                    {!resuelto && (confirmarResuelto ? (
                        <span className="soporte-confirmar">
                            ¿Marcarlo resuelto? Ya nadie podrá responder en este hilo.
                            <button type="button" className="soporte-boton" onClick={() => setConfirmarResuelto(false)} disabled={enviando}>Cancelar</button>
                            <button type="button" className="soporte-boton soporte-boton--primario" onClick={resolver} disabled={enviando}>Sí, resuelto</button>
                        </span>
                    ) : (
                        <button type="button" className="soporte-boton" onClick={() => setConfirmarResuelto(true)}>
                            Marcar como resuelto
                        </button>
                    ))}
                </div>
            )}
        </article>
    );
}

function Soporte() {
    const { usuario } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [recarga, setRecarga] = useState(0);
    const esSisvia = usuario?.rol === "superadmin";

    useEffect(() => {
        let vivo = true;
        api(`/buzon${filtro ? `?estado=${filtro}` : ""}`)
            .then((r) => { if (vivo) { setMensajes(r.mensajes || []); setError(null); } })
            .catch((err) => { if (vivo && !err.sesionExpirada) setError(err.message); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [filtro, recarga]);
    // Alguien escribio, respondio o abrio un nuevo: la bandeja (y el numero del menu) se actualiza.
    useEffect(() => escucharCambioBuzon(() => setRecarga((n) => n + 1)), []);

    useEffect(() => {
        const reloj = setInterval(() => {
            if (document.visibilityState === "visible") setRecarga((n) => n + 1);
        }, 1000);
        return () => clearInterval(reloj);
    }, []);

    const alCambiar = useCallback(() => { avisarCambioBuzon(); }, []);

    // RN-12: el buzon es del equipo SISVIA y del Administrador de empresa. (No se
    // mira si el superadmin entro a una empresa: "Ver en la empresa" entra y navega
    // a la vez, y una redireccion aca le ganaria a esa navegacion.)
    if (usuario && !["superadmin", "admin_empresa"].includes(usuario.rol)) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <AdminLayout titulo="Soporte">
            <div className={`soporte ${id ? "soporte--con-hilo" : ""}`}>
                <div className="soporte-encabezado">
                    <div>
                        <h1 className="soporte-titulo">Soporte</h1>
                        <p className="soporte-subtitulo">
                            {esSisvia ? "Lo que las empresas le escriben al equipo SISVIA." : "Lo que tu empresa le escribió al equipo SISVIA, y sus respuestas."}
                        </p>
                    </div>
                    {!esSisvia && (
                        <button type="button" className="soporte-boton soporte-boton--primario" onClick={() => abrirEscribirSisvia()}>
                            Escribir a SISVIA
                        </button>
                    )}
                </div>

                <div className="soporte-filtros" role="group" aria-label="Filtrar por estado">
                    {FILTROS.map(([valor, texto]) => (
                        <button
                            key={valor || "todos"}
                            type="button"
                            className={`soporte-filtro ${filtro === valor ? "soporte-filtro--activo" : ""}`}
                            aria-pressed={filtro === valor}
                            onClick={() => setFiltro(valor)}
                        >
                            {texto}
                        </button>
                    ))}
                </div>

                <div className="soporte-cuerpo">
                    <section className="soporte-bandeja" aria-label="Mensajes">
                        {cargando ? (
                            <div className="soporte-vacio">Cargando...</div>
                        ) : error ? (
                            <div className="soporte-vacio">{error}</div>
                        ) : mensajes.length === 0 ? (
                            <div className="soporte-vacio">
                                {filtro ? "No hay mensajes con ese estado." : esSisvia ? "Todavía no llegó ningún mensaje." : "Todavía no le escribiste a SISVIA."}
                            </div>
                        ) : (
                            <ul className="soporte-lista">
                                {mensajes.map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            className={`soporte-item ${m.id === id ? "soporte-item--activo" : ""}`}
                                            onClick={() => navigate(`/admin/soporte/${m.id}`)}
                                        >
                                            <span className="soporte-item-arriba">
                                                <span className="soporte-item-tipo">{m.tipo_texto}</span>
                                                <span className={`soporte-estado soporte-estado--${m.estado}`}>{ESTADOS_BUZON[m.estado]}</span>
                                            </span>
                                            <span className="soporte-item-quien">
                                                {esSisvia ? `${m.empresa_nombre} · ${m.autor_nombre}` : m.autor_nombre} · {fecha(m.actualizado_en)}
                                            </span>
                                            <span className="soporte-item-texto">{m.mensaje}</span>
                                            {m.cantidad_respuestas > 0 && (
                                                <span className="soporte-item-respuestas">
                                                    {m.cantidad_respuestas} {m.cantidad_respuestas === 1 ? "respuesta" : "respuestas"}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="soporte-detalle" aria-label="Mensaje abierto">
                        {id ? (
                            <>
                                <button type="button" className="soporte-volver" onClick={() => navigate("/admin/soporte")}>
                                    ← Volver a la bandeja
                                </button>
                                <Hilo key={id} id={id} esSisvia={esSisvia} onCambio={alCambiar} />
                            </>
                        ) : (
                            <div className="soporte-vacio">Elige un mensaje para ver su hilo.</div>
                        )}
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

export default Soporte;
