// HU-17.2: el equipo SISVIA, dentro de una empresa, da de baja un vehiculo por
// traspaso. Pide el motivo; la contraseña la pide api.js (RN-11) al enviar.
import { useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import "./ModalBajaVehiculo.css";

const MOTIVO_MAX = 500;

function ModalBajaVehiculo({ vehiculo, empresa, onCerrar, onHecho }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const cerrar = () => {
        if (guardando) return;
        setMotivo("");
        setError(null);
        onCerrar();
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (!motivo.trim()) {
            setError("Escribe el motivo de la baja.");
            return;
        }
        setGuardando(true);
        setError(null);
        try {
            await api(`/vehiculos/${vehiculo.id}/baja`, { method: "PATCH", body: { motivo: motivo.trim() } });
            setMotivo("");
            onHecho(vehiculo);
        } catch (err) {
            if (!err.cancelado) setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={!!vehiculo} onCerrar={cerrar} titulo={`Dar de baja por traspaso · ${vehiculo?.placa || ""}`} ancho="pequeno">
            {vehiculo && (
                <form className="baja-vehiculo" onSubmit={enviar} noValidate>
                    <p className="baja-vehiculo-texto">
                        El vehículo sale de la flota de <b>{empresa || "la empresa"}</b>, que conserva sus chequeos,
                        y la placa queda libre para que la registre la empresa que lo compró. <b>No se puede deshacer.</b>
                    </p>
                    <label className="baja-vehiculo-campo">
                        <span className="baja-vehiculo-label">Motivo</span>
                        <textarea
                            className={`baja-vehiculo-input${error ? " baja-vehiculo-input--error" : ""}`}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            maxLength={MOTIVO_MAX}
                            rows={4}
                            placeholder="Ej.: vendido a Transportes del Norte; lo verificamos con la tarjeta de propiedad."
                            aria-invalid={!!error}
                            autoFocus
                        />
                        <span className="baja-vehiculo-ayuda">{motivo.length} de {MOTIVO_MAX} caracteres</span>
                    </label>
                    {error && <p className="baja-vehiculo-error" role="alert">{error}</p>}
                    <div className="baja-vehiculo-acciones">
                        <button type="button" className="baja-vehiculo-boton" onClick={cerrar} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="baja-vehiculo-boton baja-vehiculo-boton--peligro" disabled={guardando}>
                            {guardando ? "Dando de baja..." : "Dar de baja"}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default ModalBajaVehiculo;
