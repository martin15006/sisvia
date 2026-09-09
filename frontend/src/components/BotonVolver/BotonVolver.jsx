// Boton prominente de "Volver al listado" para paginas de detalle (Bloque B Fase 4).
// Estas paginas (VehiculoDetalle, ChequeoDetalle, PerfilUsuario) NO tienen el sidebar
// del AdminLayout — el botón es la unica forma rapida de volver al listado padre.
//
// Uso:
//   <BotonVolver a="/admin/vehiculos" texto="Volver a vehículos" />

import { useNavigate } from "react-router-dom";
import "./BotonVolver.css";

function BotonVolver({ a, texto = "Volver" }) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="boton-volver"
            onClick={() => navigate(a)}
            title={texto}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{texto}</span>
        </button>
    );
}

export default BotonVolver;
