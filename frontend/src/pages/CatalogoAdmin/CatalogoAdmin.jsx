// Pantalla admin del catalogo del chequeo: categorias, items y preguntas de aptitud.
// Cualquier cambio se refleja inmediatamente en la app del conductor.
//
// Pacto para-empresas (HU-12 a HU-14): cada elemento es "Base" (lo maneja el
// equipo SISVIA y lo ven todas las empresas) o "Propio" de la empresa. El
// backend manda en cada elemento si es editable y si se puede bloquear; esta
// pantalla solo muestra los botones que correspondan.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import Modal from "../../components/Modal/Modal.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import "./CatalogoAdmin.css";

// Emojis sugeridos para categorias (selector visual)
const EMOJIS_CATEGORIAS = [
    "🛞", "⛽", "🔧", "💡", "🪑", "🚦", "🔩", "🚗",
    "🦶", "🛢️", "🔋", "🪟", "🚪", "🛑", "📋", "🧰",
    "🎚️", "🪞", "🔥", "💨", "🚨", "📍", "⚙️", "🧯",
];

// Tipos de vehiculo a los que aplica un item (HU-15.3). Ninguno marcado = todos.
const TIPOS_VEHICULO = [
    ["automovil", "Automóvil"], ["motocicleta", "Motocicleta"], ["motocarro", "Motocarro"],
    ["camion", "Camión"], ["camioneta", "Camioneta"], ["tractocamion", "Tractocamión"],
    ["microbus", "Microbús"], ["buseta", "Buseta"], ["bus", "Bus"],
];
const nombreTipo = Object.fromEntries(TIPOS_VEHICULO);
const aplicaA = (tipos) => (tipos && tipos.length ? tipos.map((t) => nombreTipo[t] || t).join(", ") : "todos los vehículos");

const RUTAS = {
    categoria: "/catalogo-admin/categorias",
    item: "/catalogo-admin/items",
    pregunta: "/catalogo-admin/preguntas-aptitud",
};

// Etiqueta de origen y estado de un elemento (solo tiene sentido dentro de una empresa).
function Origen({ el, enEmpresa }) {
    if (!enEmpresa) return null;
    return (
        <>
            <span className={`catadmin-badge-origen catadmin-badge-origen--${el.origen}`}>
                {el.origen === "base" ? "Base" : "Propio"}
            </span>
            {el.bloqueado && <span className="catadmin-badge-bloqueado">Bloqueado para esta empresa</span>}
        </>
    );
}

