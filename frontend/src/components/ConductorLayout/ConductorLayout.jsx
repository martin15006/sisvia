// Layout reutilizable para las pantallas del conductor.
// Mucho mas simple que el AdminLayout porque el conductor NO tiene sidebar:
// su flujo es lineal y guiado (dashboard -> aptitud -> vehiculo -> checklist -> resultado).
//
// Lo que provee:
//   - Header sticky con logo + nombre del conductor + boton "Cerrar sesion"
//   - Contenido principal con max-width controlado (legible en celular y desktop)
//   - Footer institucional al final
//
// Uso:
//   <ConductorLayout>
//     <div>contenido de la pantalla</div>
//   </ConductorLayout>

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { etiquetaCargoCorta } from "../../lib/roles.js";
import { MARCA } from "../../lib/marca.js";
import Footer from "../Footer/Footer.jsx";
import ToggleTema from "../ToggleTema/ToggleTema.jsx";
import "./ConductorLayout.css";

function ConductorLayout({ children }) {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const cerrar = () => {
        cerrarSesion();
        navigate("/login");
    };

    if (!usuario) return null;

    return (
        <div className="cond-layout">
            <header className="cond-layout-header">
                <div className="cond-layout-logo-wrapper">
                    <img
                        src="/logo.png"
                        alt="SISVIA"
                        className="cond-layout-logo"
                    />
                    <div className="cond-layout-titulo-app">{MARCA.nombre}</div>
                </div>

                <div className="cond-layout-acciones">
                    <ToggleTema />
                    <div className="cond-layout-usuario">
                        <div className="cond-layout-usuario-nombre">
                            {usuario.nombre_completo?.split(" ")[0]}
                        </div>
                        {/* Tipo: "Pool" si es del pool de transporte, si no "Conductor". */}
                        <div className={`cond-layout-usuario-rol${usuario.es_pool ? " cond-layout-usuario-rol-pool" : ""}`}>
                            {etiquetaCargoCorta(usuario)}
                        </div>
                    </div>
                    <button
                        className="cond-layout-cerrar"
                        onClick={cerrar}
                        title="Cerrar sesión"
                        aria-label="Cerrar sesión"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span className="cond-layout-cerrar-texto">Cerrar sesión</span>
                    </button>
                </div>
            </header>

            <main className="cond-layout-main">{children}</main>

            <Footer />
        </div>
    );
}

export default ConductorLayout;
