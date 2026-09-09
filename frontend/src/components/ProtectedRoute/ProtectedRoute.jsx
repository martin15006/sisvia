import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { esAdminEfectivo } from "../../lib/roles.js";
import './ProtectedRoute.css';

function ProtectedRoute({ children, soloAdmin = false }) {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return (
            <div className="protected-cargando">
                <div className="protected-spinner"></div>
                <p>Verificando sesión...</p>
            </div>
        );
    }

    // si no esta authenticado redirige al login 
    if (!usuario) {
        return <Navigate to='/login' replace />;
    }

    if (soloAdmin && !esAdminEfectivo(usuario)) {
        return <Navigate to='/dashboard' replace />;
    }

    // si todo esta bien muestra el contenido normal 
    return children;
}

export default ProtectedRoute;