function CatalogoAdmin() {
    const navigate = useNavigate();
    const { usuario, empresaActiva } = useAuth();

    // Quien mira: el superadmin afuera maneja el catalogo base; adentro de una
    // empresa (o el Administrador de empresa) maneja lo propio; el resto solo mira.
    const esSuperadmin = usuario?.rol === "superadmin";
    const dentro = esSuperadmin && !!empresaActiva;
    const enEmpresa = !esSuperadmin || dentro;
    const puedeCrear = esSuperadmin || usuario?.rol === "admin_empresa";
    const subtitulo = esSuperadmin && !dentro
        ? "Catálogo base: lo ven todas las empresas, salvo lo que les bloquees desde adentro de cada una."
        : dentro
        ? `Catálogo de ${empresaActiva.nombre}: lo base se bloquea o desbloquea solo para esta empresa; lo propio se edita.`
        : puedeCrear
        ? "Lo base lo mantiene SISVIA. Agrega lo que tu operación necesite: solo lo ve tu empresa."
        : "Solo lectura: los cambios los hace el Administrador de empresa.";

    // Tab activa
    const [tab, setTab] = useState("categorias");

    // Listas
    const [categorias, setCategorias] = useState([]);
    const [items, setItems] = useState([]);
    const [preguntas, setPreguntas] = useState([]);

    // Estados generales
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState(null);
    // ^ { mensaje: string, tipo: 'exito' | 'error' | 'advertencia' | 'info' }

    // Modal generico de formulario
    const [modal, setModal] = useState(null);
    // ^ { tipo: 'categoria'|'item'|'pregunta', modo: 'crear'|'editar', datos: {...} }

    // Modal de confirmacion de borrado
    const [confirmacion, setConfirmacion] = useState(null);
    // ^ { tipo, id, nombre }

    // Cargar segun tab al cambiar
    useEffect(() => {
        cargarTab(tab);
    }, [tab]);

    const cargarTab = async (cualTab) => {
        setCargando(true);
        try {
            if (cualTab === "categorias") {
                const resp = await api("/catalogo-admin/categorias");
                setCategorias(resp.categorias || []);
            } else if (cualTab === "items") {
                const [respItems, respCats] = await Promise.all([
                    api("/catalogo-admin/items"),
                    api("/catalogo-admin/categorias"),
                ]);
                setItems(respItems.items || []);
                setCategorias(respCats.categorias || []);
            } else if (cualTab === "preguntas") {
                const resp = await api("/catalogo-admin/preguntas-aptitud");
                setPreguntas(resp.preguntas || []);
            }
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setCargando(false);
        }
    };

    // Funciones para abrir el modal de crear/editar
    const abrirCrear = (tipo) => {
        const plantillas = {
            categoria: { nombre: "", descripcion: "", icono: "•", orden: 99 },
            item: { categoria_id: categoriasElegibles[0]?.id || null, descripcion: "", descripcion_larga: "", orden: 99, es_critico: false, aplica_a_tipos: [] },
            pregunta: { pregunta: "", respuesta_apta: "si", orden: 99 },
        };
        setModal({ tipo, modo: "crear", datos: plantillas[tipo] });
    };

    // Categorias donde se puede poner un item: activas y no bloqueadas.
    const categoriasElegibles = categorias.filter((c) => c.activo !== false && !c.bloqueado);

    // HU-14: el superadmin, dentro de la empresa, bloquea o desbloquea algo base.
    // Pide su contraseña como todo cambio adentro (lo maneja el helper api).
    const cambiarBloqueo = async (tipo, el) => {
        try {
            const accion = el.bloqueado ? "desbloquear" : "bloquear";
            await api(`/catalogo-admin/bloqueos/${accion}`, { method: "POST", body: { tipo, elemento_id: el.id } });
            setToast({
                mensaje: el.bloqueado ? "Desbloqueado: la empresa lo vuelve a ver" : "Bloqueado: la empresa ya no lo ve",
                tipo: el.bloqueado ? "exito" : "advertencia",
            });
            cargarTab(tab);
        } catch (err) {
            if (!err.sesionExpirada) setToast({ mensaje: err.message, tipo: "error" });
        }
    };

    const abrirEditar = (tipo, datos) => {
        setModal({ tipo, modo: "editar", datos: { ...datos } });
    };

    const cerrarModal = () => setModal(null);

    const handleChange = (campo, valor) => {
        setModal((m) => ({ ...m, datos: { ...m.datos, [campo]: valor } }));
    };

    const guardar = async () => {
        if (!modal) return;
        try {
            const { tipo, modo, datos } = modal;
            const ruta = RUTAS[tipo];
            const nombreEntidad =
                tipo === "categoria" ? "Categoría" :
                tipo === "item" ? "Ítem" : "Pregunta";
            if (modo === "crear") {
                await api(ruta, { method: "POST", body: datos });
                setToast({ mensaje: `${nombreEntidad} creada correctamente`, tipo: "exito" });
            } else {
                await api(`${ruta}/${datos.id}`, { method: "PUT", body: datos });
                setToast({ mensaje: `${nombreEntidad} actualizada correctamente`, tipo: "exito" });
            }
            cerrarModal();
            cargarTab(tab);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        }
    };

    const pedirConfirmacion = (tipo, item) => {
        const nombre =
            tipo === "categoria" ? item.nombre :
            tipo === "item" ? item.descripcion :
            item.pregunta;
        setConfirmacion({ tipo, id: item.id, nombre });
    };

    const ejecutarBorrado = async () => {
        if (!confirmacion) return;
        try {
            const nombreEntidad =
                confirmacion.tipo === "categoria" ? "Categoría" :
                confirmacion.tipo === "item" ? "Ítem" : "Pregunta";
            const resp = await api(`${RUTAS[confirmacion.tipo]}/${confirmacion.id}`, { method: "DELETE" });
            // El backend devuelve tipo: 'hard' (borrado real) o 'soft' (desactivada por historial)
            if (resp.tipo === "hard") {
                setToast({
                    mensaje: `${nombreEntidad} eliminada permanentemente`,
                    tipo: "exito",
                });
            } else {
                setToast({
                    mensaje: `${nombreEntidad} desactivada (tiene historial en chequeos previos)`,
                    tipo: "advertencia",
                });
            }
            setConfirmacion(null);
            cargarTab(tab);
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        }
    };

    const nombreCategoria = (id) => {
        const c = categorias.find((c) => c.id === id);
        return c ? `${c.icono || ""} ${c.nombre}` : `Categoria #${id}`;
    };

    return (
        <AdminLayout titulo="Catálogo del chequeo">
            {/* Barra de página */}
            <section className="catadmin-barra-pagina">
                <div className="catadmin-barra-titulo">
                    <h1>Catálogo del chequeo</h1>
                    <p>{subtitulo}</p>
                </div>
            </section>

            {/* Tabs */}
            <nav className="catadmin-tabs">
                <button
                    className={`catadmin-tab ${tab === "categorias" ? "catadmin-tab-activa" : ""}`}
                    onClick={() => setTab("categorias")}
                >
                    Categorías
                </button>
                <button
                    className={`catadmin-tab ${tab === "items" ? "catadmin-tab-activa" : ""}`}
                    onClick={() => setTab("items")}
                >
                    Ítems del checklist
                </button>
                <button
                    className={`catadmin-tab ${tab === "preguntas" ? "catadmin-tab-activa" : ""}`}
                    onClick={() => setTab("preguntas")}
                >
                    Preguntas de aptitud
                </button>
            </nav>

            <main className="catadmin-main">
                {cargando && <div className="catadmin-cargando">Cargando...</div>}

                {/* Tab categorias */}
                {tab === "categorias" && !cargando && (
                    <section>
                        <div className="catadmin-toolbar">
                            <div className="catadmin-toolbar-info">
                                {categorias.filter(c => c.activo).length} activas · {categorias.length} totales
                            </div>
                            {puedeCrear && (
                                <button
                                    className="catadmin-boton-crear"
                                    onClick={() => abrirCrear("categoria")}
                                >
                                    + Nueva categoría
                                </button>
                            )}
                        </div>

                        <div className="catadmin-lista">
                            {categorias.map((c) => (
                                <div key={c.id} className={`catadmin-fila ${!c.activo ? "catadmin-fila-inactiva" : ""}`}>
                                    {c.icono && (
                                        <div className="catadmin-fila-icono">{c.icono}</div>
                                    )}
                                    <div className="catadmin-fila-info">
                                        <div className="catadmin-fila-titulo">{c.nombre} <Origen el={c} enEmpresa={enEmpresa} /></div>
                                        {c.descripcion && <div className="catadmin-fila-desc">{c.descripcion}</div>}
                                        <div className="catadmin-fila-meta">
                                            Orden: {c.orden}
                                            {!c.activo && <span className="catadmin-badge-inactivo">INACTIVA</span>}
                                        </div>
                                    </div>
                                    <div className="catadmin-fila-acciones">
                                        {c.editable && (
                                            <button className="catadmin-boton-editar" onClick={() => abrirEditar("categoria", c)}>
                                                Editar
                                            </button>
                                        )}
                                        {c.editable && c.activo && (
                                            <button className="catadmin-boton-eliminar" onClick={() => pedirConfirmacion("categoria", c)}>
                                                Eliminar
                                            </button>
                                        )}
                                        {c.puede_bloquear && (
                                            <button className="catadmin-boton-bloquear" onClick={() => cambiarBloqueo("categoria", c)}>
                                                {c.bloqueado ? "Desbloquear" : "Bloquear"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Tab items */}
                {tab === "items" && !cargando && (
                    <section>
                        <div className="catadmin-toolbar">
                            <div className="catadmin-toolbar-info">
                                {items.filter(i => i.activo).length} activos · {items.filter(i => i.es_critico && i.activo).length} críticos
                            </div>
                            {puedeCrear && (
                                <button
                                    className="catadmin-boton-crear"
                                    onClick={() => abrirCrear("item")}
                                    disabled={categoriasElegibles.length === 0}
                                >
                                    + Nuevo ítem
                                </button>
                            )}
                        </div>

                        {/* Agrupar items por categoria (y los que quedan en una categoria que no se lista) */}
                        {[...categorias, ...(items.some((i) => !categorias.some((c) => c.id === i.categoria_id))
                            ? [{ id: "otras", nombre: "Otras categorías", icono: "" }] : [])].map((cat) => {
                            const itemsCat = cat.id === "otras"
                                ? items.filter((i) => !categorias.some((c) => c.id === i.categoria_id))
                                : items.filter((i) => i.categoria_id === cat.id);
                            if (itemsCat.length === 0) return null;
                            return (
                                <div key={cat.id} className="catadmin-grupo">
                                    <div className="catadmin-grupo-titulo">
                                        {cat.icono} {cat.nombre}
                                        <span className="catadmin-grupo-conteo">({itemsCat.length})</span>
                                    </div>
                                    <div className="catadmin-lista">
                                        {itemsCat.map((it) => (
                                            <div key={it.id} className={`catadmin-fila ${!it.activo ? "catadmin-fila-inactiva" : ""}`}>
                                                <div className="catadmin-fila-info">
                                                    <div className="catadmin-fila-titulo">
                                                        {it.descripcion}
                                                        {it.es_critico && <span className="catadmin-badge-critico">CRÍTICO</span>}
                                                        <Origen el={it} enEmpresa={enEmpresa} />
                                                    </div>
                                                    {it.descripcion_larga && (
                                                        <div className="catadmin-fila-desc">{it.descripcion_larga}</div>
                                                    )}
                                                    <div className="catadmin-fila-meta">
                                                        Orden: {it.orden} · Aplica a: {aplicaA(it.aplica_a_tipos)}
                                                        {!it.activo && <span className="catadmin-badge-inactivo">INACTIVO</span>}
                                                    </div>
                                                </div>
                                                <div className="catadmin-fila-acciones">
                                                    {it.editable && (
                                                        <button className="catadmin-boton-editar" onClick={() => abrirEditar("item", it)}>
                                                            Editar
                                                        </button>
                                                    )}
                                                    {it.editable && it.activo && (
                                                        <button className="catadmin-boton-eliminar" onClick={() => pedirConfirmacion("item", it)}>
                                                            Desactivar
                                                        </button>
                                                    )}
                                                    {it.puede_bloquear && (
                                                        <button className="catadmin-boton-bloquear" onClick={() => cambiarBloqueo("item", it)}>
                                                            {it.bloqueado ? "Desbloquear" : "Bloquear"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                {/* Tab preguntas */}
                {tab === "preguntas" && !cargando && (
                    <section>
                        <div className="catadmin-toolbar">
                            <div className="catadmin-toolbar-info">
                                {preguntas.filter(p => p.activo).length} activas · {preguntas.length} totales
                            </div>
                            {puedeCrear && (
                                <button
                                    className="catadmin-boton-crear"
                                    onClick={() => abrirCrear("pregunta")}
                                >
                                    + Nueva pregunta
                                </button>
                            )}
                        </div>

                        <div className="catadmin-lista">
                            {preguntas.map((p) => (
                                <div key={p.id} className={`catadmin-fila ${!p.activo ? "catadmin-fila-inactiva" : ""}`}>
                                    <div className="catadmin-fila-info">
                                        <div className="catadmin-fila-titulo">{p.pregunta} <Origen el={p} enEmpresa={enEmpresa} /></div>
                                        <div className="catadmin-fila-meta">
                                            Orden: {p.orden} · Respuesta apta: <strong>{p.respuesta_apta.toUpperCase()}</strong>
                                            {!p.activo && <span className="catadmin-badge-inactivo">INACTIVA</span>}
                                        </div>
                                    </div>
                                    <div className="catadmin-fila-acciones">
                                        {p.editable && (
                                            <button className="catadmin-boton-editar" onClick={() => abrirEditar("pregunta", p)}>
                                                Editar
                                            </button>
                                        )}
                                        {p.editable && p.activo && (
                                            <button className="catadmin-boton-eliminar" onClick={() => pedirConfirmacion("pregunta", p)}>
                                                Eliminar
                                            </button>
                                        )}
                                        {p.puede_bloquear && (
                                            <button className="catadmin-boton-bloquear" onClick={() => cambiarBloqueo("pregunta", p)}>
                                                {p.bloqueado ? "Desbloquear" : "Bloquear"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Modal de formulario */}
            <Modal
                abierto={!!modal}
                onCerrar={cerrarModal}
                titulo={
                    modal
                        ? `${modal.modo === "crear" ? "Nueva" : "Editar"} ${
                              modal.tipo === "categoria" ? "categoría" :
                              modal.tipo === "item" ? "ítem" : "pregunta"
                          }`
                        : ""
                }
                ancho="mediano"
            >
                {modal && modal.tipo === "categoria" && (
                    <FormCategoria datos={modal.datos} onChange={handleChange} />
                )}
                {modal && modal.tipo === "item" && (
                    <FormItem datos={modal.datos} onChange={handleChange} categorias={categoriasElegibles} />
                )}
                {modal && modal.tipo === "pregunta" && (
                    <FormPregunta datos={modal.datos} onChange={handleChange} />
                )}
                {modal && (
                    <div className="catadmin-modal-acciones">
                        <button className="catadmin-boton-cancelar" onClick={cerrarModal}>
                            Cancelar
                        </button>
                        <button className="catadmin-boton-guardar" onClick={guardar}>
                            {modal.modo === "crear" ? "Crear" : "Guardar cambios"}
                        </button>
                    </div>
                )}
            </Modal>

            {/* Modal de confirmacion de borrado */}
            <Modal
                abierto={!!confirmacion}
                onCerrar={() => setConfirmacion(null)}
                titulo="Confirmar eliminación"
                ancho="pequeno"
            >
                {confirmacion && (
                    <>
                        <p className="catadmin-confirm-texto">
                            ¿Seguro que quieres eliminar:
                        </p>
                        <p className="catadmin-confirm-nombre">"{confirmacion.nombre}"</p>
                        <p className="catadmin-confirm-aviso">
                            <strong>Si nunca se ha usado en un chequeo</strong>, se elimina permanentemente.
                            <br />
                            <strong>Si ya tiene historial</strong>, solo se desactiva para no romper los chequeos previos
                            (podrás reactivarla después editándola).
                        </p>
                        <div className="catadmin-modal-acciones">
                            <button className="catadmin-boton-cancelar" onClick={() => setConfirmacion(null)}>
                                Cancelar
                            </button>
                            <button className="catadmin-boton-eliminar-confirmar" onClick={ejecutarBorrado}>
                                Sí, eliminar
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Toast de notificaciones */}
            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}
        </AdminLayout>
    );
}

// -- Sub-formularios --

function FormCategoria({ datos, onChange }) {
    return (
        <div className="catadmin-form">
            <label className="catadmin-form-label">
                Nombre
                <input
                    type="text"
                    className="catadmin-form-input catadmin-form-input-uppercase"
                    value={datos.nombre || ""}
                    onChange={(e) => onChange("nombre", e.target.value.toUpperCase())}
                    placeholder="EJ: NIVELES"
                    autoFocus
                />
            </label>

            <label className="catadmin-form-label">
                Descripción
                <input
                    type="text"
                    className="catadmin-form-input"
                    value={datos.descripcion || ""}
                    onChange={(e) => onChange("descripcion", e.target.value)}
                    placeholder="Ej: Niveles de aceite, agua, frenos..."
                />
            </label>

            <div className="catadmin-form-label">
                Ícono (opcional)
                <div className="catadmin-icono-actual">
                    <span className="catadmin-icono-grande">
                        {datos.icono ? datos.icono : <span className="catadmin-icono-vacio">sin ícono</span>}
                    </span>
                    <input
                        type="text"
                        className="catadmin-form-input catadmin-icono-input"
                        value={datos.icono || ""}
                        onChange={(e) => onChange("icono", e.target.value)}
                        placeholder="Escribe un emoji o déjalo vacío"
                        maxLength={4}
                    />
                    <button
                        type="button"
                        className="catadmin-boton-sin-icono"
                        onClick={() => onChange("icono", "")}
                    >
                        Sin ícono
                    </button>
                </div>
                <div className="catadmin-form-ayuda">
                    Puedes escribir cualquier emoji (ej: 🚗) o dejarlo vacío para mostrar solo el texto.
                    Si quieres usar uno de los sugeridos, haz click en él:
                </div>
                <div className="catadmin-emoji-grid">
                    {EMOJIS_CATEGORIAS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            className={`catadmin-emoji-btn ${datos.icono === emoji ? "catadmin-emoji-btn-activo" : ""}`}
                            onClick={() => onChange("icono", emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            <label className="catadmin-form-label">
                Orden (número, más bajo aparece primero)
                <input
                    type="number"
                    className="catadmin-form-input"
                    value={datos.orden || 0}
                    onChange={(e) => onChange("orden", parseInt(e.target.value, 10) || 0)}
                />
            </label>

            {datos.id && (
                <label className="catadmin-form-check">
                    <input
                        type="checkbox"
                        checked={datos.activo !== false}
                        onChange={(e) => onChange("activo", e.target.checked)}
                    />
                    Activa (visible para los conductores)
                </label>
            )}
        </div>
    );
}

function FormItem({ datos, onChange, categorias }) {
    const togglearTipo = (tipo) => {
        const actuales = datos.aplica_a_tipos || [];
        const nuevo = actuales.includes(tipo)
            ? actuales.filter((t) => t !== tipo)
            : [...actuales, tipo];
        onChange("aplica_a_tipos", nuevo);
    };

    return (
        <div className="catadmin-form">
            <label className="catadmin-form-label">
                Categoría
                <select
                    className="catadmin-form-input"
                    value={datos.categoria_id || ""}
                    onChange={(e) => onChange("categoria_id", parseInt(e.target.value, 10))}
                >
                    {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.icono} {c.nombre}
                        </option>
                    ))}
                </select>
            </label>

            <label className="catadmin-form-label">
                Descripción corta (lo que ve el conductor)
                <input
                    type="text"
                    className="catadmin-form-input"
                    value={datos.descripcion || ""}
                    onChange={(e) => onChange("descripcion", e.target.value)}
                    placeholder="Ej: Aceite del motor"
                    autoFocus
                />
            </label>

            <label className="catadmin-form-label">
                Descripción larga (opcional, texto explicativo)
                <textarea
                    className="catadmin-form-textarea"
                    rows={3}
                    value={datos.descripcion_larga || ""}
                    onChange={(e) => onChange("descripcion_larga", e.target.value)}
                    placeholder="Ej: Verificar nivel con la varilla con el motor frío..."
                />
            </label>

            <label className="catadmin-form-label">
                Orden dentro de la categoría
                <input
                    type="number"
                    className="catadmin-form-input"
                    value={datos.orden || 0}
                    onChange={(e) => onChange("orden", parseInt(e.target.value, 10) || 0)}
                />
            </label>

            <label className="catadmin-form-check catadmin-form-check-critico">
                <input
                    type="checkbox"
                    checked={!!datos.es_critico}
                    onChange={(e) => onChange("es_critico", e.target.checked)}
                />
                <strong>Marcar como CRÍTICO</strong>
                <span className="catadmin-form-check-aviso">
                    (Si el conductor marca este ítem como "No cumple", el vehículo se bloquea automáticamente)
                </span>
            </label>

            <div className="catadmin-form-label">
                Aplica a estos vehículos
                <div className="catadmin-checks-tipos">
                    {TIPOS_VEHICULO.map(([t, etiqueta]) => (
                        <label key={t} className="catadmin-form-check">
                            <input
                                type="checkbox"
                                checked={(datos.aplica_a_tipos || []).includes(t)}
                                onChange={() => togglearTipo(t)}
                            />
                            {etiqueta}
                        </label>
                    ))}
                </div>
                <div className="catadmin-form-ayuda">
                    Si no marcas ninguno, aplica a todos los vehículos.
                </div>
            </div>

            {datos.id && (
                <label className="catadmin-form-check">
                    <input
                        type="checkbox"
                        checked={datos.activo !== false}
                        onChange={(e) => onChange("activo", e.target.checked)}
                    />
                    Activo (visible en el checklist del conductor)
                </label>
            )}
        </div>
    );
}

function FormPregunta({ datos, onChange }) {
    return (
        <div className="catadmin-form">
            <label className="catadmin-form-label">
                Pregunta (la que ve el conductor)
                <textarea
                    className="catadmin-form-textarea"
                    rows={3}
                    value={datos.pregunta || ""}
                    onChange={(e) => onChange("pregunta", e.target.value)}
                    placeholder="Ej: ¿Descansó lo suficiente (mínimo 8-10 horas de sueño)?"
                    autoFocus
                />
            </label>

            <div className="catadmin-form-label">
                Respuesta apta (cuál es la respuesta correcta para considerar al conductor APTO)
                <div className="catadmin-radio-grupo">
                    <label className={`catadmin-radio ${datos.respuesta_apta === "si" ? "catadmin-radio-activo-si" : ""}`}>
                        <input
                            type="radio"
                            checked={datos.respuesta_apta === "si"}
                            onChange={() => onChange("respuesta_apta", "si")}
                        />
                        SÍ
                    </label>
                    <label className={`catadmin-radio ${datos.respuesta_apta === "no" ? "catadmin-radio-activo-no" : ""}`}>
                        <input
                            type="radio"
                            checked={datos.respuesta_apta === "no"}
                            onChange={() => onChange("respuesta_apta", "no")}
                        />
                        NO
                    </label>
                </div>
                <div className="catadmin-form-ayuda">
                    <strong>Ejemplo:</strong> En "¿Descansó lo suficiente?" la apta es SÍ. En "¿Tomó medicamentos?" la apta es NO.
                </div>
            </div>

            <label className="catadmin-form-label">
                Orden (más bajo aparece primero)
                <input
                    type="number"
                    className="catadmin-form-input"
                    value={datos.orden || 0}
                    onChange={(e) => onChange("orden", parseInt(e.target.value, 10) || 0)}
                />
            </label>

            {datos.id && (
                <label className="catadmin-form-check">
                    <input
                        type="checkbox"
                        checked={datos.activo !== false}
                        onChange={(e) => onChange("activo", e.target.checked)}
                    />
                    Activa (visible para los conductores)
                </label>
            )}
        </div>
    );
}

export default CatalogoAdmin;
