import { useEffect, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import { useAuth } from "../../../hooks/useAuth.js";
import { esDirector } from "../../../lib/roles.js";
import "./ModalSuplencia.css";

// Activa o desactiva la suplencia de un conductor del pool. `usuario` es la fila
// del conductor (debe tener rol 'conductor' y es_pool true). onHecho(mensaje) avisa
// al padre para refrescar la lista y mostrar el toast.
function ModalSuplencia({ abierto, onCerrar, usuario, onHecho }) {
    const { usuario: actor } = useAuth();
    const [suplenciaActiva, setSuplenciaActiva] = useState(null);
    const [hasta, setHasta] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [consultando, setConsultando] = useState(true);
    // Alcance de la suplencia (Director): una sede (Fase A) o toda la regional /
    // departamento (Fase B). El titular/coordinador solo cubre la sede del pool.
    const [alcance, setAlcance] = useState("sede"); // 'sede' | 'departamento'
    const [sedes, setSedes] = useState([]);
    const [sedeSel, setSedeSel] = useState("");
    const [departamentos, setDepartamentos] = useState([]);
    const [deptoSel, setDeptoSel] = useState("");
    const actorEsDirector = esDirector(actor?.rol);

    useEffect(() => {
        if (!abierto || !usuario) return;
        setError(null);
        setHasta("");
        setMotivo("");
        setAlcance("sede");
        setSedeSel(usuario.sede_id || ""); // por defecto, la sede propia del pool
        setDeptoSel("");
        setConsultando(true);
        // ¿Ya tiene una suplencia activa? (en el área del que consulta)
        api(`/suplencias?activa=true`)
            .then((data) => {
                const mia = (data.suplencias || []).find((s) => s.pool_id === usuario.id);
                setSuplenciaActiva(mia || null);
            })
            .catch((err) => { if (!err.sesionExpirada) setError(err.message); })
            .finally(() => setConsultando(false));
        // Para Directores: listas de sedes y departamentos de su área (ya scopeadas).
        if (esDirector(actor?.rol)) {
            api("/geo/sedes")
                .then((data) => setSedes(data.sedes || []))
                .catch(() => {});
            api("/geo/departamentos")
                .then((data) => setDepartamentos(data.departamentos || []))
                .catch(() => {});
        }
    }, [abierto, usuario, actor]);

    const activar = async () => {
        setError(null);
        setCargando(true);
        try {
            await api("/suplencias", {
                method: "POST",
                body: {
                    pool_id: usuario.id,
                    alcance,
                    sede_id: alcance === "sede" ? (sedeSel || usuario.sede_id || null) : null,
                    departamento_id: alcance === "departamento" ? (deptoSel || null) : null,
                    hasta: hasta || null,
                    motivo: motivo || null,
                },
            });
            onHecho(`Suplencia activada para ${usuario.nombre_completo}.`);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally { setCargando(false); }
    };

    const desactivar = async () => {
        setError(null);
        setCargando(true);
        try {
            await api(`/suplencias/${suplenciaActiva.id}/desactivar`, { method: "PATCH" });
            onHecho(`Suplencia finalizada para ${usuario.nombre_completo}.`);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally { setCargando(false); }
    };

    if (!usuario) return null;

    return (
        <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Suplencia · ${usuario.nombre_completo}`}>
            <div className="modal-suplencia">
                {consultando ? (
                    <p className="modal-suplencia-cargando">Consultando…</p>
                ) : suplenciaActiva ? (
                    <>
                        <p className="modal-suplencia-info">
                            Este conductor está{" "}
                            {suplenciaActiva.departamento?.nombre
                                ? <><strong>supliendo a los Coordinadores de la Regional {suplenciaActiva.departamento.nombre}</strong></>
                                : <><strong>supliendo al Coordinador de sede</strong>{suplenciaActiva.sede?.nombre ? ` de ${suplenciaActiva.sede.nombre}` : ""}</>}
                            {suplenciaActiva.hasta
                                ? ` hasta el ${new Date(suplenciaActiva.hasta).toLocaleDateString("es-CO")}`
                                : " (sin fecha de fin)"}.
                        </p>
                        <p className="modal-suplencia-meta">
                            Activada por <strong>{suplenciaActiva.activada_por?.nombre_completo || "—"}</strong>
                            {" el "}
                            {new Date(suplenciaActiva.desde).toLocaleDateString("es-CO")}
                            {suplenciaActiva.motivo ? ` · Motivo: ${suplenciaActiva.motivo}` : ""}
                        </p>
                        {error && <div className="modal-suplencia-error">⚠️ {error}</div>}
                        <div className="modal-suplencia-acciones">
                            <button className="modal-suplencia-boton-cancelar" onClick={onCerrar} disabled={cargando}>
                                Cerrar
                            </button>
                            <button className="modal-suplencia-boton-fin" onClick={desactivar} disabled={cargando}>
                                {cargando ? "Finalizando…" : "Finalizar suplencia"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="modal-suplencia-info">
                            Al activar, este conductor del pool reemplaza al Coordinador de sede
                            {actorEsDirector ? " de la sede que elijas" : " de su sede"}
                            {" "}(gestiona vehículos, conductores y chequeos) mientras dure la suplencia.
                        </p>
                        {actorEsDirector && (
                            <>
                                <label className="modal-suplencia-label">Alcance *</label>
                                <div className="modal-suplencia-radios">
                                    <label className="modal-suplencia-radio">
                                        <input type="radio" name="alcance" checked={alcance === "sede"}
                                            onChange={() => setAlcance("sede")} disabled={cargando} />
                                        Una sede
                                    </label>
                                    <label className="modal-suplencia-radio">
                                        <input type="radio" name="alcance" checked={alcance === "departamento"}
                                            onChange={() => setAlcance("departamento")} disabled={cargando} />
                                        Toda la regional
                                    </label>
                                </div>

                                {alcance === "sede" ? (
                                    <>
                                        <label className="modal-suplencia-label">Sede a cubrir *</label>
                                        <select
                                            className="modal-suplencia-input"
                                            value={sedeSel}
                                            onChange={(e) => setSedeSel(e.target.value)}
                                            disabled={cargando || sedes.length === 0}
                                        >
                                            <option value="">— Selecciona la sede —</option>
                                            {sedes.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nombre}{c.ciudad ? ` · ${c.ciudad}` : ""}
                                                    {c.id === usuario.sede_id ? " (sede del pool)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <small className="modal-suplencia-ayuda">
                                            Puede ser la sede del pool u otro de tu área.
                                        </small>
                                    </>
                                ) : (
                                    <>
                                        <label className="modal-suplencia-label">Regional / departamento *</label>
                                        <select
                                            className="modal-suplencia-input"
                                            value={deptoSel}
                                            onChange={(e) => setDeptoSel(e.target.value)}
                                            disabled={cargando || departamentos.length === 0}
                                        >
                                            <option value="">— Selecciona el departamento —</option>
                                            {departamentos.map((d) => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                        <small className="modal-suplencia-ayuda">
                                            El pool podrá gestionar TODOS las sedes de ese departamento, uno a la vez.
                                        </small>
                                    </>
                                )}
                            </>
                        )}
                        <label className="modal-suplencia-label">Hasta (opcional)</label>
                        <input type="date" className="modal-suplencia-input"
                            value={hasta} onChange={(e) => setHasta(e.target.value)} disabled={cargando} />
                        <small className="modal-suplencia-ayuda">
                            Si la dejás vacía, queda activa hasta que la finalices a mano.
                        </small>
                        <label className="modal-suplencia-label">Motivo (opcional)</label>
                        <input type="text" className="modal-suplencia-input" placeholder="Ej: vacaciones del coordinador"
                            value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={cargando} />
                        {error && <div className="modal-suplencia-error">⚠️ {error}</div>}
                        <div className="modal-suplencia-acciones">
                            <button className="modal-suplencia-boton-cancelar" onClick={onCerrar} disabled={cargando}>
                                Cancelar
                            </button>
                            <button
                                className="modal-suplencia-boton-activar"
                                onClick={activar}
                                disabled={cargando || (actorEsDirector && alcance === "departamento" && !deptoSel)}
                            >
                                {cargando ? "Activando…" : "Activar suplencia"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default ModalSuplencia;
