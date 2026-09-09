// Gestión de geografía (Tarea #116) — SOLO SUPERADMIN.
//
// Permite administrar la estructura territorial sin tocar SQL:
//   - SEDES de formación: crear, editar (nombre/dirección) y activar/desactivar.
//     No hay borrado: una sede con historial (vehículos, chequeos) se desactiva.
//   - CIUDADES / municipios: crear (cuelgan de su departamento).
//   - Regiones y departamentos son la división fija de Colombia: solo lectura.
//
// El backend protege la escritura con requiereRol('superadmin'); esta página
// además redirige a cualquier otro rol que entre por URL directa.

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Modal from "../../components/Modal/Modal.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import "./GeografiaAdmin.css";

const FORM_SEDE_VACIO = { id: null, nombre: "", departamento_id: "", ciudad_id: "", direccion: "" };
const FORM_CIUDAD_VACIO = { nombre: "", departamento_id: "" };

function GeografiaAdmin() {
    const { usuario } = useAuth();

    const [vista, setVista] = useState("sedes"); // 'sedes' | 'ciudades'
    const [departamentos, setDepartamentos] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [toast, setToast] = useState(null);

    // Filtros de las tablas
    const [filtroDepto, setFiltroDepto] = useState("todos");
    const [filtroCiudad, setFiltroCiudad] = useState("todos");
    const [verInactivos, setVerInactivos] = useState(false);

    // Formularios (null = cerrado)
    const [formSede, setFormSede] = useState(null);
    const [formCiudad, setFormCiudad] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [d, c, ce] = await Promise.all([
                api("/geo/departamentos"),
                api("/geo/ciudades"),
                api("/geo/sedes?incluir_inactivos=true"),
            ]);
            setDepartamentos(d.departamentos || []);
            setCiudades(c.ciudades || []);
            setSedes(ce.sedes || []);
        } catch (err) {
            if (!err.sesionExpirada) mostrarToast(err.message, "error");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarTodo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mapa id->nombre de departamentos (para mostrar el depto de cada ciudad)
    const nombreDepto = useMemo(() => {
        const m = {};
        departamentos.forEach((d) => { m[d.id] = d.nombre; });
        return m;
    }, [departamentos]);

    // Ciudades del departamento elegido en el FORM de sede (cascada).
    // Listas pequeñas (~34): derivar en cada render es suficiente, sin memo.
    const ciudadesDelFormSede = formSede?.departamento_id
        ? ciudades.filter((c) => c.departamento_id === formSede.departamento_id)
        : [];

    // ===== Tabla de sedes (filtrada) =====
    const ciudadesDelFiltro =
        filtroDepto === "todos"
            ? ciudades
            : ciudades.filter((c) => c.departamento_id === filtroDepto);

    const sedesFiltrados = sedes.filter((c) => {
        if (!verInactivos && !c.activo) return false;
        if (filtroCiudad !== "todos" && c.ciudad_id !== filtroCiudad) return false;
        if (filtroDepto !== "todos") {
            const ciudad = ciudades.find((x) => x.id === c.ciudad_id);
            if (!ciudad || ciudad.departamento_id !== filtroDepto) return false;
        }
        return true;
    });

    // ===== Tabla de ciudades (filtrada) =====
    const ciudadesFiltradas = ciudades.filter(
        (c) => filtroDepto === "todos" || c.departamento_id === filtroDepto
    );

    const contarSedes = (ciudadId) =>
        sedes.filter((c) => c.ciudad_id === ciudadId).length;

    // ===== Acciones de sedes =====
    const guardarSede = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            if (formSede.id) {
                await api(`/geo/sedes/${formSede.id}`, {
                    method: "PATCH",
                    body: { nombre: formSede.nombre, direccion: formSede.direccion },
                });
                mostrarToast("Sede actualizada correctamente");
            } else {
                await api("/geo/sedes", {
                    method: "POST",
                    body: {
                        nombre: formSede.nombre,
                        ciudad_id: formSede.ciudad_id,
                        direccion: formSede.direccion,
                    },
                });
                mostrarToast("Sede creada");
            }
            setFormSede(null);
            cargarTodo();
        } catch (err) {
            if (!err.sesionExpirada) mostrarToast(err.message, "error");
        } finally {
            setGuardando(false);
        }
    };

    const editarSede = (sede) => {
        const ciudad = ciudades.find((c) => c.id === sede.ciudad_id);
        setFormSede({
            id: sede.id,
            nombre: sede.nombre,
            departamento_id: ciudad?.departamento_id || "",
            ciudad_id: sede.ciudad_id || "",
            direccion: sede.direccion || "",
        });
    };

    const cambiarActivoSede = async (sede) => {
        try {
            await api(`/geo/sedes/${sede.id}`, {
                method: "PATCH",
                body: { activo: !sede.activo },
            });
            mostrarToast(
                sede.activo ? `Sede "${sede.nombre}" desactivado` : `Sede "${sede.nombre}" reactivado`,
                sede.activo ? "advertencia" : "exito"
            );
            cargarTodo();
        } catch (err) {
            if (!err.sesionExpirada) mostrarToast(err.message, "error");
        }
    };

    // ===== Acciones de ciudades =====
    const guardarCiudad = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/geo/ciudades", {
                method: "POST",
                body: { nombre: formCiudad.nombre, departamento_id: formCiudad.departamento_id },
            });
            mostrarToast("Ciudad creada correctamente");
            setFormCiudad(null);
            cargarTodo();
        } catch (err) {
            if (!err.sesionExpirada) mostrarToast(err.message, "error");
        } finally {
            setGuardando(false);
        }
    };

    // Gestionan geografía el Administrador general (todo el país) y el Director
    // Regional (solo su departamento). El backend además valida el scope por
    // endpoint. Los demás cargos no entran.
    if (usuario && usuario.rol !== "superadmin" && usuario.rol !== "admin_departamental") {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <AdminLayout titulo="Gestión de geografía">
            {toast && (
                <Toast mensaje={toast.mensaje} tipo={toast.tipo} onCerrar={() => setToast(null)} />
            )}

            <div className="geografia">
                <div className="geografia-encabezado">
                    <div>
                        <h2 className="geografia-titulo">Gestión de geografía</h2>
                        <p className="geografia-subtitulo">
                            {usuario?.rol === "admin_departamental"
                                ? "Administras las ciudades y las sedes de tu regional."
                                : "Las regiones y departamentos son la división fija de Colombia. Aquí administras las ciudades y las sedes de tu organización."}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="geografia-tabs">
                    <button
                        type="button"
                        className={`geografia-tab ${vista === "sedes" ? "geografia-tab--activa" : ""}`}
                        onClick={() => { setVista("sedes"); setFiltroCiudad("todos"); }}
                    >
                        Sedes ({sedes.length})
                    </button>
                    <button
                        type="button"
                        className={`geografia-tab ${vista === "ciudades" ? "geografia-tab--activa" : ""}`}
                        onClick={() => setVista("ciudades")}
                    >
                        Ciudades ({ciudades.length})
                    </button>
                </div>

                {/* ===== Filtros + botón crear ===== */}
                <div className="geografia-barra">
                    <select
                        className="geografia-select"
                        value={filtroDepto}
                        onChange={(e) => { setFiltroDepto(e.target.value); setFiltroCiudad("todos"); }}
                    >
                        <option value="todos">Todos los departamentos</option>
                        {departamentos.map((d) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>

                    {vista === "sedes" && (
                        <>
                            <select
                                className="geografia-select"
                                value={filtroCiudad}
                                onChange={(e) => setFiltroCiudad(e.target.value)}
                            >
                                <option value="todos">Todas las ciudades</option>
                                {ciudadesDelFiltro.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <label className="geografia-check">
                                <input
                                    type="checkbox"
                                    checked={verInactivos}
                                    onChange={(e) => setVerInactivos(e.target.checked)}
                                />
                                Ver inactivos
                            </label>
                        </>
                    )}

                    <div className="geografia-barra-espacio" />

                    {vista === "sedes" ? (
                        <button
                            type="button"
                            className="geografia-boton-crear"
                            onClick={() =>
                                setFormSede({
                                    ...FORM_SEDE_VACIO,
                                    // Si solo hay un departamento en scope (el Regional), pre-seleccionarlo
                                    departamento_id: departamentos.length === 1 ? departamentos[0].id : "",
                                })
                            }
                        >
                            + Añadir sede
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="geografia-boton-crear"
                            onClick={() =>
                                setFormCiudad({
                                    ...FORM_CIUDAD_VACIO,
                                    departamento_id: departamentos.length === 1 ? departamentos[0].id : "",
                                })
                            }
                        >
                            + Añadir ciudad
                        </button>
                    )}
                </div>

                {/* ===== Modal: crear / editar sede ===== */}
                <Modal
                    abierto={!!formSede}
                    onCerrar={() => setFormSede(null)}
                    titulo={formSede?.id ? "Editar sede" : "Nueva sede"}
                >
                    {formSede && (
                    <form className="geografia-form-modal" onSubmit={guardarSede}>
                        <div className="geografia-form-grid">
                            <div className="geografia-campo">
                                <label className="geografia-label">Nombre de la sede *</label>
                                <input
                                    type="text"
                                    className="geografia-input"
                                    value={formSede.nombre}
                                    onChange={(e) => setFormSede({ ...formSede, nombre: e.target.value })}
                                    placeholder="Ej: Sede Bogotá Norte"
                                    required
                                    disabled={guardando}
                                />
                            </div>
                            {/* Al editar no se cambia la ciudad (la sede pertenece a su ciudad);
                                si una sede quedaba mal ubicado, se desactiva y se crea bien. */}
                            {!formSede.id && (
                                <>
                                    <div className="geografia-campo">
                                        <label className="geografia-label">Departamento *</label>
                                        <select
                                            className="geografia-input"
                                            value={formSede.departamento_id}
                                            onChange={(e) =>
                                                setFormSede({ ...formSede, departamento_id: e.target.value, ciudad_id: "" })
                                            }
                                            required
                                            disabled={guardando}
                                        >
                                            <option value="">— Selecciona departamento —</option>
                                            {departamentos.map((d) => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="geografia-campo">
                                        <label className="geografia-label">Ciudad *</label>
                                        <select
                                            className="geografia-input"
                                            value={formSede.ciudad_id}
                                            onChange={(e) => setFormSede({ ...formSede, ciudad_id: e.target.value })}
                                            required
                                            disabled={guardando || !formSede.departamento_id}
                                        >
                                            <option value="">
                                                {formSede.departamento_id
                                                    ? "— Selecciona ciudad —"
                                                    : "— Primero el departamento —"}
                                            </option>
                                            {ciudadesDelFormSede.map((c) => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                        {formSede.departamento_id && ciudadesDelFormSede.length === 0 && (
                                            <small className="geografia-ayuda">
                                                Ese departamento aún no tiene ciudades: créala primero en la pestaña Ciudades.
                                            </small>
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="geografia-campo">
                                <label className="geografia-label">Dirección (opcional)</label>
                                <input
                                    type="text"
                                    className="geografia-input"
                                    value={formSede.direccion}
                                    onChange={(e) => setFormSede({ ...formSede, direccion: e.target.value })}
                                    placeholder="Ej: Cra 5 # 10-20"
                                    disabled={guardando}
                                />
                            </div>
                        </div>
                        <div className="geografia-form-acciones">
                            <button
                                type="button"
                                className="geografia-boton-cancelar"
                                onClick={() => setFormSede(null)}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                            <button type="submit" className="geografia-boton-guardar" disabled={guardando}>
                                {guardando ? "Guardando..." : formSede.id ? "Guardar cambios" : "Crear sede"}
                            </button>
                        </div>
                    </form>
                    )}
                </Modal>

                {/* ===== Modal: crear ciudad ===== */}
                <Modal
                    abierto={!!formCiudad}
                    onCerrar={() => setFormCiudad(null)}
                    titulo="Nueva ciudad / municipio"
                >
                    {formCiudad && (
                    <form className="geografia-form-modal" onSubmit={guardarCiudad}>
                        <div className="geografia-form-grid">
                            <div className="geografia-campo">
                                <label className="geografia-label">Nombre *</label>
                                <input
                                    type="text"
                                    className="geografia-input"
                                    value={formCiudad.nombre}
                                    onChange={(e) => setFormCiudad({ ...formCiudad, nombre: e.target.value })}
                                    placeholder="Ej: Melgar"
                                    required
                                    disabled={guardando}
                                />
                            </div>
                            <div className="geografia-campo">
                                <label className="geografia-label">Departamento *</label>
                                <select
                                    className="geografia-input"
                                    value={formCiudad.departamento_id}
                                    onChange={(e) => setFormCiudad({ ...formCiudad, departamento_id: e.target.value })}
                                    required
                                    disabled={guardando}
                                >
                                    <option value="">— Selecciona departamento —</option>
                                    {departamentos.map((d) => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="geografia-form-acciones">
                            <button
                                type="button"
                                className="geografia-boton-cancelar"
                                onClick={() => setFormCiudad(null)}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                            <button type="submit" className="geografia-boton-guardar" disabled={guardando}>
                                {guardando ? "Guardando..." : "Crear ciudad"}
                            </button>
                        </div>
                    </form>
                    )}
                </Modal>

                {/* ===== Contenido ===== */}
                {cargando ? (
                    <div className="geografia-estado">Cargando geografía...</div>
                ) : vista === "sedes" ? (
                    sedesFiltrados.length === 0 ? (
                        <div className="geografia-estado">
                            No hay sedes que coincidan con los filtros.
                        </div>
                    ) : (
                        <div className="geografia-tabla-wrapper animar-fade-in">
                            <table className="geografia-tabla">
                                <thead>
                                    <tr>
                                        <th>Sede</th>
                                        <th>Ciudad</th>
                                        <th>Departamento</th>
                                        <th>Dirección</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sedesFiltrados.map((c) => (
                                        <tr key={c.id} className={!c.activo ? "geografia-fila-inactiva" : ""}>
                                            <td className="geografia-celda-nombre">{c.nombre}</td>
                                            <td>{c.ciudad || "—"}</td>
                                            <td>{c.departamento || "—"}</td>
                                            <td>{c.direccion || "—"}</td>
                                            <td>
                                                <span className={`geografia-estado-pill ${c.activo ? "activo" : "inactivo"}`}>
                                                    {c.activo ? "Activo" : "Inactivo"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="geografia-acciones">
                                                    <button
                                                        type="button"
                                                        className="geografia-accion"
                                                        onClick={() => editarSede(c)}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`geografia-accion ${c.activo ? "geografia-accion-warning" : "geografia-accion-success"}`}
                                                        onClick={() => cambiarActivoSede(c)}
                                                    >
                                                        {c.activo ? "Desactivar" : "Reactivar"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : ciudadesFiltradas.length === 0 ? (
                    <div className="geografia-estado">No hay ciudades en ese departamento.</div>
                ) : (
                    <div className="geografia-tabla-wrapper animar-fade-in">
                        <table className="geografia-tabla">
                            <thead>
                                <tr>
                                    <th>Ciudad</th>
                                    <th>Departamento</th>
                                    <th>Sedes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ciudadesFiltradas.map((c) => (
                                    <tr key={c.id}>
                                        <td className="geografia-celda-nombre">{c.nombre}</td>
                                        <td>{nombreDepto[c.departamento_id] || "—"}</td>
                                        <td>{contarSedes(c.id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export default GeografiaAdmin;
