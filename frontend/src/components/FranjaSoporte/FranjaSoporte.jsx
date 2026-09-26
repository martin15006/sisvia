// Franja del superadmin dentro de una empresa (pacto para-empresas, HU-16.1,4).
// Va en el layout del panel y en las pantallas de detalle, para que adentro de
// una empresa siempre se vea donde se esta. Texto exacto del pacto.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { MARCA } from "../../lib/marca.js";
import "./FranjaSoporte.css";

function FranjaSoporte() {
    const { usuario, empresaActiva, salirEmpresa } = useAuth();
    const navigate = useNavigate();
    if (usuario?.rol !== "superadmin" || !empresaActiva) return null;

    return (
        <div className="franja-soporte" role="status">
            <span className="franja-soporte-texto">
                Estás viendo <strong>{empresaActiva.nombre}</strong> como {MARCA.nombre}
            </span>
            <span aria-hidden="true">·</span>
            <button
                type="button"
                className="franja-soporte-salir"
                onClick={() => { salirEmpresa(); navigate("/admin/empresas"); }}
            >
                Salir
            </button>
        </div>
    );
}

export default FranjaSoporte;
