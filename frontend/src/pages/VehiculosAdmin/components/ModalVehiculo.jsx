import { useEffect, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api, API_URL } from "../../../lib/api.js";
import { useAuth } from "../../../hooks/useAuth.js";
import { esDirector } from "../../../lib/roles.js";
import { filtrarPlaca, validarPlaca, ayudaPlaca, ejemploPlaca, filtrarColor } from "../../../lib/placa.js";
import "./ModalVehiculo.css";

const ESTADO_INICIAL = {
    sede_id: "",
    es_vip: false,
    placa: "",
    marca: "",
    linea: "",
    tipo: "camion",
    modelo_anio: "",
    vin: "",
    color: "",
    kilometraje_actual: "",
    soat_vencimiento: "",
    rtm_vencimiento: "",
    extintor_vencimiento: "",
    ultimo_cambio_aceite: "",
    estado: "operativo",
    nivel_criticidad: 0,
    notas: "",
};

const TIPOS = [
    { value: "automovil", label: "Automóvil" },
    { value: "motocicleta", label: "Motocicleta" },
    { value: "motocarro", label: "Motocarro" },
    { value: "camion", label: "Camión" },
    { value: "camioneta", label: "Camioneta" },
    { value: "tractocamion", label: "Tractocamión" },
    { value: "microbus", label: "Microbús" },
    { value: "buseta", label: "Buseta" },
    { value: "bus", label: "Bus" },
];

const ESTADOS = [
    { value: "operativo", label: "Operativo", min: 0, max: 19, sede: 10 },
    { value: "observacion", label: "Observación", min: 20, max: 39, sede: 30 },
    { value: "alerta", label: "Alerta", min: 40, max: 59, sede: 50 },
    { value: "critico", label: "Crítico", min: 60, max: 89, sede: 75 },
    { value: "no_operativo", label: "No operativo", min: 90, max: 100, sede: 95 },
];

const estadoDesdeCriticidad = (nivel) => {
    const encontrado = ESTADOS.find((e) => nivel >= e.min && nivel <= e.max);
    return encontrado ? encontrado.value : "operativo";
};

const sedeDeEstado = (estado) => {
    const encontrado = ESTADOS.find((e) => e.value === estado);
    return encontrado ? encontrado.sede : 0;
};

const soloFecha = (valor) => (valor ? valor.slice(0, 10) : "");

const FOTO_MAX_MB = 5;
const RUNT_MAX_MB = 20;
const FORMATOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

