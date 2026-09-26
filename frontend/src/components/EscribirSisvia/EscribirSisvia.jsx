// HU-18.1-3: "Escribir a SISVIA" en la barra de arriba, en todas las pantallas del
// Administrador de empresa. Guarda desde que pantalla se escribio (para que el
// equipo SISVIA la abra con "Ver en la empresa", HU-18.7).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "../Modal/Modal.jsx";
import { apiArchivo } from "../../lib/api.js";
import {
    TIPOS_BUZON, MENSAJE_MAX, ADJUNTO_ACEPTA, TEXTO_ADJUNTO_INVALIDO, adjuntoValido, tamanoLegible,
    escucharEscribirSisvia, avisarCambioBuzon,
} from "../../lib/buzon.js";
import "./EscribirSisvia.css";

const VACIO = { tipo: "", mensaje: "", adjunto: null };

function EscribirSisvia() {
    const location = useLocation();
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [form, setForm] = useState(VACIO);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(null); // { id, aviso }

    const abrir = (detalle = {}) => {
        setForm({ ...VACIO, tipo: detalle.tipo || "", mensaje: detalle.mensaje || "" });
        setError(null);
        setEnviado(null);
        setAbierto(true);
    };
    // HU-18.9: los avisos de limite y de placa lo abren con el tipo ya elegido.
    useEffect(() => escucharEscribirSisvia(abrir), []);

    const cerrar = () => { if (!enviando) setAbierto(false); };

    const elegirAdjunto = (e) => {
        const archivo = e.target.files?.[0] || null;
        e.target.value = "";
        if (archivo && !adjuntoValido(archivo)) {
            setError(TEXTO_ADJUNTO_INVALIDO);
            return;
        }
        setError(null);
        setForm((f) => ({ ...f, adjunto: archivo }));
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (!form.tipo) return setError("Elige qué tipo de mensaje es.");
        if (!form.mensaje.trim()) return setError("Escribe el mensaje.");
        setEnviando(true);
        setError(null);
        try {
            const datos = new FormData();
            datos.append("tipo", form.tipo);
            datos.append("mensaje", form.mensaje);
            datos.append("pantalla", `${location.pathname}${location.search}`);
            if (form.adjunto) datos.append("adjunto", form.adjunto);
            const r = await apiArchivo("/buzon", datos);
            setEnviado({ id: r.mensaje.id, aviso: r.aviso });
            avisarCambioBuzon();
        } catch (err) {
            if (!err.sesionExpirada && !err.cuentaDesactivada) setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <button type="button" className="escribir-sisvia-boton" onClick={() => abrir()} title="Escribirle al equipo SISVIA">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="escribir-sisvia-boton-texto">Escribir a SISVIA</span>
            </button>

            {/* En un portal: el boton vive en la barra de arriba (sticky, con su propio
                z-index) y adentro de ella el modal no podria quedar sobre otro modal.
                encima: tambien se abre desde el formulario de un vehiculo o de una sede (HU-18.9). */}
            {createPortal(<Modal abierto={abierto} onCerrar={cerrar} titulo={enviado ? "Mensaje enviado" : "Escribir a SISVIA"} ancho="mediano" encima>
                {enviado ? (
                    <div className="escribir-sisvia">
                        <p className="escribir-sisvia-exito" role="status">{enviado.aviso}</p>
                        <div className="escribir-sisvia-acciones">
                            <button type="button" className="escribir-sisvia-accion" onClick={cerrar}>Cerrar</button>
                            <button
                                type="button"
                                className="escribir-sisvia-accion escribir-sisvia-accion--primaria"
                                onClick={() => { setAbierto(false); navigate(`/admin/soporte/${enviado.id}`); }}
                            >
                                Ver en Soporte
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="escribir-sisvia" onSubmit={enviar} noValidate>
                        <p className="escribir-sisvia-ayuda">
                            Le llega al equipo SISVIA. Si es algo que falla, cuéntanos qué hacías: sabremos desde qué pantalla escribiste.
                        </p>
                        <label className="escribir-sisvia-campo">
                            <span className="escribir-sisvia-label">¿Qué pasa?</span>
                            <select
                                className="escribir-sisvia-input"
                                value={form.tipo}
                                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                                disabled={enviando}
                            >
                                <option value="">— Elige una opción —</option>
                                {TIPOS_BUZON.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                            </select>
                        </label>
                        <label className="escribir-sisvia-campo">
                            <span className="escribir-sisvia-label">Mensaje</span>
                            <textarea
                                className="escribir-sisvia-input escribir-sisvia-texto"
                                value={form.mensaje}
                                onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                                maxLength={MENSAJE_MAX}
                                rows={6}
                                disabled={enviando}
                            />
                            <span className="escribir-sisvia-contador">{form.mensaje.length} de {MENSAJE_MAX.toLocaleString("es-CO")} caracteres</span>
                        </label>
                        <div className="escribir-sisvia-campo">
                            <span className="escribir-sisvia-label">Adjunto (opcional)</span>
                            {form.adjunto ? (
                                <div className="escribir-sisvia-archivo">
                                    <span className="escribir-sisvia-archivo-nombre">{form.adjunto.name} · {tamanoLegible(form.adjunto.size)}</span>
                                    <button type="button" className="escribir-sisvia-quitar" onClick={() => setForm((f) => ({ ...f, adjunto: null }))} disabled={enviando}>
                                        Quitar
                                    </button>
                                </div>
                            ) : (
                                <label className="escribir-sisvia-elegir">
                                    <input type="file" accept={ADJUNTO_ACEPTA} onChange={elegirAdjunto} disabled={enviando} />
                                    Elegir una captura (JPG o PNG) o un PDF, de hasta 5 MB
                                </label>
                            )}
                        </div>
                        {error && <p className="escribir-sisvia-error" role="alert">{error}</p>}
                        <div className="escribir-sisvia-acciones">
                            <button type="button" className="escribir-sisvia-accion" onClick={cerrar} disabled={enviando}>Cancelar</button>
                            <button type="submit" className="escribir-sisvia-accion escribir-sisvia-accion--primaria" disabled={enviando}>
                                {enviando ? "Enviando..." : "Enviar"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>, document.body)}
        </>
    );
}

export default EscribirSisvia;
