// Cambiar la marca "Dueño de SISVIA" (pacto para-empresas, HU-20.5-7 · CB-22 ·
// CB-23; enmienda 7: varios dueños). Tres modos, un solo formulario:
//   dar    -> la otra cuenta queda dueña también
//   pasar  -> la otra queda dueña y quien la pasa deja de serlo
//   quitar -> renuncia a la suya (el único dueño no puede)
// Siempre con la contraseña propia y escribiendo el nombre exacto: la contraseña
// la escribe la persona, nunca se completa sola.
import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import Modal from "../Modal/Modal.jsx";
import InputPassword from "../InputPassword/InputPassword.jsx";
import "./CambiarMarca.css";

const MODOS = {
    dar: {
        titulo: "Dar la marca de dueño",
        nota: "La cuenta que elijas queda dueña también: va a ver el Registro del equipo y nadie va a poder desactivarla ni eliminarla. Tú sigues siendo dueño.",
        boton: "Dar la marca",
        haciendo: "Dando la marca...",
        ruta: "/equipo/dar-marca",
    },
    pasar: {
        titulo: "Pasarle mi marca de dueño",
        nota: "La cuenta que elijas queda dueña y tú dejas de serlo en el mismo momento: ya no vas a ver el Registro del equipo. Solo un dueño puede devolvértela.",
        boton: "Pasarle la mía",
        haciendo: "Pasando la marca...",
        ruta: "/equipo/pasar-marca",
    },
    quitar: {
        titulo: "Quitarme la marca de dueño",
        nota: "Dejás de ser dueño: ya no vas a ver el Registro del equipo y tu cuenta queda como un Administrador general común. Si sos el único dueño, primero dale la marca a otra cuenta.",
        boton: "Quitarme la marca",
        haciendo: "Quitando la marca...",
        ruta: "/equipo/quitarme-marca",
    },
};

function Formulario({ modo, onCerrar, onHecho }) {
    const { usuario } = useAuth();
    const config = MODOS[modo];
    const eligeCuenta = modo !== "quitar";

    const [candidatos, setCandidatos] = useState(eligeCuenta ? null : []);
    const [errorCarga, setErrorCarga] = useState(null);
    const [destinoId, setDestinoId] = useState("");
    const [nombre, setNombre] = useState("");
    const [password, setPassword] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!eligeCuenta) return undefined;
        let vigente = true;
        api("/equipo/candidatos")
            .then((r) => { if (vigente) setCandidatos(r.candidatos || []); })
            .catch((err) => { if (vigente) setErrorCarga(err.message); });
        return () => { vigente = false; };
    }, [eligeCuenta]);

    const destino = eligeCuenta ? (candidatos?.find((c) => c.id === destinoId) || null) : usuario;
    const nombreBien = !!destino && nombre.trim() === (destino.nombre_completo || "").trim();
    const listo = nombreBien && password.length > 0 && !enviando;

    const enviar = async (e) => {
        e.preventDefault();
        if (!listo) return;
        setEnviando(true);
        setError(null);
        try {
            const r = await api(config.ruta, {
                method: "POST",
                body: eligeCuenta ? { destino_id: destino.id, nombre, password } : { nombre, password },
            });
            onHecho(r.mensaje, modo);
        } catch (err) {
            setError(err.message);
            setPassword("");
        } finally {
            setEnviando(false);
        }
    };

    if (errorCarga) return <p className="marca-error" role="alert">{errorCarga}</p>;
    if (candidatos === null) return <p className="marca-nota">Cargando el equipo SISVIA...</p>;
    if (eligeCuenta && candidatos.length === 0) {
        return (
            <div className="marca-form">
                <p className="marca-nota">
                    No hay ningún Administrador general activo que no sea ya dueño. Para darle la marca a
                    alguien, primero crea o reactiva su cuenta.
                </p>
                <div className="marca-acciones">
                    <button type="button" className="marca-boton" onClick={onCerrar}>Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <form className="marca-form" onSubmit={enviar}>
            <p className="marca-nota">{config.nota}</p>

            {eligeCuenta && (
                <label className="marca-campo">
                    <span className="marca-label">{modo === "dar" ? "Dale la marca a" : "Pasarle la marca a"}</span>
                    <select
                        className="marca-input"
                        value={destinoId}
                        onChange={(e) => { setDestinoId(e.target.value); setNombre(""); setError(null); }}
                        autoFocus
                    >
                        <option value="">Elige un Administrador general</option>
                        {candidatos.map((c) => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                    </select>
                </label>
            )}

            {destino && (
                <>
                    <label className="marca-campo">
                        <span className="marca-label">
                            Escribe <b>{destino.nombre_completo}</b> para confirmar
                        </span>
                        <input
                            className="marca-input"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            autoFocus={!eligeCuenta}
                        />
                    </label>
                    <label className="marca-campo">
                        <span className="marca-label">Tu contraseña</span>
                        <InputPassword
                            className="marca-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="off"
                        />
                    </label>
                </>
            )}

            {error && <p className="marca-error" role="alert">{error}</p>}

            <div className="marca-acciones">
                <button type="button" className="marca-boton" onClick={onCerrar} disabled={enviando}>
                    Cancelar
                </button>
                <button type="submit" className="marca-boton marca-boton--principal" disabled={!listo}>
                    {enviando ? config.haciendo : config.boton}
                </button>
            </div>
        </form>
    );
}

function CambiarMarca({ modo, onCerrar, onHecho }) {
    return (
        <Modal abierto={!!modo} onCerrar={onCerrar} titulo={modo ? MODOS[modo].titulo : ""} ancho="pequeno">
            {/* Se monta de cero en cada apertura: sin datos viejos del intento anterior */}
            {modo && <Formulario key={modo} modo={modo} onCerrar={onCerrar} onHecho={onHecho} />}
        </Modal>
    );
}

export default CambiarMarca;