function ModalVehiculo({ abierto, onCerrar, onGuardado, vehiculo = null, mostrarToast }) {
    const esEdicion = !!vehiculo;
    const { usuario } = useAuth();

    // Cascada de sede (multinivel #116): a que sede pertenece el vehiculo.
    // Solo aplica al CREAR (al editar no se cambia la sede del vehiculo).
    const [sedes, setSedes] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [filtroDepto, setFiltroDepto] = useState("");
    const rolActor = usuario?.rol;
    const actorEsNacional = rolActor === "superadmin";
    const actorEsCoordinador = rolActor === "admin_sede" || rolActor === "admin";
    // El Coordinador (o alias 'admin' con sede) hereda SU sede, sin elegir.
    const sedeAutoAsignado = actorEsCoordinador && !!usuario?.sede_id;
    const sedesDisponibles =
        actorEsNacional && filtroDepto
            ? sedes.filter((c) => c.departamento_id === filtroDepto)
            : sedes;

    const [form, setForm] = useState(ESTADO_INICIAL);
    const [fotosExistentes, setFotosExistentes] = useState([]);
    const [runtUrlExistente, setRuntUrlExistente] = useState(null);
    const [fotosNuevas, setFotosNuevas] = useState([]);
    const [fotosNuevasPreview, setFotosNuevasPreview] = useState([]);
    const [runtNuevo, setRuntNuevo] = useState(null);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [paso, setPaso] = useState("");

    useEffect(() => {
        if (!abierto) return;
        if (vehiculo) {
            setForm({
                placa: vehiculo.placa || "",
                marca: vehiculo.marca || "",
                linea: vehiculo.linea || "",
                tipo: vehiculo.tipo || "camion",
                modelo_anio: vehiculo.modelo_anio || "",
                vin: vehiculo.vin || "",
                color: vehiculo.color || "",
                kilometraje_actual: vehiculo.kilometraje_actual ?? "",
                soat_vencimiento: soloFecha(vehiculo.soat_vencimiento),
                rtm_vencimiento: soloFecha(vehiculo.rtm_vencimiento),
                extintor_vencimiento: soloFecha(vehiculo.extintor_vencimiento),
                ultimo_cambio_aceite: soloFecha(vehiculo.ultimo_cambio_aceite),
                estado: vehiculo.estado || "operativo",
                nivel_criticidad: vehiculo.nivel_criticidad ?? 0,
                notas: vehiculo.notas || "",
                es_vip: vehiculo.es_vip ?? false,
            });
            setFotosExistentes(vehiculo.fotos || []);
            setRuntUrlExistente(vehiculo.runt_url || null);
        } else {
            setForm(ESTADO_INICIAL);
            setFotosExistentes([]);
            setRuntUrlExistente(null);
        }
        setFiltroDepto("");
        setFotosNuevas([]);
        setFotosNuevasPreview([]);
        setRuntNuevo(null);
        setError(null);
        setPaso("");
    }, [abierto, vehiculo]);

    // Cargar geografia (scopeada) al abrir en modo CREAR, para el selector de sede.
    useEffect(() => {
        if (!abierto || esEdicion) return;
        const cargar = (ruta, set) =>
            api(ruta)
                .then((data) => set(data[Object.keys(data)[0]] || []))
                .catch((err) => {
                    if (!err.sesionExpirada) console.error(`Error cargando ${ruta}:`, err.message);
                });
        cargar("/geo/sedes", setSedes);
        cargar("/geo/departamentos", setDepartamentos);
    }, [abierto, esEdicion]);

    const cerrar = () => {
        setError(null);
        setPaso("");
        onCerrar();
    };

    const cambiarCampo = (campo, valor) => setForm({ ...form, [campo]: valor });

    const cambiarEstado = (nuevoEstado) => {
        setForm({
            ...form,
            estado: nuevoEstado,
            nivel_criticidad: sedeDeEstado(nuevoEstado),
        });
    };

    const cambiarCriticidad = (nuevoNivel) => {
        setForm({
            ...form,
            nivel_criticidad: nuevoNivel,
            estado: estadoDesdeCriticidad(nuevoNivel),
        });
    };

    const cambiarFotos = (e) => {
        const archivos = Array.from(e.target.files || []);
        e.target.value = "";
        if (archivos.length === 0) return;

        const validos = [];
        const rechazadosPorPeso = [];
        const rechazadosPorFormato = [];

        archivos.forEach((a) => {
            if (!FORMATOS_FOTO.includes(a.type)) {
                rechazadosPorFormato.push(a.name);
                return;
            }
            if (a.size > FOTO_MAX_MB * 1024 * 1024) {
                rechazadosPorPeso.push(a.name);
                return;
            }
            validos.push(a);
        });

        if (rechazadosPorPeso.length > 0) {
            const lista = rechazadosPorPeso.join(", ");
            mostrarToast?.(
                `${rechazadosPorPeso.length === 1 ? "La foto" : "Las fotos"} ${lista} ${rechazadosPorPeso.length === 1 ? "supera" : "superan"} el límite de ${FOTO_MAX_MB} MB`,
                "error",
                "arriba-sede"
            );
        }

        if (rechazadosPorFormato.length > 0) {
            mostrarToast?.(
                `Formato no permitido. Solo JPEG, PNG o WebP`,
                "error",
                "arriba-sede"
            );
        }

        if (validos.length === 0) return;

        const previewsNuevos = [];
        validos.forEach((archivo) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewsNuevos.push({ archivo, preview: ev.target.result });
                if (previewsNuevos.length === validos.length) {
                    setFotosNuevas((prev) => [...prev, ...validos]);
                    setFotosNuevasPreview((prev) => [...prev, ...previewsNuevos]);
                }
            };
            reader.readAsDataURL(archivo);
        });
    };

    const quitarFotoNueva = (index) => {
        setFotosNuevas((prev) => prev.filter((_, i) => i !== index));
        setFotosNuevasPreview((prev) => prev.filter((_, i) => i !== index));
    };

    const eliminarFotoExistente = async (fotoId) => {
        if (!confirm("¿Eliminar esta foto del vehículo?")) return;
        try {
            await api(`/vehiculos/${vehiculo.id}/fotos/${fotoId}`, { method: "DELETE" });
            setFotosExistentes((prev) => prev.filter((f) => f.id !== fotoId));
        } catch (err) {
            setError(err.message);
        }
    };

    const marcarPrincipal = async (fotoId) => {
        try {
            await api(`/vehiculos/${vehiculo.id}/fotos/${fotoId}/principal`, { method: "PATCH" });
            setFotosExistentes((prev) =>
                prev.map((f) => ({ ...f, es_principal: f.id === fotoId }))
            );
        } catch (err) {
            setError(err.message);
        }
    };

    const cambiarRunt = (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;

        if (archivo.type !== "application/pdf") {
            mostrarToast?.(
                "El RUNT debe ser un archivo PDF",
                "error",
                "arriba-sede"
            );
            return;
        }
        if (archivo.size > RUNT_MAX_MB * 1024 * 1024) {
            mostrarToast?.(
                `El archivo "${archivo.name}" supera el límite de ${RUNT_MAX_MB} MB`,
                "error",
                "arriba-sede"
            );
            return;
        }

        setRuntNuevo(archivo);
    };

    const eliminarRuntExistente = async () => {
        if (!confirm("¿Eliminar el archivo RUNT actual?")) return;
        try {
            await api(`/vehiculos/${vehiculo.id}/runt`, { method: "DELETE" });
            setRuntUrlExistente(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);

        const errorPlaca = validarPlaca(form.placa, form.tipo);
        if (errorPlaca) {
            setError(errorPlaca);
            return;
        }

        // Al crear, la sede es obligatorio (lo hereda el Coordinador o lo elige
        // el Director Regional/Nacional). Al editar no se toca.
        if (!esEdicion) {
            const sedeFinal = sedeAutoAsignado ? usuario?.sede_id : form.sede_id;
            if (!sedeFinal) {
                setError("Debes elegir la sede del vehículo.");
                return;
            }
        }

        setCargando(true);

        try {
            setPaso(esEdicion ? "Guardando cambios..." : "Creando vehículo...");
            const datos = { ...form };
            // El Coordinador hereda su sede automaticamente (no eligio nada).
            if (!esEdicion && sedeAutoAsignado) datos.sede_id = usuario.sede_id;
            Object.keys(datos).forEach((k) => {
                if (datos[k] === "") delete datos[k];
            });

            let vehiculoId;
            let resultado;
            if (esEdicion) {
                resultado = await api(`/vehiculos/${vehiculo.id}`, {
                    method: "PATCH",
                    body: datos,
                });
                vehiculoId = vehiculo.id;
            } else {
                resultado = await api("/vehiculos", {
                    method: "POST",
                    body: datos,
                });
                vehiculoId = resultado.vehiculo.id;
            }

            const token = localStorage.getItem("token");

            if (fotosNuevas.length > 0) {
                setPaso(`Subiendo ${fotosNuevas.length} foto(s)...`);
                const fd = new FormData();
                fotosNuevas.forEach((f) => fd.append("fotos", f));
                const resp = await fetch(
                    `${API_URL}/vehiculos/${vehiculoId}/fotos`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    }
                );
                if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.error || "Error subiendo fotos");
                }
            }

            if (runtNuevo) {
                setPaso("Subiendo archivo RUNT...");
                const fd = new FormData();
                fd.append("runt", runtNuevo);
                const resp = await fetch(
                    `${API_URL}/vehiculos/${vehiculoId}/runt`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    }
                );
                if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.error || "Error subiendo RUNT");
                }
            }

            onGuardado(resultado.vehiculo, esEdicion);
            cerrar();
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
            setPaso("");
        }
    };

    const titulo = esEdicion
        ? `Editar vehículo · ${vehiculo.placa}`
        : "Crear nuevo vehículo";

    const textoBoton = esEdicion ? "Guardar cambios" : "Crear vehículo";

    return (
        <Modal
            abierto={abierto}
            onCerrar={cerrar}
            titulo={titulo}
            ancho="grande"
        >
            <form className="form-vehiculo" onSubmit={enviar}>
                <div className="form-vehiculo-seccion">
                    <h3 className="form-vehiculo-seccion-titulo">Datos básicos</h3>
                    <div className="form-vehiculo-grid">
                        {/* sede a la que pertenece el vehiculo (cascada multinivel #116).
                            Solo al CREAR; al editar la sede no se cambia. */}
                        {!esEdicion && sedeAutoAsignado && (
                            <div className="form-vehiculo-campo">
                                <label className="form-vehiculo-label">Sede</label>
                                <input
                                    type="text"
                                    className="form-vehiculo-input"
                                    value={usuario?.sede_nombre || "Tu sede"}
                                    disabled
                                />
                            </div>
                        )}
                        {!esEdicion && !sedeAutoAsignado && actorEsNacional && (
                            <div className="form-vehiculo-campo">
                                <label className="form-vehiculo-label">Departamento *</label>
                                <select
                                    className="form-vehiculo-input"
                                    value={filtroDepto}
                                    onChange={(e) => {
                                        setFiltroDepto(e.target.value);
                                        cambiarCampo("sede_id", "");
                                    }}
                                    required
                                    disabled={cargando || departamentos.length === 0}
                                >
                                    <option value="">— Primero el departamento —</option>
                                    {departamentos.map((d) => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {!esEdicion && !sedeAutoAsignado && (
                            <div className="form-vehiculo-campo">
                                <label className="form-vehiculo-label">Sede *</label>
                                <select
                                    className="form-vehiculo-input"
                                    value={form.sede_id}
                                    onChange={(e) => cambiarCampo("sede_id", e.target.value)}
                                    required
                                    disabled={
                                        cargando ||
                                        (actorEsNacional && !filtroDepto) ||
                                        sedesDisponibles.length === 0
                                    }
                                >
                                    <option value="">
                                        {actorEsNacional && !filtroDepto
                                            ? "— Primero elige el departamento —"
                                            : "— Selecciona la sede —"}
                                    </option>
                                    {sedesDisponibles.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre}{c.ciudad ? ` · ${c.ciudad}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* Vehiculo especial / de direccion (VIP). Solo los Directores
                            lo marcan; lo manejan los conductores del pool. */}
                        {esDirector(usuario?.rol) && (
                            <div className="form-vehiculo-campo form-vehiculo-campo-ancho">
                                <label className="form-vehiculo-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={form.es_vip}
                                        onChange={(e) => cambiarCampo("es_vip", e.target.checked)}
                                        disabled={cargando}
                                    />
                                    <span>Vehículo especial / de dirección (VIP) — lo manejan solo los conductores del pool</span>
                                </label>
                            </div>
                        )}
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Placa *</label>
                            <input
                                type="text"
                                className="form-vehiculo-input"
                                value={form.placa}
                                onChange={(e) => cambiarCampo("placa", filtrarPlaca(e.target.value, form.tipo))}
                                placeholder={ejemploPlaca(form.tipo)}
                                maxLength={6}
                                autoCapitalize="characters"
                                required
                                disabled={cargando}
                            />
                            <p className="form-vehiculo-ayuda">{ayudaPlaca(form.tipo)}</p>
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Marca *</label>
                            <input
                                type="text"
                                className="form-vehiculo-input"
                                value={form.marca}
                                onChange={(e) => cambiarCampo("marca", e.target.value)}
                                placeholder="Hyundai, Chevrolet, Mack..."
                                required
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Línea / Modelo</label>
                            <input
                                type="text"
                                className="form-vehiculo-input"
                                value={form.linea}
                                onChange={(e) => cambiarCampo("linea", e.target.value)}
                                placeholder="HD 270, Ranger, Master..."
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Tipo *</label>
                            <select
                                className="form-vehiculo-input"
                                value={form.tipo}
                                onChange={(e) => cambiarCampo("tipo", e.target.value)}
                                disabled={cargando}
                            >
                                {TIPOS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Año del modelo</label>
                            <input
                                type="number"
                                className="form-vehiculo-input"
                                value={form.modelo_anio}
                                onChange={(e) => cambiarCampo("modelo_anio", e.target.value)}
                                min="1980"
                                max="2030"
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">VIN</label>
                            <input
                                type="text"
                                className="form-vehiculo-input"
                                value={form.vin}
                                onChange={(e) => cambiarCampo("vin", e.target.value.toUpperCase())}
                                placeholder="Número de chasis"
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Color</label>
                            <input
                                type="text"
                                className="form-vehiculo-input"
                                value={form.color}
                                onChange={(e) => cambiarCampo("color", filtrarColor(e.target.value))}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Kilometraje actual</label>
                            <input
                                type="number"
                                className="form-vehiculo-input"
                                value={form.kilometraje_actual}
                                onChange={(e) => cambiarCampo("kilometraje_actual", e.target.value)}
                                min="0"
                                disabled={cargando}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-vehiculo-seccion">
                    <h3 className="form-vehiculo-seccion-titulo">Documentación y fechas</h3>
                    <div className="form-vehiculo-grid">
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Vencimiento SOAT</label>
                            <input
                                type="date"
                                className="form-vehiculo-input"
                                value={form.soat_vencimiento}
                                onChange={(e) => cambiarCampo("soat_vencimiento", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Vencimiento RTM</label>
                            <input
                                type="date"
                                className="form-vehiculo-input"
                                value={form.rtm_vencimiento}
                                onChange={(e) => cambiarCampo("rtm_vencimiento", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Vencimiento extintor</label>
                            <input
                                type="date"
                                className="form-vehiculo-input"
                                value={form.extintor_vencimiento}
                                onChange={(e) => cambiarCampo("extintor_vencimiento", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Último cambio de aceite</label>
                            <input
                                type="date"
                                className="form-vehiculo-input"
                                value={form.ultimo_cambio_aceite}
                                onChange={(e) => cambiarCampo("ultimo_cambio_aceite", e.target.value)}
                                disabled={cargando}
                            />
                        </div>
                    </div>

                    <div className="form-vehiculo-archivo">
                        <label className="form-vehiculo-label">Archivo RUNT (PDF)</label>

                        {runtUrlExistente && !runtNuevo && (
                            <div className="form-vehiculo-runt-actual">
                                <a
                                    href={runtUrlExistente}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="form-vehiculo-runt-actual-link"
                                >
                                    Ver RUNT actual
                                </a>
                                <button
                                    type="button"
                                    className="form-vehiculo-quitar"
                                    onClick={eliminarRuntExistente}
                                    disabled={cargando}
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}

                        {runtNuevo ? (
                            <div className="form-vehiculo-archivo-seleccionado">
                                <span>{runtNuevo.name}</span>
                                <button
                                    type="button"
                                    className="form-vehiculo-quitar"
                                    onClick={() => setRuntNuevo(null)}
                                    disabled={cargando}
                                >
                                    Quitar
                                </button>
                            </div>
                        ) : (
                            <label className="form-vehiculo-archivo-boton">
                                <span>
                                    {runtUrlExistente
                                        ? "Reemplazar PDF del RUNT"
                                        : "Seleccionar PDF del RUNT"}
                                </span>
                                <span className="form-vehiculo-archivo-limite">
                                    Máximo {RUNT_MAX_MB} MB · solo PDF
                                </span>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={cambiarRunt}
                                    hidden
                                    disabled={cargando}
                                />
                            </label>
                        )}
                        <div className="form-vehiculo-link-runt">
                            <span className="form-vehiculo-link-runt-texto">
                                ¿No tienes el RUNT en PDF? Descárgalo aquí →
                            </span>
                            <a
                                href="https://www.runt.gov.co/actores/ciudadano/consulta-de-vehiculos-por-placa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="form-vehiculo-link-runt-boton"
                            >
                                Ir al RUNT
                            </a>
                        </div>
                    </div>
                </div>

                <div className="form-vehiculo-seccion">
                    <h3 className="form-vehiculo-seccion-titulo">Estado actual</h3>
                    <p className="form-vehiculo-ayuda">
                        Estado y nivel de criticidad están vinculados. Al cambiar el estado, el slider se ajusta a la sede del rango. Al mover el slider, el estado se recalcula automáticamente.
                    </p>
                    <div className="form-vehiculo-grid">
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">Estado</label>
                            <select
                                className={`form-vehiculo-input form-vehiculo-select-estado form-vehiculo-select-${form.estado}`}
                                value={form.estado}
                                onChange={(e) => cambiarEstado(e.target.value)}
                                disabled={cargando}
                            >
                                {ESTADOS.map((e) => (
                                    <option key={e.value} value={e.value}>
                                        {e.label} ({e.min}-{e.max}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-vehiculo-campo">
                            <label className="form-vehiculo-label">
                                Nivel de criticidad: <strong>{form.nivel_criticidad}%</strong>
                            </label>
                            <input
                                type="range"
                                className="form-vehiculo-rango form-vehiculo-rango-criticidad"
                                value={form.nivel_criticidad}
                                onChange={(e) => cambiarCriticidad(Number(e.target.value))}
                                min="0"
                                max="100"
                                step="1"
                                disabled={cargando}
                            />
                            <div className="form-vehiculo-rango-leyenda">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-vehiculo-campo">
                        <label className="form-vehiculo-label">Notas / observaciones</label>
                        <textarea
                            className="form-vehiculo-textarea"
                            value={form.notas}
                            onChange={(e) => cambiarCampo("notas", e.target.value)}
                            rows={3}
                            placeholder="Cualquier observación relevante del vehículo..."
                            disabled={cargando}
                        />
                    </div>
                </div>

                <div className="form-vehiculo-seccion">
                    <h3 className="form-vehiculo-seccion-titulo">Fotos del vehículo</h3>
                    <p className="form-vehiculo-ayuda">
                        {esEdicion
                            ? "Puedes eliminar, marcar como principal o agregar nuevas fotos."
                            : "Puedes subir varias fotos. La primera se marcará como principal."}
                    </p>

                    {esEdicion && fotosExistentes.length > 0 && (
                        <div className="form-vehiculo-fotos-grid">
                            {fotosExistentes.map((foto) => (
                                <div key={foto.id} className="form-vehiculo-foto-item">
                                    <img src={foto.url} alt="Foto vehículo" />
                                    {foto.es_principal && (
                                        <div className="form-vehiculo-foto-principal-badge">Principal</div>
                                    )}
                                    <div className="form-vehiculo-foto-controles">
                                        {!foto.es_principal && (
                                            <button
                                                type="button"
                                                className="form-vehiculo-foto-control"
                                                onClick={() => marcarPrincipal(foto.id)}
                                                disabled={cargando}
                                                title="Marcar como principal"
                                            >
                                                Principal
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="form-vehiculo-foto-control form-vehiculo-foto-control-peligro"
                                            onClick={() => eliminarFotoExistente(foto.id)}
                                            disabled={cargando}
                                            title="Eliminar foto"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <label className="form-vehiculo-foto-add">
                        <span>+ Agregar {esEdicion ? "más " : ""}fotos</span>
                        <span className="form-vehiculo-archivo-limite">
                            Máximo {FOTO_MAX_MB} MB c/u · JPEG, PNG o WebP
                        </span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={cambiarFotos}
                            multiple
                            hidden
                            disabled={cargando}
                        />
                    </label>

                    {fotosNuevasPreview.length > 0 && (
                        <>
                            <p className="form-vehiculo-ayuda form-vehiculo-ayuda-secundaria">
                                Nuevas fotos por subir:
                            </p>
                            <div className="form-vehiculo-fotos-grid">
                                {fotosNuevasPreview.map((item, i) => (
                                    <div key={i} className="form-vehiculo-foto-item">
                                        <img src={item.preview} alt={`Foto ${i + 1}`} />
                                        {!esEdicion && i === 0 && (
                                            <div className="form-vehiculo-foto-principal-badge">Principal</div>
                                        )}
                                        <button
                                            type="button"
                                            className="form-vehiculo-foto-quitar"
                                            onClick={() => quitarFotoNueva(i)}
                                            disabled={cargando}
                                            aria-label="Quitar foto"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                                <path d="M1 1 L11 11 M11 1 L1 11" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="form-vehiculo-error animar-shake">{error}</div>
                )}

                {paso && (
                    <div className="form-vehiculo-info">
                        <span className="form-vehiculo-spinner"></span> {paso}
                    </div>
                )}

                <div className="form-vehiculo-acciones">
                    <button
                        type="button"
                        className="form-vehiculo-boton form-vehiculo-boton-cancelar"
                        onClick={cerrar}
                        disabled={cargando}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="form-vehiculo-boton form-vehiculo-boton-crear"
                        disabled={cargando}
                    >
                        {cargando ? "Procesando..." : textoBoton}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default ModalVehiculo;
