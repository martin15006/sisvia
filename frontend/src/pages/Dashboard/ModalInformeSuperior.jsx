// Modal para que un admin escale un informe a su superior inmediato (Opción C).
// Le llega al superior por correo + notificación en la campanita.
import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import "./ModalInformeSuperior.css";

function ModalInformeSuperior({ abierto, onCerrar, onEnviado }) {
    const [superior, setSuperior] = useState(null); // { tieneSuperior, etiqueta }
    const [asunto, setAsunto] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [incluirResumen, setIncluirResumen] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!abierto) return;
        api("/escalacion/superior")
            .then((s) => { setSuperior(s); setError(null); })
            .catch(() => setSuperior(null));
    }, [abierto]);

    if (!abierto) return null;

    const enviar = async (e) => {
        e.preventDefault();
        if (!mensaje.trim()) {
            setError("Escribe el mensaje que quieres enviar.");
            return;
        }
        setEnviando(true);
        setError(null);
        try {
            const r = await api("/escalacion/informe", {
                method: "POST",
                body: { asunto, mensaje, incluir_resumen: incluirResumen },
            });
            onEnviado?.(`Informe enviado a ${r.superior || "tu superior"}.`);
            setAsunto("");
            setMensaje("");
            setIncluirResumen(true);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="informe-overlay" onClick={onCerrar}>
            <div className="informe-modal" onClick={(e) => e.stopPropagation()}>
                <div className="informe-header">
                    <h2>📤 Informar a mi superior</h2>
                    <button type="button" className="informe-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
                </div>

                <form onSubmit={enviar} className="informe-body">
                    {superior?.etiqueta && (
                        <p className="informe-destino">
                            Se enviará a <b>{superior.etiqueta}</b> (por correo y en su campanita).
                        </p>
                    )}

                    <label className="informe-label">Asunto</label>
                    <input
                        type="text"
                        className="informe-input"
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        placeholder="Ej: Vehículo no operativo en mi sede"
                        maxLength={120}
                        disabled={enviando}
                    />

                    <label className="informe-label">Mensaje *</label>
                    <textarea
                        className="informe-textarea"
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="Describe lo que quieres informar a tu superior..."
                        rows={5}
                        required
                        disabled={enviando}
                    />

                    <label className="informe-check">
                        <input
                            type="checkbox"
                            checked={incluirResumen}
                            onChange={(e) => setIncluirResumen(e.target.checked)}
                            disabled={enviando}
                        />
                        Incluir un resumen de mi área (vehículos, críticos, no operativos, chequeos de hoy)
                    </label>

                    {error && <div className="informe-error animar-shake">⚠️ {error}</div>}

                    <div className="informe-acciones">
                        <button type="button" className="informe-boton-cancelar" onClick={onCerrar} disabled={enviando}>
                            Cancelar
                        </button>
                        <button type="submit" className="informe-boton-enviar" disabled={enviando}>
                            {enviando ? "Enviando..." : "Enviar informe"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModalInformeSuperior;
