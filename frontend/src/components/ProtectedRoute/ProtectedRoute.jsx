import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { esAdminEfectivo } from "../../lib/roles.js";
import './ProtectedRoute.css';

function ProtectedRoute({ children, soloAdmin = false }) {
    const { usuario, cargando, salioPorSuCuenta } = useAuth();
    const { pathname } = useLocation();

    if (cargando) {
        return (
            <div className="protected-cargando">
                <div className="protected-spinner"></div>
                <p>Verificando sesión...</p>
            </div>
        );
    }

    // si no esta authenticado redirige al login 
    // HU-01.7 (portada-publica, enmienda 1): quien cerro sesion va a la portada; a quien
    // lo sacaron (sesion vencida, desactivado) o nunca entro, al login.
    if (!usuario) {
        return <Navigate to={salioPorSuCuenta ? '/' : '/login'} replace />;
    }

    // Contraseña temporal: hasta cambiarla no entra a ningun modulo, aunque ya
    // tenga la sesion abierta o recargue la pagina (antes solo lo exigia el login).
    if (usuario.debe_cambiar_password && pathname !== "/cambiar-password") {
        return <Navigate to="/cambiar-password" replace />;
    }

    if (soloAdmin && !esAdminEfectivo(usuario)) {
        return <Navigate to='/dashboard' replace />;
    }

    // si todo esta bien muestra el contenido normal 
    return children;
}

export default ProtectedRoute;