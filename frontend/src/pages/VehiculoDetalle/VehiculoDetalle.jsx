import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import Footer from "../../components/Footer/Footer.jsx";
import Lightbox from "../../components/Lightbox/Lightbox.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import BotonVolver from "../../components/BotonVolver/BotonVolver.jsx";
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import ModalVehiculo from "../VehiculosAdmin/components/ModalVehiculo.jsx";
import "./VehiculoDetalle.css";

const ESTADOS_INFO = {
    operativo: { texto: "Operativo", color: "verde" },
    observacion: { texto: "Observación", color: "azul" },
    alerta: { texto: "Alerta", color: "amarillo" },
    critico: { texto: "Crítico", color: "rojo" },
    no_operativo: { texto: "No operativo", color: "oscuro" },
};

const TIPOS_LABEL = {
    camion: "Camión",
    camioneta: "Camioneta",
    tractocamion: "Tractocamión",
    automovil: "Automóvil",
    motocicleta: "Motocicleta",
    motocarro: "Motocarro",
    microbus: "Microbús",
    buseta: "Buseta",
    bus: "Bus",
};

const formatearFecha = (valor) => {
    if (!valor) return "—";
    const fecha = new Date(valor);
    return fecha.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

const formatearNumero = (valor) => {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("es-CO");
};

function VehiculoDetalle() {
    const { id } = useParams();
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();
    const [vehiculo, setVehiculo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [lightboxAbierto, setLightboxAbierto] = useState(false);
    const [lightboxIndice, setLightboxIndice] = useState(0);
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [toast, setToast] = useState(null);

    const mostrarToast = (mensaje, tipo = "exito", posicion = "abajo-derecha") => {
        setToast({ mensaje, tipo, posicion, key: Date.now() });
    };

    const cargar = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await api(`/vehiculos/${id}`);
            setVehiculo(data.vehiculo);
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (usuario) cargar();
    }, [usuario, id]);

    const abrirLightbox = (i) => {
        setLightboxIndice(i);
        setLightboxAbierto(true);
    };

    const cerrar = () => {
        cerrarSesion();
        navigate("/login");
    };

    if (cargando) {
        return (
            <div className="vehiculo-detalle">
                <div className="vehiculo-detalle-estado-cargando">
                    Cargando información del vehículo...
                </div>
            </div>
        );
    }

    if (error || !vehiculo) {
        return (
            <div className="vehiculo-detalle">
                <div className="vehiculo-detalle-estado-error animar-shake">
                    {error || "Vehículo no encontrado"}
                </div>
                <BotonVolver a="/admin/vehiculos" texto="Volver al listado" />
            </div>
        );
    }

    const estadoInfo = ESTADOS_INFO[vehiculo.estado] || ESTADOS_INFO.operativo;
    const fotos = vehiculo.fotos || [];
    const fotoPrincipal =
        fotos.find((f) => f.es_principal) || fotos[0] || null;
    const ubicacion = vehiculo.sede
        ? [
              vehiculo.sede.nombre,
              vehiculo.sede.ciudad?.nombre,
              vehiculo.sede.ciudad?.departamento?.nombre,
          ]
              .filter(Boolean)
              .join(" · ")
        : null;

    return (
        <div className="vehiculo-detalle">
            <header className="vehiculo-detalle-header">
                <div className="vehiculo-detalle-logo-wrapper">
                    <img src="/logo.png" alt="SISVIA" className="vehiculo-detalle-logo-img" />
                    <div className="vehiculo-detalle-titulo-pagina">Gestión de Flota</div>
                </div>
                <div className="vehiculo-detalle-usuario">
                    <div className="vehiculo-detalle-usuario-info">
                        <div className="vehiculo-detalle-usuario-nombre">{usuario.nombre_completo}</div>
                        <div className="vehiculo-detalle-usuario-rol">{usuario.rol}</div>
                    </div>
                    <button className="vehiculo-detalle-logout" onClick={cerrar}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="vehiculo-detalle-main">
                <BotonVolver a="/admin/vehiculos" texto="Volver al listado" />

                <section className={`vehiculo-detalle-hero vehiculo-detalle-hero-${estadoInfo.color} ${!vehiculo.activo ? "vehiculo-detalle-hero-inactivo" : ""}`}>
                    <div className="vehiculo-detalle-hero-foto">
                        {fotoPrincipal ? (
                            <img
                                src={fotoPrincipal.url}
                                alt={vehiculo.placa}
                                onClick={() => abrirLightbox(fotos.indexOf(fotoPrincipal))}
                                className="vehiculo-detalle-hero-foto-img"
                            />
                        ) : (
                            <div className="vehiculo-detalle-hero-foto-placeholder">
                                Sin foto registrada
                            </div>
                        )}
                    </div>
                    <div className="vehiculo-detalle-hero-info">
                        <div className="vehiculo-detalle-placa">{vehiculo.placa}</div>
                        <div className="vehiculo-detalle-marca">
                            {vehiculo.marca} {vehiculo.linea}
                        </div>
                        <div className="vehiculo-detalle-meta">
                            <span>{TIPOS_LABEL[vehiculo.tipo] || vehiculo.tipo}</span>
                            {vehiculo.modelo_anio && <span>· Modelo {vehiculo.modelo_anio}</span>}
                            {vehiculo.color && <span>· {vehiculo.color}</span>}
                        </div>
                        <div className={`vehiculo-detalle-badge vehiculo-detalle-badge-${estadoInfo.color}`}>
                            {estadoInfo.texto} · {vehiculo.nivel_criticidad}%
                        </div>
                        {!vehiculo.activo && (
                            <div className="vehiculo-detalle-badge-inactivo">
                                Vehículo inactivo
                            </div>
                        )}
                        <div className="vehiculo-detalle-acciones">
                            <button
                                className="vehiculo-detalle-boton vehiculo-detalle-boton-primario"
                                onClick={() => setModalEditarAbierto(true)}
                            >
                                Editar
                            </button>
                            {vehiculo.runt_url && (
                                <a
                                    href={vehiculo.runt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="vehiculo-detalle-boton vehiculo-detalle-boton-secundario"
                                >
                                    Abrir RUNT
                                </a>
                            )}
                            <BotonExportar
                                base={`/export/vehiculo/${vehiculo.id}`}
                                nombre={`vehiculo-${vehiculo.placa || vehiculo.id}`}
                            />
                        </div>
                    </div>
                </section>

                <div className="vehiculo-detalle-columnas">
                    <section className="vehiculo-detalle-tarjeta">
                        <h2 className="vehiculo-detalle-tarjeta-titulo">Información general</h2>
                        <dl className="vehiculo-detalle-datos">
                            <div className="vehiculo-detalle-dato">
                                <dt>VIN / Chasis</dt>
                                <dd>{vehiculo.vin || "—"}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Tipo</dt>
                                <dd>{TIPOS_LABEL[vehiculo.tipo] || vehiculo.tipo}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Año modelo</dt>
                                <dd>{vehiculo.modelo_anio || "—"}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Color</dt>
                                <dd>{vehiculo.color || "—"}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Kilometraje actual</dt>
                                <dd>{formatearNumero(vehiculo.kilometraje_actual)} km</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Estado activo</dt>
                                <dd>{vehiculo.activo ? "Sí" : "No"}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="vehiculo-detalle-tarjeta">
                        <h2 className="vehiculo-detalle-tarjeta-titulo">Documentación y fechas</h2>
                        <dl className="vehiculo-detalle-datos">
                            <div className="vehiculo-detalle-dato">
                                <dt>Vencimiento SOAT</dt>
                                <dd>{formatearFecha(vehiculo.soat_vencimiento)}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Vencimiento RTM</dt>
                                <dd>{formatearFecha(vehiculo.rtm_vencimiento)}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Vencimiento extintor</dt>
                                <dd>{formatearFecha(vehiculo.extintor_vencimiento)}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Último cambio de aceite</dt>
                                <dd>{formatearFecha(vehiculo.ultimo_cambio_aceite)}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Registrado el</dt>
                                <dd>{formatearFecha(vehiculo.created_at)}</dd>
                            </div>
                            <div className="vehiculo-detalle-dato">
                                <dt>Última actualización</dt>
                                <dd>{formatearFecha(vehiculo.updated_at)}</dd>
                            </div>
                        </dl>
                    </section>
                </div>

                {ubicacion && (
                    <section className="vehiculo-detalle-tarjeta">
                        <h2 className="vehiculo-detalle-tarjeta-titulo">Ubicación</h2>
                        <p className="vehiculo-detalle-ubicacion">{ubicacion}</p>
                        {vehiculo.sede?.direccion && (
                            <p className="vehiculo-detalle-direccion">{vehiculo.sede.direccion}</p>
                        )}
                    </section>
                )}

                {vehiculo.notas && (
                    <section className="vehiculo-detalle-tarjeta">
                        <h2 className="vehiculo-detalle-tarjeta-titulo">Notas y observaciones</h2>
                        <p className="vehiculo-detalle-notas">{vehiculo.notas}</p>
                    </section>
                )}

                <section className="vehiculo-detalle-tarjeta">
                    <h2 className="vehiculo-detalle-tarjeta-titulo">
                        Galería de fotos
                        <span className="vehiculo-detalle-tarjeta-contador">
                            {fotos.length} foto{fotos.length === 1 ? "" : "s"}
                        </span>
                    </h2>
                    {fotos.length === 0 ? (
                        <p className="vehiculo-detalle-vacio">
                            No hay fotos registradas para este vehículo.
                        </p>
                    ) : (
                        <div className="vehiculo-detalle-galeria">
                            {fotos.map((foto, i) => (
                                <button
                                    key={foto.id}
                                    type="button"
                                    className="vehiculo-detalle-galeria-item"
                                    onClick={() => abrirLightbox(i)}
                                >
                                    <img src={foto.url} alt={foto.descripcion || `Foto ${i + 1}`} />
                                    {foto.es_principal && (
                                        <span className="vehiculo-detalle-galeria-badge">Principal</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="vehiculo-detalle-tarjeta">
                    <h2 className="vehiculo-detalle-tarjeta-titulo">
                        Documento RUNT
                        {vehiculo.runt_url && (
                            <a
                                href={vehiculo.runt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vehiculo-detalle-tarjeta-accion"
                            >
                                Abrir en nueva pestaña ↗
                            </a>
                        )}
                    </h2>
                    {vehiculo.runt_url ? (
                        <div className="vehiculo-detalle-runt">
                            <iframe
                                src={vehiculo.runt_url}
                                title={`RUNT ${vehiculo.placa}`}
                                className="vehiculo-detalle-runt-iframe"
                            />
                        </div>
                    ) : (
                        <p className="vehiculo-detalle-vacio">
                            Este vehículo no tiene archivo RUNT adjunto. Puedes subirlo desde el botón Editar.
                        </p>
                    )}
                </section>
            </main>

            <Lightbox
                fotos={fotos}
                indiceInicial={lightboxIndice}
                abierto={lightboxAbierto}
                onCerrar={() => setLightboxAbierto(false)}
            />

            <ModalVehiculo
                abierto={modalEditarAbierto}
                onCerrar={() => setModalEditarAbierto(false)}
                vehiculo={vehiculo}
                mostrarToast={mostrarToast}
                onGuardado={(actualizado) => {
                    mostrarToast(
                        `Vehículo ${actualizado?.placa || vehiculo.placa} actualizado exitosamente`,
                        "exito"
                    );
                    cargar();
                }}
            />

            {toast && (
                <Toast
                    key={toast.key}
                    mensaje={toast.mensaje}
                    tipo={toast.tipo}
                    posicion={toast.posicion}
                    onCerrar={() => setToast(null)}
                />
            )}

            <Footer />
        </div>
    );
}

export default VehiculoDetalle;
