// Detalle completo de un chequeo: cabecera, vehiculo, conductor, aptitud, checklist por categoria, notas.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import Toast from "../../components/Toast/Toast.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import BotonVolver from "../../components/BotonVolver/BotonVolver.jsx";
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import "./ChequeoDetalle.css";

const CONFIG_ESTADO = {
    operativo: { label: "OPERATIVO", clase: "ok" },
    observacion: { label: "OBSERVACIÓN", clase: "obs" },
    alerta: { label: "ALERTA", clase: "alerta" },
    critico: { label: "CRÍTICO", clase: "critico" },
    no_operativo: { label: "NO OPERATIVO", clase: "no-op" },
};

const formatearFechaHora = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const formatearFecha = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
    });
};

function ChequeoDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { usuario, cerrarSesion } = useAuth();

    const [chequeo, setChequeo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    // Estado por foto para mostrar "Guardando..." mientras se actualiza preservar_siempre
    const [preservando, setPreservando] = useState({});

    const manejarLogout = () => {
        cerrarSesion();
        navigate("/login");
    };

    // Marca/desmarca una foto como preservar_siempre. Actualiza el estado local
    // sin volver a pedir todo el chequeo al backend (más rápido y mantiene la posición).
    const togglePreservar = async (fotoId, preservar) => {
        setPreservando((prev) => ({ ...prev, [fotoId]: true }));
        try {
            await api(`/respuestas/fotos/${fotoId}/preservar`, {
                method: "PATCH",
                body: { preservar },
            });
            // Actualizar la foto en el estado local
            setChequeo((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    respuestas_chequeo: (prev.respuestas_chequeo || []).map((r) => ({
                        ...r,
                        fotos: (r.fotos || []).map((f) =>
                            f.id === fotoId
                                ? { ...f, preservar_siempre: preservar, fecha_borrado_programado: preservar ? null : f.fecha_borrado_programado }
                                : f
                        ),
                    })),
                };
            });
            setToast({
                mensaje: preservar
                    ? "Foto marcada para preservar siempre"
                    : "Foto restablecida (se borrará automáticamente a los 12 meses)",
                tipo: preservar ? "exito" : "advertencia",
            });
        } catch (err) {
            if (!err.sesionExpirada) {
                setToast({ mensaje: err.message, tipo: "error" });
            }
        } finally {
            setPreservando((prev) => ({ ...prev, [fotoId]: false }));
        }
    };

    useEffect(() => {
        setCargando(true);
        api(`/chequeos/${id}`)
            .then((data) => {
                setChequeo(data.chequeo);
            })
            .catch((err) => {
                if (!err.sesionExpirada) {
                    setError(err.message);
                    setToast({ mensaje: err.message, tipo: "error" });
                }
            })
            .finally(() => setCargando(false));
    }, [id]);

    if (cargando) {
        return (
            <div className="cheqdet-pagina">
                <div className="cheqdet-cargando">Cargando chequeo...</div>
            </div>
        );
    }

    if (error || !chequeo) {
        return (
            <div className="cheqdet-pagina">
                <div className="cheqdet-error">
                    No se pudo cargar el chequeo. {error || ""}
                </div>
                <BotonVolver a="/admin/chequeos" texto="Volver al listado" />
            </div>
        );
    }

    const v = chequeo.vehiculo || {};
    const c = chequeo.conductor || {};
    const fotoPrincipal = (v.fotos || []).find((f) => f.es_principal) || (v.fotos || [])[0];
    const config = CONFIG_ESTADO[chequeo.resultado_estado] || null;

    // Agrupar respuestas del checklist por categoria
    const respuestasPorCategoria = (chequeo.respuestas_chequeo || []).reduce((acc, r) => {
        const catId = r.item?.categoria?.id;
        if (!catId) return acc;
        if (!acc[catId]) {
            acc[catId] = {
                categoria: r.item.categoria,
                respuestas: [],
            };
        }
        acc[catId].respuestas.push(r);
        return acc;
    }, {});
    const categoriasOrdenadas = Object.values(respuestasPorCategoria).sort(
        (a, b) => (a.categoria.orden || 0) - (b.categoria.orden || 0)
    );

    return (
        <div className="cheqdet-pagina">
            {/* Header de marca */}
            <header className="cheqdet-header-marca">
                <div className="cheqdet-logo-wrapper">
                    <img src="/logo.png" alt="SISVIA" className="cheqdet-logo-img" />
                    <div className="cheqdet-titulo-app">Gestión de Flota</div>
                </div>
                <div className="cheqdet-usuario">
                    <div className="cheqdet-usuario-info">
                        <div className="cheqdet-usuario-nombre">{usuario?.nombre_completo}</div>
                        <div className="cheqdet-usuario-rol">{usuario?.rol}</div>
                    </div>
                    <button className="cheqdet-logout" onClick={manejarLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {/* Barra de página */}
            <section className="cheqdet-barra-pagina">
                <BotonVolver a="/admin/chequeos" texto="Volver al listado" />
                <div className="cheqdet-barra-titulo">
                    <h1>Detalle del chequeo</h1>
                    <p>{v.placa || "—"} · {formatearFecha(chequeo.fecha)}</p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <BotonExportar
                        base={`/export/chequeo/${chequeo.id}`}
                        nombre={`chequeo-${v.placa || chequeo.id}`}
                    />
                </div>
            </section>

            <main className="cheqdet-main">
                {/* Sección 1: Resultado y resumen */}
                <section className={`cheqdet-resultado-bloque cheqdet-resultado-${config?.clase || "sin"}`}>
                    <div className="cheqdet-resultado-cabecera">
                        <div className="cheqdet-resultado-titulo">
                            {chequeo.cerrado ? "Resultado del chequeo" : "Chequeo en proceso"}
                        </div>
                        <div className="cheqdet-resultado-badges">
                            <span className={`cheqdet-badge-tipo cheqdet-badge-tipo-${chequeo.tipo}`}>
                                {chequeo.tipo === "postoperacional" ? "POST-OPERACIONAL" : "PREOPERACIONAL"}
                            </span>
                            <span className={chequeo.es_oficial ? "cheqdet-badge-oficial" : "cheqdet-badge-rechequeo"}>
                                {chequeo.es_oficial ? "OFICIAL" : "RECHEQUEO"}
                            </span>
                        </div>
                    </div>

                    {chequeo.cerrado && config && (
                        <div className={`cheqdet-resultado-estado cheqdet-resultado-estado-${config.clase}`}>
                            <span className="cheqdet-resultado-estado-label">VEHÍCULO</span>
                            <span className="cheqdet-resultado-estado-valor">{config.label}</span>
                        </div>
                    )}

                    {!chequeo.cerrado && (
                        <div className="cheqdet-en-proceso">
                            El conductor empezó este chequeo pero no lo finalizó. No tiene resultado calculado todavía.
                        </div>
                    )}

                    {chequeo.cerrado && (
                        <div className="cheqdet-resumen-conteos">
                            <div className="cheqdet-conteo cheqdet-conteo-cumple">
                                <div className="cheqdet-conteo-numero">{chequeo.items_cumple_count ?? 0}</div>
                                <div className="cheqdet-conteo-label">Cumple</div>
                            </div>
                            <div className="cheqdet-conteo cheqdet-conteo-no-cumple">
                                <div className="cheqdet-conteo-numero">{chequeo.items_no_cumple_count ?? 0}</div>
                                <div className="cheqdet-conteo-label">No cumple</div>
                            </div>
                            <div className="cheqdet-conteo cheqdet-conteo-na">
                                <div className="cheqdet-conteo-numero">{chequeo.items_no_aplica_count ?? 0}</div>
                                <div className="cheqdet-conteo-label">N/A</div>
                            </div>
                            {chequeo.tiene_falla_critica && (
                                <div className="cheqdet-conteo cheqdet-conteo-critico">
                                    <div className="cheqdet-conteo-numero">!</div>
                                    <div className="cheqdet-conteo-label">Falla crítica</div>
                                </div>
                            )}
                        </div>
                    )}

                    <dl className="cheqdet-meta-grid">
                        <div>
                            <dt>Inicio del chequeo</dt>
                            <dd>{formatearFechaHora(chequeo.fecha)}</dd>
                        </div>
                        {chequeo.fecha_cierre && (
                            <div>
                                <dt>Cierre del chequeo</dt>
                                <dd>{formatearFechaHora(chequeo.fecha_cierre)}</dd>
                            </div>
                        )}
                        <div>
                            <dt>Kilometraje registrado</dt>
                            <dd>{typeof chequeo.kilometraje === "number" ? `${chequeo.kilometraje.toLocaleString()} km` : "—"}</dd>
                        </div>
                    </dl>
                </section>

                {/* Sección 2: Vehículo */}
                <section className="cheqdet-tarjeta">
                    <h2 className="cheqdet-tarjeta-titulo">Vehículo</h2>
                    <div className="cheqdet-vehiculo-bloque">
                        {fotoPrincipal && (
                            <img src={fotoPrincipal.url} alt={v.placa} className="cheqdet-vehiculo-foto" />
                        )}
                        <div className="cheqdet-vehiculo-datos">
                            <div className="cheqdet-vehiculo-placa">{v.placa || "—"}</div>
                            <div className="cheqdet-vehiculo-marca">
                                {v.marca} {v.linea} · {v.modelo_anio || "s/año"}
                            </div>
                            <dl className="cheqdet-meta-grid cheqdet-meta-grid-compacto">
                                <div>
                                    <dt>Tipo</dt>
                                    <dd>{v.tipo || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Color</dt>
                                    <dd>{v.color || "—"}</dd>
                                </div>
                                <div>
                                    <dt>VIN</dt>
                                    <dd>{v.vin || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Estado actual</dt>
                                    <dd>{(v.estado || "—").replace("_", " ")}</dd>
                                </div>
                            </dl>
                            <button
                                className="cheqdet-link-vehiculo"
                                onClick={() => navigate(`/admin/vehiculos/${v.id}`)}
                            >
                                Ver ficha completa del vehículo →
                            </button>
                        </div>
                    </div>
                </section>

                {/* Sección 3: Conductor */}
                <section className="cheqdet-tarjeta">
                    <h2 className="cheqdet-tarjeta-titulo">Conductor</h2>
                    <div className="cheqdet-conductor-bloque">
                        {c.foto_url ? (
                            <img src={c.foto_url} alt={c.nombre_completo} className="cheqdet-conductor-foto" />
                        ) : (
                            <div className="cheqdet-conductor-foto-placeholder">
                                {(c.nombre_completo || "?").charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="cheqdet-conductor-datos">
                            <div className="cheqdet-conductor-nombre">{c.nombre_completo || "—"}</div>
                            <dl className="cheqdet-meta-grid cheqdet-meta-grid-compacto">
                                <div>
                                    <dt>Cédula</dt>
                                    <dd>{c.cedula || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Teléfono</dt>
                                    <dd>{c.telefono || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Licencia (número)</dt>
                                    <dd>{c.licencia_numero || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Categoría licencia</dt>
                                    <dd>{c.licencia_categoria || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Vencimiento licencia</dt>
                                    <dd>{formatearFecha(c.licencia_vencimiento)}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </section>

                {/* Sección 4: Aptitud personal */}
                <section className="cheqdet-tarjeta">
                    <h2 className="cheqdet-tarjeta-titulo">Aptitud personal del conductor</h2>
                    {(chequeo.respuestas_aptitud || []).length === 0 ? (
                        <div className="cheqdet-vacio">No se registraron respuestas de aptitud.</div>
                    ) : (
                        <div className="cheqdet-aptitud-lista">
                            {chequeo.respuestas_aptitud.map((r) => (
                                <div
                                    key={r.id}
                                    className={`cheqdet-aptitud-fila ${r.es_apto ? "cheqdet-aptitud-apta" : "cheqdet-aptitud-no-apta"}`}
                                >
                                    <div className="cheqdet-aptitud-icono">
                                        {r.es_apto ? "✓" : "✕"}
                                    </div>
                                    <div className="cheqdet-aptitud-texto">
                                        <div className="cheqdet-aptitud-pregunta">{r.pregunta?.pregunta || "—"}</div>
                                        <div className="cheqdet-aptitud-respuesta">
                                            Respuesta: <strong>{(r.respuesta || "—").toUpperCase()}</strong>
                                            {r.pregunta?.respuesta_apta && (
                                                <span className="cheqdet-aptitud-esperada">
                                                    {" "}· Apta: {r.pregunta.respuesta_apta.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Sección 5: Checklist por categoría */}
                <section className="cheqdet-tarjeta">
                    <h2 className="cheqdet-tarjeta-titulo">
                        Checklist del vehículo
                        <span className="cheqdet-tarjeta-conteo">
                            ({(chequeo.respuestas_chequeo || []).length} ítems)
                        </span>
                    </h2>

                    {categoriasOrdenadas.length === 0 ? (
                        <div className="cheqdet-vacio">El conductor no respondió ningún ítem del checklist.</div>
                    ) : (
                        <div className="cheqdet-categorias">
                            {categoriasOrdenadas.map(({ categoria, respuestas }) => (
                                <div key={categoria.id} className="cheqdet-categoria">
                                    <div className="cheqdet-categoria-cabecera">
                                        {categoria.icono && (
                                            <span className="cheqdet-categoria-icono">{categoria.icono}</span>
                                        )}
                                        <span className="cheqdet-categoria-nombre">{categoria.nombre}</span>
                                        <span className="cheqdet-categoria-cantidad">
                                            {respuestas.length} ítem{respuestas.length === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    <div className="cheqdet-items">
                                        {respuestas
                                            .sort((a, b) => (a.item?.orden || 0) - (b.item?.orden || 0))
                                            .map((r) => (
                                                <article
                                                    key={r.id}
                                                    className={`cheqdet-item cheqdet-item-${r.estado}`}
                                                >
                                                    <div className="cheqdet-item-cabecera">
                                                        <div className="cheqdet-item-descripcion">
                                                            {r.item?.descripcion || "—"}
                                                            {r.item?.es_critico && (
                                                                <span className="cheqdet-item-badge-critico">CRÍTICO</span>
                                                            )}
                                                        </div>
                                                        <span className={`cheqdet-item-estado cheqdet-item-estado-${r.estado}`}>
                                                            {r.estado === "cumple" ? "Cumple" :
                                                             r.estado === "no_cumple" ? "No cumple" :
                                                             r.estado === "no_aplica" ? "N/A" : r.estado}
                                                        </span>
                                                    </div>

                                                    {r.observacion && (
                                                        <div className="cheqdet-item-observacion">
                                                            <div className="cheqdet-item-observacion-label">
                                                                Observación del conductor:
                                                            </div>
                                                            <div className="cheqdet-item-observacion-texto">
                                                                {r.observacion}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(r.fotos || []).length > 0 && (
                                                        <div className="cheqdet-item-fotos">
                                                            <div className="cheqdet-item-fotos-label">
                                                                Evidencia fotográfica ({r.fotos.length}):
                                                            </div>
                                                            <div className="cheqdet-item-fotos-grid">
                                                                {r.fotos.map((f) => (
                                                                    <div
                                                                        key={f.id}
                                                                        className={`cheqdet-foto-tarjeta ${f.preservar_siempre ? "cheqdet-foto-preservada" : ""}`}
                                                                    >
                                                                        <a
                                                                            href={f.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="cheqdet-foto-link"
                                                                        >
                                                                            <img
                                                                                src={f.url}
                                                                                alt={f.descripcion || "Evidencia"}
                                                                                className="cheqdet-foto-thumb"
                                                                            />
                                                                            {f.preservar_siempre && (
                                                                                <span className="cheqdet-foto-badge-preservada">
                                                                                    PRESERVADA
                                                                                </span>
                                                                            )}
                                                                        </a>
                                                                        <button
                                                                            type="button"
                                                                            className={`cheqdet-foto-boton-preservar ${f.preservar_siempre ? "cheqdet-foto-boton-quitar" : ""}`}
                                                                            disabled={!!preservando[f.id]}
                                                                            onClick={() => togglePreservar(f.id, !f.preservar_siempre)}
                                                                            title={
                                                                                f.preservar_siempre
                                                                                    ? "Quitar protección. La foto se borrará automáticamente a los 12 meses de subida."
                                                                                    : "Marcar para conservar sin borrado automático (por ejemplo si es evidencia de un reclamo)."
                                                                            }
                                                                        >
                                                                            {preservando[f.id]
                                                                                ? "Guardando..."
                                                                                : f.preservar_siempre
                                                                                    ? "Quitar preservar"
                                                                                    : "Preservar siempre"}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Sección 6: Notas generales */}
                {chequeo.notas_generales && (
                    <section className="cheqdet-tarjeta">
                        <h2 className="cheqdet-tarjeta-titulo">Notas generales del conductor</h2>
                        <div className="cheqdet-notas">{chequeo.notas_generales}</div>
                    </section>
                )}
            </main>

            {toast && (
                <Toast
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    duracion={3500}
                    posicion="arriba-sede"
                    onCerrar={() => setToast(null)}
                />
            )}

            <Footer />
        </div>
    );
}

export default ChequeoDetalle;
