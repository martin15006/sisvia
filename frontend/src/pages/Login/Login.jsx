import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Toast from '../../components/Toast/Toast.jsx';
import InputPassword from '../../components/InputPassword/InputPassword.jsx';
import { MARCA } from '../../lib/marca.js';
import './Login.css';

function Login() {
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    // tipoError: "credenciales" (rojo, error de validacion) | "cuenta_desactivada" (naranja, asunto admin)
    const [tipoError, setTipoError] = useState("credenciales");
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState(null);
    const { iniciarSesion, sesionExpirada, mensajeSalida, consumirSesionExpirada } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (sesionExpirada) {
            setToast({
                mensaje: mensajeSalida || "Tu sesión expiró. Vuelve a iniciar sesión.",
                tipo: "advertencia",
                key: Date.now(),
            });
            consumirSesionExpirada();
        }
    }, [sesionExpirada, mensajeSalida, consumirSesionExpirada]);

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setTipoError("credenciales");
        setCargando(true);

        try {
            const usuario = await iniciarSesion(identificador, password);

            if (usuario.debe_cambiar_password) {
                navigate('/cambiar-password');
            } else if (usuario.rol === 'conductor') {
                navigate('/conductor');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            // 403 → cuenta desactivada; 429 → bloqueada por intentos fallidos.
            // Ambos son "asunto de seguridad", no un typo: estilo de advertencia
            // (naranja con candado) en vez del error rojo de credenciales.
            if (err.status === 403 || err.status === 429) {
                setTipoError("cuenta_desactivada");
            } else {
                setTipoError("credenciales");
            }
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-pagina">
            <div className="login-fondo">
                <div className="login-formas"></div>
            </div>

            <div className="login-tarjeta animar-fade-in-up">
                <div className="login-cabecera">
                    <img src={MARCA.logo} alt={MARCA.nombre} className="login-logo-img" />
                    <div className="login-logo-texto">{MARCA.nombre}</div>
                    <h1 className="login-titulo">Iniciar sesión</h1>
                    <p className="login-subtitulo">{MARCA.lema}</p>
                </div>

                <form className="login-form" onSubmit={manejarSubmit}>
                    <div className="login-campo">
                        <label htmlFor='identificador' className="login-label">
                            Correo o cédula
                        </label>
                        <input
                            id='identificador'
                            type='text'
                            className="login-input"
                            value={identificador}
                            onChange={(e) => setIdentificador(e.target.value)}
                            placeholder="ejemplo@correo.com o 1234567890"
                            required
                            autoFocus
                            disabled={cargando}
                        />
                    </div>

                    <div className="login-campo">
                        <label htmlFor="password" className="login-label">
                            Contraseña
                        </label>
                        <InputPassword
                            id='password'
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={cargando}
                        />
                    </div>

                    {error && (
                        <div
                            className={
                                tipoError === "cuenta_desactivada"
                                    ? "login-error login-error-advertencia"
                                    : "login-error animar-shake"
                            }
                        >
                            {tipoError === "cuenta_desactivada" && (
                                <span className="login-error-icono">🔒</span>
                            )}
                            {error}
                        </div>
                    )}
                    <button
                        type='submit'
                        className="login-boton"
                        disabled={cargando || !identificador || !password}
                    >
                        {cargando ? (
                            <span className="login-spinner"></span>
                        ) : (
                            'Iniciar sesión'
                        )}
                    </button>
                </form>
            </div>

            {toast && (
                <Toast
                    key={toast.key}
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={5000}
                    onCerrar={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default Login;