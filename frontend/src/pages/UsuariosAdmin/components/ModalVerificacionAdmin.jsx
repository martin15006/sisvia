// Modal reutilizable para cambiar campos sensibles del usuario (correo y cedula).
// Pide el nuevo valor + la contrasena del admin actual antes de aplicar el cambio.
// Usa el mismo patron para ambos casos cambiando solo la configuracion.

import { useEffect, useRef, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import InputPassword from "../../../components/InputPassword/InputPassword.jsx";
import { api } from "../../../lib/api.js";
import "./ModalVerificacionAdmin.css";

// Mantener los filtros del lado del cliente para que solo se pueda escribir lo valido.
const soloDigitos = (texto) => (texto || "").replace(/\D/g, "");

function ModalVerificacionAdmin({
    abierto,
    onCerrar,
    tipo,             // "correo" | "cedula"
    usuario,          // { id, nombre_completo, email, cedula }
    onCambiado,       // callback(mensaje, nuevoValor) al exito
}) {
    const [nuevoValor, setNuevoValor] = useState("");
    const [passwordAdmin, setPasswordAdmin] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);
    // Aviso temporal cuando se intenta escribir un caracter no permitido (mismo
    // patron que ModalCrear/Editar Usuario). Solo aplica al cambio de cedula.
    const [aviso, setAviso] = useState(null);
    const timerAviso = useRef(null);

    const mostrarAviso = (mensaje) => {
        if (timerAviso.current) clearTimeout(timerAviso.current);
        setAviso(mensaje);
        timerAviso.current = setTimeout(() => {
            setAviso(null);
            timerAviso.current = null;
        }, 2500);
    };

    // Resetear al abrir/cerrar
    useEffect(() => {
        if (abierto) {
            setNuevoValor("");
            setPasswordAdmin("");
            setError(null);
            setAviso(null);
            if (timerAviso.current) {
                clearTimeout(timerAviso.current);
                timerAviso.current = null;
            }
        }
    }, [abierto, usuario]);

    if (!usuario) return null;

    // Configuracion segun el tipo de cambio
    const config = tipo === "correo"
        ? {
            titulo: "Cambiar correo electrónico",
            labelActual: "Correo actual",
            valorActual: usuario.email || "(sin correo)",
            labelNuevo: "Nuevo correo electrónico",
            inputType: "email",
            inputMode: "email",
            placeholder: "nuevo@correo.com",
            endpoint: `/usuarios/${usuario.id}/cambiar-correo`,
            bodyKey: "nuevo_correo",
            filtrar: (v) => v,
            esCritico: false,
        }
        : {
            titulo: "Cambiar cédula del usuario",
            labelActual: "Cédula actual",
            valorActual: usuario.cedula || "(sin cédula)",
            labelNuevo: "Nueva cédula",
            inputType: "text",
            inputMode: "numeric",
            placeholder: "Solo números",
            endpoint: `/usuarios/${usuario.id}/cambiar-cedula`,
            bodyKey: "nueva_cedula",
            filtrar: soloDigitos,
            esCritico: true,
        };

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);

        if (!nuevoValor.trim()) {
            setError(`Ingresa el ${tipo === "correo" ? "nuevo correo" : "nueva cédula"}`);
            return;
        }
        if (!passwordAdmin.trim()) {
            setError("Ingresa tu contraseña de administrador");
            return;
        }

        setEnviando(true);
        try {
            const valorLimpio = nuevoValor.trim();
            const resp = await api(config.endpoint, {
                method: "POST",
                body: {
                    [config.bodyKey]: valorLimpio,
                    password_admin: passwordAdmin,
                },
            });
            // Devolvemos tambien el valor nuevo para que el modal padre pueda
            // refrescar el campo en pantalla sin esperar a cerrarse y reabrirse.
            onCambiado(resp.mensaje || "Cambio aplicado correctamente", valorLimpio);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) {
                setError(err.message);
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            onCerrar={enviando ? () => {} : onCerrar}
            titulo={config.titulo}
            ancho="mediano"
        >
            <form className="verifadmin-form" onSubmit={enviar}>
                <div className="verifadmin-usuario">
                    <div className="verifadmin-usuario-label">Cambiando datos de:</div>
                    <div className="verifadmin-usuario-nombre">{usuario.nombre_completo}</div>
                </div>

                {config.esCritico && (
                    <div className="verifadmin-aviso-critico">
                        La cédula es el documento de identidad oficial del usuario.
                        Asegúrate de tener el documento físico a la vista antes de confirmar.
                    </div>
                )}

                <div className="verifadmin-campo">
                    <label className="verifadmin-label">{config.labelActual}</label>
                    <input
                        type="text"
                        className="verifadmin-input verifadmin-input-readonly"
                        value={config.valorActual}
                        disabled
                    />
                </div>

                <div className="verifadmin-campo">
                    <label className="verifadmin-label">{config.labelNuevo} *</label>
                    <input
                        type={config.inputType}
                        inputMode={config.inputMode}
                        className="verifadmin-input"
                        value={nuevoValor}
                        onChange={(e) => {
                            const valorRaw = e.target.value;
                            const valorFiltrado = config.filtrar(valorRaw);
                            // Si el filtro eliminó caracteres, mostramos un aviso temporal
                            // para que el usuario entienda por qué no se escribió lo que tipeó.
                            if (valorFiltrado.length < valorRaw.length && tipo === "cedula") {
                                mostrarAviso("Solo se permiten números");
                            }
                            setNuevoValor(valorFiltrado);
                        }}
                        placeholder={config.placeholder}
                        required
                        disabled={enviando}
                        autoFocus
                    />
                    {aviso && (
                        <small className="verifadmin-aviso-validacion">{aviso}</small>
                    )}
                </div>

                <div className="verifadmin-campo verifadmin-campo-password">
                    <label className="verifadmin-label">
                        Tu contraseña de administrador *
                    </label>
                    <InputPassword
                        className="verifadmin-input"
                        value={passwordAdmin}
                        onChange={(e) => setPasswordAdmin(e.target.value)}
                        placeholder="Contraseña actual"
                        required
                        disabled={enviando}
                    />
                    <small className="verifadmin-hint">
                        Por seguridad, debes confirmar tu identidad antes de aplicar cambios sensibles.
                    </small>
                </div>

                {error && (
                    <div className="verifadmin-error">{error}</div>
                )}

                <div className="verifadmin-acciones">
                    <button
                        type="button"
                        className="verifadmin-boton verifadmin-boton-cancelar"
                        onClick={onCerrar}
                        disabled={enviando}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={`verifadmin-boton ${
                            config.esCritico
                                ? "verifadmin-boton-confirmar-critico"
                                : "verifadmin-boton-confirmar"
                        }`}
                        disabled={enviando}
                    >
                        {enviando ? "Aplicando..." : `Confirmar cambio`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default ModalVerificacionAdmin;
