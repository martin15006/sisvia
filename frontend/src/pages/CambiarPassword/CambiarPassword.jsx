import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import InputPassword from "../../components/InputPassword/InputPassword.jsx";
import "./CambiarPassword.css";

function CambiarPassword() {
  const { usuario, cargando } = useAuth();
  const navigate = useNavigate();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Mientras AuthContext valida
  if (cargando) return null;

  // Si no esta autenticado, al login
  if (!usuario) return <Navigate to="/login" replace />;

  const esPrimerLogin = usuario.debe_cambiar_password === true;

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const body = {
        password_nueva: passwordNueva,
        password_confirmacion: passwordConfirmacion,
      };
      if (!esPrimerLogin) {
        body.password_actual = passwordActual;
      }

      const resp = await api("/auth/cambiar-password", {
        method: "POST",
        body,
      });

      // IMPORTANTE: Supabase Auth invalida el token actual al cambiar la contraseña.
      // El backend devuelve un nuevo token (signInWithPassword con la clave nueva)
      // para que el usuario siga la navegacion sin tener que volver al login.
      if (resp.token) {
        localStorage.setItem("token", resp.token);
      } else if (resp.requiere_relogin) {
        // Edge case raro: el cambio funciono pero no se pudo emitir token nuevo
        localStorage.removeItem("token");
        setExito(true);
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      setExito(true);
      // Esperar 1.5s para que el usuario vea el mensaje y luego redirigir
      // Conductor va a /conductor, todos los admins a /dashboard
      const destino = usuario.rol === "conductor" ? "/conductor" : "/dashboard";
      setTimeout(() => navigate(destino), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="cambiar-pass-pagina">
      <div className="cambiar-pass-fondo">
        <div className="cambiar-pass-formas"></div>
      </div>

      <div className="cambiar-pass-tarjeta animar-fade-in-up">
        <div className="cambiar-pass-cabecera">
          <img
            src="/logo.png"
            alt="SISVIA"
            className="cambiar-pass-logo"
          />
          <h1 className="cambiar-pass-titulo">Cambia tu contraseña</h1>
          <p className="cambiar-pass-subtitulo">
            {esPrimerLogin
              ? "Por seguridad, debes definir una nueva contraseña antes de continuar."
              : "Actualiza tu contraseña. Te pediremos la actual como verificación."}
          </p>
        </div>

        {exito ? (
          <div className="cambiar-pass-exito animar-fade-in">
            <div className="cambiar-pass-exito-icono">✓</div>
            <p>Contraseña actualizada correctamente</p>
            <p className="cambiar-pass-exito-sub">Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <form className="cambiar-pass-form" onSubmit={enviar}>
            {!esPrimerLogin && (
              <div className="cambiar-pass-campo">
                <label className="cambiar-pass-label">Contraseña actual</label>
                <InputPassword
                  className="cambiar-pass-input"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  required
                  autoFocus
                  disabled={enviando}
                />
              </div>
            )}

            <div className="cambiar-pass-campo">
              <label className="cambiar-pass-label">Nueva contraseña</label>
              <InputPassword
                className="cambiar-pass-input"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                required
                autoFocus={esPrimerLogin}
                disabled={enviando}
                minLength={8}
              />
              <p className="cambiar-pass-hint">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="cambiar-pass-campo">
              <label className="cambiar-pass-label">Confirmar nueva contraseña</label>
              <InputPassword
                className="cambiar-pass-input"
                value={passwordConfirmacion}
                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                required
                disabled={enviando}
                minLength={8}
              />
              {passwordNueva &&
                passwordConfirmacion &&
                passwordNueva !== passwordConfirmacion && (
                  <p className="cambiar-pass-hint cambiar-pass-hint-error">
                    Las contraseñas no coinciden
                  </p>
                )}
            </div>

            {error && (
              <div className="cambiar-pass-error animar-shake">⚠️ {error}</div>
            )}

            <button
              type="submit"
              className="cambiar-pass-boton"
              disabled={
                enviando ||
                (!esPrimerLogin && !passwordActual) ||
                !passwordNueva ||
                !passwordConfirmacion ||
                passwordNueva !== passwordConfirmacion
              }
            >
              {enviando ? "Cambiando..." : "Cambiar contraseña"}
            </button>

            {/* En el cambio FORZADO (primer login) no hay vuelta atras; en el
                cambio voluntario desde Mi perfil, si: boton para cancelar/volver. */}
            {!esPrimerLogin && (
              <button
                type="button"
                className="cambiar-pass-boton-cancelar"
                onClick={() => navigate(-1)}
                disabled={enviando}
              >
                Cancelar
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default CambiarPassword;