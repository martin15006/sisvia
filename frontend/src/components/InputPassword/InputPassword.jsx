// Componente reutilizable: input de contraseña con boton de "ojo" para
// mostrar/ocultar el texto. Usado en Login, CambiarPassword y
// ModalVerificacionAdmin. La convencion es:
//   - Ojo ABIERTO  -> la contraseña esta visible ahora mismo
//   - Ojo TACHADO  -> la contraseña esta oculta ahora mismo
//
// API: acepta las mismas props que un <input> normal (value, onChange,
// placeholder, required, disabled, autoFocus, id, name, etc) + una prop
// adicional `className` que se aplica al <input> interno para que cada
// pantalla pueda mantener su propio estilo visual.

import { useState } from "react";
import "./InputPassword.css";

// SVG inline: ojo abierto (la contraseña esta visible)
const IconoOjoAbierto = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// SVG inline: ojo tachado (la contraseña esta oculta)
const IconoOjoTachado = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

function InputPassword({ className = "", disabled, ...inputProps }) {
    const [mostrar, setMostrar] = useState(false);

    return (
        <div className="input-password-wrapper">
            <input
                {...inputProps}
                type={mostrar ? "text" : "password"}
                disabled={disabled}
                // El padding-right viene de input-password-input para dejar
                // espacio al boton del ojo, asi no tapa el texto del usuario.
                className={`${className} input-password-input`}
            />
            <button
                type="button"
                className="input-password-boton-ojo"
                onClick={() => setMostrar((v) => !v)}
                disabled={disabled}
                title={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={mostrar}
            >
                {mostrar ? <IconoOjoAbierto /> : <IconoOjoTachado />}
            </button>
        </div>
    );
}

export default InputPassword;
