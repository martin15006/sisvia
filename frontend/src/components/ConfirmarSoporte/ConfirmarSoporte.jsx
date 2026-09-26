// Pide la contraseña del superadmin antes de un cambio dentro de una empresa
// (pacto para-empresas, HU-16.2-3 · RN-11). Lo abre el helper `api` con el
// evento "soporte:pedir-password" (ver lib/confirmarSoporte.js). Va montado una
// sola vez, en App.
import { useEffect, useRef, useState } from "react";
import Modal from "../Modal/Modal.jsx";
import InputPassword from "../InputPassword/InputPassword.jsx";
import { MARCA } from "../../lib/marca.js";
import "./ConfirmarSoporte.css";

function ConfirmarSoporte() {
    const [pedido, setPedido] = useState(null); // { accion, empresa, error, responder }
    const [password, setPassword] = useState("");
    const responderRef = useRef(null);

    useEffect(() => {
        const abrir = (e) => {
            // Si habia otro pedido abierto, se da por cancelado.
            responderRef.current?.(null);
            responderRef.current = e.detail.responder;
            setPedido(e.detail);
            setPassword("");
        };
        window.addEventListener("soporte:pedir-password", abrir);
        return () => window.removeEventListener("soporte:pedir-password", abrir);
    }, []);

    const cerrar = (valor) => {
        responderRef.current?.(valor);
        responderRef.current = null;
        setPedido(null);
        setPassword("");
    };

    const confirmar = (e) => {
        e.preventDefault();
        if (password && !pedido?.bloqueado) cerrar(password);
    };

    return (
        <Modal abierto={!!pedido} onCerrar={() => cerrar(null)} titulo="Confirma con tu contraseña" ancho="pequeno" encima>
            {pedido && (
                <form className="confirmar-soporte" onSubmit={confirmar}>
                    <p className="confirmar-soporte-texto">
                        Vas a <strong>{pedido.accion || "hacer un cambio"}</strong>
                        {pedido.empresa ? <> en <strong>{pedido.empresa}</strong></> : null}, como {MARCA.nombre}.
                        Queda registrado con tu nombre.
                    </p>
                    <label className="confirmar-soporte-label" htmlFor="confirmar-soporte-password">
                        Tu contraseña
                    </label>
                    <InputPassword
                        id="confirmar-soporte-password"
                        className="confirmar-soporte-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        disabled={pedido.bloqueado}
                        aria-invalid={!!pedido.error}
                        aria-describedby={pedido.error ? "confirmar-soporte-error" : undefined}
                    />
                    {pedido.error && (
                        <p className="confirmar-soporte-error" id="confirmar-soporte-error" role="alert">
                            {pedido.error}
                        </p>
                    )}
                    <div className="confirmar-soporte-acciones">
                        <button type="button" className="confirmar-soporte-boton" onClick={() => cerrar(null)}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="confirmar-soporte-boton confirmar-soporte-boton--primario"
                            disabled={!password || pedido.bloqueado}
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default ConfirmarSoporte;
