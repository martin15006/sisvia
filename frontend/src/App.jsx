import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoutes from "./components/ProtectedRoute/ProtectedRoute.jsx";
import Login from "./pages/Login/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import UsuariosAdmin from "./pages/UsuariosAdmin/UsuariosAdmin.jsx";
import PerfilUsuario from "./pages/PerfilUsuario/PerfilUsuario.jsx";
import MiPerfil from "./pages/MiPerfil/MiPerfil.jsx";
import Ajustes from "./pages/Ajustes/Ajustes.jsx";
import Notificaciones from "./pages/Notificaciones/Notificaciones.jsx";
import VehiculosAdmin from "./pages/VehiculosAdmin/VehiculosAdmin.jsx";
import VehiculoDetalle from "./pages/VehiculoDetalle/VehiculoDetalle.jsx";
import CambiarPassword from "./pages/CambiarPassword/CambiarPassword.jsx";
import ConductorDashboard from "./pages/Conductor/ConductorDashboard.jsx";
import ChequeoAptitud from "./pages/Conductor/ChequeoAptitud.jsx";
import SeleccionVehiculo from "./pages/Conductor/SeleccionVehiculo.jsx";
import ChequeoItems from "./pages/Conductor/ChequeoItems.jsx";
import ChequeoResultado from "./pages/Conductor/ChequeoResultado.jsx";
import CatalogoAdmin from "./pages/CatalogoAdmin/CatalogoAdmin.jsx";
import ChequeosAdmin from "./pages/ChequeosAdmin/ChequeosAdmin.jsx";
import ChequeoDetalle from "./pages/ChequeoDetalle/ChequeoDetalle.jsx";
import IntentosBloqueados from "./pages/IntentosBloqueados/IntentosBloqueados.jsx";
import GeografiaAdmin from "./pages/GeografiaAdmin/GeografiaAdmin.jsx";
import ActividadPool from "./pages/ActividadPool/ActividadPool.jsx";
import SelectorSedeSuplencia from "./pages/SelectorSedeSuplencia/SelectorSedeSuplencia.jsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path='/' element={<Navigate to='/login' replace />} />
                    <Route path='/login' element={<Login />} />

                    <Route path='/cambiar-password' element={
                        <ProtectedRoutes>
                            <CambiarPassword />
                        </ProtectedRoutes>
                    } />

                    <Route path='/dashboard' element={
                        <ProtectedRoutes>
                            <Dashboard />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/usuarios" element={
                        <ProtectedRoutes>
                            <UsuariosAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/mi-perfil" element={
                        <ProtectedRoutes>
                            <MiPerfil />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/ajustes" element={
                        <ProtectedRoutes>
                            <Ajustes />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/notificaciones" element={
                        <ProtectedRoutes>
                            <Notificaciones />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/geografia" element={
                        <ProtectedRoutes>
                            <GeografiaAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/usuarios/:id" element={
                        <ProtectedRoutes>
                            <PerfilUsuario />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/actividad-pool/:poolId" element={
                        <ProtectedRoutes>
                            <ActividadPool />
                        </ProtectedRoutes>
                    } />

                    <Route path="/suplencia/sedes" element={
                        <ProtectedRoutes>
                            <SelectorSedeSuplencia />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/vehiculos" element={
                        <ProtectedRoutes>
                            <VehiculosAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/vehiculos/:id" element={
                        <ProtectedRoutes>
                            <VehiculoDetalle />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/catalogo" element={
                        <ProtectedRoutes>
                            <CatalogoAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/chequeos" element={
                        <ProtectedRoutes>
                            <ChequeosAdmin />
                        </ProtectedRoutes>
                    } />

                    {/* La ruta estática debe ir antes de la :id para evitar conflictos */}
                    <Route path="/admin/chequeos/intentos-bloqueados" element={
                        <ProtectedRoutes>
                            <IntentosBloqueados />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/chequeos/:id" element={
                        <ProtectedRoutes>
                            <ChequeoDetalle />
                        </ProtectedRoutes>
                    } />

                    <Route path="/conductor" element={
                        <ProtectedRoutes>
                            <ConductorDashboard />
                        </ProtectedRoutes>
                    } />

                    <Route path="/conductor/chequeo/aptitud" element={
                        <ProtectedRoutes>
                            <ChequeoAptitud />
                        </ProtectedRoutes>
                    } />

                    <Route path="/conductor/chequeo/vehiculo" element={
                        <ProtectedRoutes>
                            <SeleccionVehiculo />
                        </ProtectedRoutes>
                    } />

                    <Route path="/conductor/chequeo/items" element={
                        <ProtectedRoutes>
                            <ChequeoItems />
                        </ProtectedRoutes>
                    } />

                    <Route path="/conductor/chequeo/resultado" element={
                        <ProtectedRoutes>
                            <ChequeoResultado />
                        </ProtectedRoutes>
                    } />

                    <Route path='*' element={<Navigate to='/login' replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;