// Cabecera de las pantallas de detalle que no usan el layout del panel
// (detalle del chequeo, del vehiculo y perfil de un usuario). Antes cada una
// tenia la suya, con el titulo viejo "Gestion de Flota" y el rol en crudo.
// Ahora: marca + empresa del usuario (HU-08.1,4), cargo legible y, si el
// superadmin esta dentro de una empresa, la franja de soporte (HU-16.1).
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { MARCA } from "../../lib/marca.js";
import { nombreOrganizacion } from "../../lib/organizacion.js";
import { ETIQUETA_ROL } from "../../lib/roles.js";
import FranjaSoporte from "../FranjaSoporte/FranjaSoporte.jsx";
import "./CabeceraDetalle.css";

function CabeceraDetalle() {
    const { usuario, cerrarSesion, empresaActiva } = useAuth();
    const navigate = useNavigate();
    const organizacion = nombreOrganizacion(usuario, empresaActiva);

    const salir = () => {
        cerrarSesion();
        navigate("/login");
    };

    return (
        <>
            <header className="cabecera-detalle">
                <div className="cabecera-detalle-marca">
                    <img src={MARCA.logo} alt={MARCA.nombre} className="cabecera-detalle-logo" />
                    <div className="cabecera-detalle-textos">
                        <div className="cabecera-detalle-producto">{MARCA.nombre}</div>
                        <div className="cabecera-detalle-org" title={organizacion}>{organizacion}</div>
                    </div>
                </div>
                <div className="cabecera-detalle-usuario">
                    <div className="cabecera-detalle-usuario-info">
                        <div className="cabecera-detalle-usuario-nombre">{usuario?.nombre_completo}</div>
                        <div className="cabecera-detalle-usuario-rol">{ETIQUETA_ROL[usuario?.rol] || usuario?.rol}</div>
                    </div>
                    <button type="button" className="cabecera-detalle-salir" onClick={salir}>
                        Cerrar sesión
                    </button>
                </div>
            </header>
            <FranjaSoporte />
        </>
    );
}

export default CabeceraDetalle;
