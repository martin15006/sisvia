// Mi perfil — pagina dedicada para que el usuario logueado vea y edite
// SUS PROPIOS datos personales (Tarea #100).
//
// Reglas de negocio:
//   - Foto, nombre y telefono: el propio usuario los puede cambiar.
//   - Cedula y correo: SOLO un admin de rango superior puede cambiarlos
//     (el usuario los ve en modo lectura con un mensaje explicativo).
//   - Cambiar contraseña: link al flujo /cambiar-password ya existente.
//
// Se monta dentro de AdminLayout para admins. Si un conductor entra aqui,
// se mostraria igual pero sin el sidebar (esto se decide cuando hagamos
// el perfil del conductor — por ahora solo lo usa el admin).

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api, API_URL } from "../../lib/api.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import MarcaDueno from "../../components/MarcaDueno/MarcaDueno.jsx";
import CambiarMarca from "../../components/CambiarMarca/CambiarMarca.jsx";
import InputPassword from "../../components/InputPassword/InputPassword.jsx";
import { ETIQUETA_ROL } from "../../lib/roles.js";
import { filtrarTelefono, telefonoValido, AVISO_TELEFONO, EJEMPLO_TELEFONO } from "../../lib/telefono.js";
import "./MiPerfil.css";

function MiPerfil() {
    const { usuario, actualizarUsuario } = useAuth();
    const navigate = useNavigate();

    // Form para los campos editables. Se inicializa con los valores actuales.
    const [form, setForm] = useState({
        nombre_completo: "",
        telefono: "",
    });
    const [foto, setFoto] = useState(null);            // archivo seleccionado
    // Si la contraseña falla, la foto ya subida se reusa al reintentar (no se sube dos veces)
    const [fotoSubida, setFotoSubida] = useState(null);
    // Todo cambio pide la contraseña de la persona (pedido de Martín, 2026-09-23)
    const [password, setPassword] = useState("");
    const [fotoPreview, setFotoPreview] = useState(null); // url preview o url remota
    const [cargando, setCargando] = useState(false);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    // HU-20.5-7: dar, pasar o quitarse la marca de dueño
    const [cambiarMarca, setCambiarMarca] = useState(null);
    const [duenos, setDuenos] = useState([]);
    const [versionDuenos, setVersionDuenos] = useState(0);
    const esDueno = usuario?.rol === "superadmin" && usuario?.es_dueno === true;

    // Pacto correos-de-soporte, HU-03: el interruptor de los correos de Soporte.
    // Solo para quienes los reciben; se guarda al tocarlo, sin contraseña.
    const recibeSoporte = usuario?.rol === "superadmin" || usuario?.rol === "admin_empresa";
    const correosPrendidos = usuario?.correos_soporte !== false;
    const [guardandoCorreos, setGuardandoCorreos] = useState(false);

    // Avisos contextuales debajo de cada campo (mismo patron que ModalCrear/Editar).
    // Se muestran al tipear un caracter no permitido y se borran a los 2.5s.
    const [avisos, setAvisos] = useState({});
    const timersAvisos = useRef({});

    // Ref al input file oculto para disparar el dialogo desde el boton
    const fileInputRef = useRef(null);

    const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

    const cambiarCorreos = async () => {
        if (guardandoCorreos) return;
        setGuardandoCorreos(true);
        try {
            const resp = await api("/auth/mi-perfil/correos-soporte", {
                method: "PATCH",
                body: { activo: !correosPrendidos },
            });
            if (actualizarUsuario) actualizarUsuario({ ...usuario, correos_soporte: resp.correos_soporte });
            mostrarToast(resp.mensaje, "exito");
        } catch (err) {
            mostrarToast(err.message || "No se pudo guardar. Intenta de nuevo.", "error");
        } finally {
            setGuardandoCorreos(false);
        }
    };
    const otrosDuenos = duenos.filter((d) => d.id !== usuario?.id);

    // HU-20.3: quiénes más tienen la marca
    useEffect(() => {
        if (usuario?.rol !== "superadmin") return undefined;
        let vigente = true;
        api("/equipo/duenos")
            .then((r) => { if (vigente) setDuenos(r.duenos || []); })
            .catch(() => { /* si falla, la sección igual funciona */ });
        return () => { vigente = false; };
    }, [usuario?.rol, versionDuenos]);

    const mostrarAviso = (campo, mensaje) => {
        if (timersAvisos.current[campo]) {
            clearTimeout(timersAvisos.current[campo]);
        }
        setAvisos((prev) => ({ ...prev, [campo]: mensaje }));
        timersAvisos.current[campo] = setTimeout(() => {
            setAvisos((prev) => {
                const copia = { ...prev };
                delete copia[campo];
                return copia;
            });
            delete timersAvisos.current[campo];
        }, 2500);
    };

    const filtrarConAviso = (valor, filtro, campo, mensajeAviso) => {
        const filtrado = filtro(valor);
        if (filtrado.length < valor.length) {
            mostrarAviso(campo, mensajeAviso);
        }
        return filtrado;
    };

    // Rellenar el form cuando se carga el usuario
    useEffect(() => {
        if (usuario) {
            setForm({
                nombre_completo: usuario.nombre_completo || "",
                telefono: usuario.telefono || "",
            });
            setFotoPreview(usuario.foto_url || null);
        }
    }, [usuario]);

    if (!usuario) return null;

    const inicial = usuario.nombre_completo?.charAt(0).toUpperCase() || "U";

    // ¿Hay algo distinto de lo guardado? Sin cambios, "Guardar cambios" queda apagado.
    // (El teléfono ya viene normalizado del filtro; el nombre, sin espacios de más.)
    const limpio = (t) => (t || "").trim().replace(/\s+/g, " ");
    const hayCambios =
        limpio(form.nombre_completo) !== limpio(usuario.nombre_completo) ||
        (form.telefono || "") !== (usuario.telefono || "") ||
        !!foto;

    // Filtros de input (mismo patron que en otros formularios)
    const soloLetrasYEspacios = (texto) =>
        (texto || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");

    const cambiarFoto = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
            setError("Solo se permiten imágenes JPEG, PNG o WebP");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setError("La imagen no debe superar los 5 MB");
            return;
        }
        setError(null);
        setFoto(archivo);
        setFotoSubida(null);
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target.result);
        reader.readAsDataURL(archivo);
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (!hayCambios || !password) return;
        setError(null);

        if (!telefonoValido(form.telefono)) {
            setError(AVISO_TELEFONO + ".");
            return;
        }
        setCargando(true);

        try {
            let foto_url = usuario.foto_url;

            // Si hay nueva foto, subir primero (salvo que ya se haya subido en un intento anterior)
            if (foto && fotoSubida) {
                foto_url = fotoSubida;
            } else if (foto) {
                setSubiendoFoto(true);
                const fd = new FormData();
                fd.append("foto", foto);
                fd.append("folder", "usuarios");
                const token = localStorage.getItem("token");
                const resp = await fetch(
                    `${API_URL}/upload/foto`,
                    {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    }
                );
                const dataUpload = await resp.json();
                if (!resp.ok) {
                    throw new Error(dataUpload.error || "Error subiendo la foto");
                }
                foto_url = dataUpload.url;
                setFotoSubida(dataUpload.url);
                setSubiendoFoto(false);
            }

            const resp = await api("/auth/mi-perfil", {
                method: "PATCH",
                body: {
                    nombre_completo: form.nombre_completo,
                    telefono: form.telefono,
                    foto_url,
                    password,
                },
            });

            // Actualizar el usuario global del AuthContext para que el header
            // y demas componentes reflejen los cambios sin recargar.
            // Se completa sobre el usuario que ya estaba: si la respuesta no trae
            // algún dato (la marca de dueño, la suplencia), no se pierde.
            if (actualizarUsuario) actualizarUsuario({ ...usuario, ...resp.usuario });

            mostrarToast(resp.mensaje || "Perfil actualizado correctamente", "exito");
            setFoto(null);
            setFotoSubida(null);
            setPassword("");
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
            setPassword("");
        } finally {
            setCargando(false);
            setSubiendoFoto(false);
        }
    };

    return (
        <AdminLayout titulo="Mi perfil">
            <div className="mi-perfil-contenedor animar-fade-in-up">
                {/* ===== Hero: foto + nombre + rol + sede ===== */}
                <section className="mi-perfil-hero">
                    {fotoPreview ? (
                        <img
                            src={fotoPreview}
                            alt={usuario.nombre_completo}
                            className="mi-perfil-foto"
                        />
                    ) : (
                        <div className="mi-perfil-foto-placeholder">{inicial}</div>
                    )}
                    <h2 className="mi-perfil-nombre">{usuario.nombre_completo}</h2>
                    <div className="mi-perfil-rol">{ETIQUETA_ROL[usuario.rol] || usuario.rol}</div>
                    {esDueno && <MarcaDueno />}
                    {usuario.sede_nombre && (
                        <div className="mi-perfil-sede">{usuario.sede_nombre}</div>
                    )}

                    {/* Boton "Cambiar foto" debajo, como pediste */}
                    <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        ref={fileInputRef}
                        onChange={cambiarFoto}
                        hidden
                    />
                    <button
                        type="button"
                        className="mi-perfil-boton-foto"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={cargando}
                    >
                        {foto ? "Cambiar foto seleccionada" : "Cambiar foto"}
                    </button>
                    {foto && (
                        <small className="mi-perfil-foto-pendiente">
                            Hay una foto nueva sin guardar. Pulsa "Guardar cambios" abajo.
                        </small>
                    )}
                </section>

                {/* ===== Formulario de datos personales ===== */}
                <form className="mi-perfil-form" onSubmit={guardar}>
                    <h3 className="mi-perfil-seccion-titulo">Datos personales</h3>

                    {/* Cedula — solo lectura */}
                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">
                            Cédula
                            <span className="mi-perfil-bloqueado-mini">🔒 protegida</span>
                        </label>
                        <input
                            type="text"
                            className="mi-perfil-input mi-perfil-input-bloqueado"
                            value={usuario.cedula || ""}
                            disabled
                            readOnly
                        />
                    </div>

                    {/* Correo — solo lectura */}
                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">
                            Correo electrónico
                            <span className="mi-perfil-bloqueado-mini">🔒 protegido</span>
                        </label>
                        <input
                            type="email"
                            className="mi-perfil-input mi-perfil-input-bloqueado"
                            value={usuario.email || "(sin correo)"}
                            disabled
                            readOnly
                        />
                    </div>

                    {/* Aviso explicativo (segun el nivel: el superadmin no tiene
                        a nadie por encima — su via es el soporte tecnico) */}
                    <div className="mi-perfil-aviso-bloqueado">
                        <strong>¿Necesitas cambiar tu cédula o correo?</strong>{" "}
                        {usuario?.rol === "superadmin"
                            ? "Eres el nivel más alto del sistema: estos datos se gestionan directamente con el soporte técnico de la plataforma."
                            : "Por seguridad, estos datos solo pueden ser modificados por un administrador de rango superior. Contáctalo si los datos son incorrectos."}
                    </div>

                    {/* Nombre — editable */}
                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">Nombre completo *</label>
                        <input
                            type="text"
                            className="mi-perfil-input"
                            value={form.nombre_completo}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    nombre_completo: filtrarConAviso(
                                        e.target.value,
                                        soloLetrasYEspacios,
                                        "nombre_completo",
                                        "Solo se permiten letras y espacios"
                                    ),
                                })
                            }
                            placeholder="Tu nombre completo"
                            required
                            disabled={cargando}
                        />
                        {avisos.nombre_completo && (
                            <small className="mi-perfil-aviso-validacion">
                                {avisos.nombre_completo}
                            </small>
                        )}
                    </div>

                    {/* Telefono — editable */}
                    <div className="mi-perfil-campo">
                        <label className="mi-perfil-label">Teléfono</label>
                        <input
                            type="tel"
                            inputMode="tel"
                            className="mi-perfil-input"
                            value={form.telefono}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    telefono: filtrarConAviso(
                                        e.target.value,
                                        filtrarTelefono,
                                        "telefono",
                                        AVISO_TELEFONO
                                    ),
                                })
                            }
                            placeholder={EJEMPLO_TELEFONO}
                            disabled={cargando}
                        />
                        {avisos.telefono && (
                            <small className="mi-perfil-aviso-validacion">
                                {avisos.telefono}
                            </small>
                        )}
                    </div>

                    {hayCambios && (
                        <div className="mi-perfil-campo mi-perfil-confirmar">
                            <label className="mi-perfil-label" htmlFor="mi-perfil-password">
                                Tu contraseña, para confirmar los cambios
                            </label>
                            <InputPassword
                                id="mi-perfil-password"
                                className="mi-perfil-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="off"
                                disabled={cargando}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="mi-perfil-error animar-shake">⚠️ {error}</div>
                    )}

                    {subiendoFoto && (
                        <div className="mi-perfil-info">📤 Subiendo nueva foto...</div>
                    )}

                    <div className="mi-perfil-acciones">
                        <button
                            type="button"
                            className="mi-perfil-boton-pass"
                            onClick={() => navigate("/cambiar-password")}
                            disabled={cargando}
                        >
                            🔑 Cambiar mi contraseña
                        </button>
                        <button
                            type="submit"
                            className="mi-perfil-boton-guardar"
                            disabled={cargando || !hayCambios || !password}
                            aria-describedby="mi-perfil-guardar-ayuda"
                        >
                            {cargando ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                    <p id="mi-perfil-guardar-ayuda" className="mi-perfil-guardar-ayuda">
                        {!hayCambios
                            ? "No hay cambios para guardar."
                            : !password
                            ? "Escribe tu contraseña para guardar los cambios."
                            : "Listo para guardar."}
                    </p>
                </form>

                {/* Pacto correos-de-soporte, HU-03.1-2: se guarda al tocarlo */}
                {recibeSoporte && (
                    <section className="mi-perfil-correos" aria-labelledby="mi-perfil-correos-titulo">
                        <h3 className="mi-perfil-seccion-titulo" id="mi-perfil-correos-titulo">Correos de Soporte</h3>
                        <button
                            type="button"
                            className="mi-perfil-interruptor"
                            role="switch"
                            aria-checked={correosPrendidos}
                            aria-describedby="mi-perfil-correos-ayuda"
                            onClick={cambiarCorreos}
                            disabled={guardandoCorreos}
                        >
                            <span className="mi-perfil-interruptor-texto">Recibir correos de Soporte</span>
                            <span className="mi-perfil-interruptor-pista" aria-hidden="true">
                                <span className="mi-perfil-interruptor-bolita" />
                            </span>
                        </button>
                        <p className="mi-perfil-correos-ayuda" id="mi-perfil-correos-ayuda">
                            La campanita te sigue avisando de todo; esto solo apaga los correos.
                        </p>
                    </section>
                )}

                {/* HU-20.3-5: lo que significa ser el dueño, y como dejar de serlo */}
                {esDueno && (
                    <section className="mi-perfil-dueno" aria-labelledby="mi-perfil-dueno-titulo">
                        <h3 className="mi-perfil-seccion-titulo" id="mi-perfil-dueno-titulo">Dueño de SISVIA</h3>
                        <p className="mi-perfil-dueno-texto">
                            Tu cuenta tiene la marca de dueño: ves el Registro del equipo, y nadie puede
                            desactivarla, eliminarla ni cambiarle el rol desde la app. Puede haber varios dueños:
                            dale la marca a quien corresponda, o quítate la tuya cuando ya no lo seas.
                        </p>
                        {otrosDuenos.length > 0 && (
                            <p className="mi-perfil-dueno-texto">
                                {otrosDuenos.length === 1 ? "El otro dueño de SISVIA es " : "Los otros dueños de SISVIA son "}
                                <b>{otrosDuenos.map((d) => d.nombre_completo).join(" · ")}</b>.
                            </p>
                        )}
                        <div className="mi-perfil-dueno-botones">
                            <button type="button" className="mi-perfil-boton-pass" onClick={() => setCambiarMarca("dar")}>
                                Dar la marca…
                            </button>
                            <button type="button" className="mi-perfil-boton-pass" onClick={() => setCambiarMarca("pasar")}>
                                Pasarle la mía…
                            </button>
                            <button type="button" className="mi-perfil-boton-quitar" onClick={() => setCambiarMarca("quitar")}>
                                Quitarme la marca
                            </button>
                        </div>
                    </section>
                )}
            </div>

            <CambiarMarca
                modo={cambiarMarca}
                onCerrar={() => setCambiarMarca(null)}
                onHecho={(mensaje, modo) => {
                    setCambiarMarca(null);
                    // Con "dar" sigo siendo dueño; con "pasar" y "quitar", ya no.
                    if (modo !== "dar" && actualizarUsuario) actualizarUsuario({ ...usuario, es_dueno: false });
                    setVersionDuenos((v) => v + 1);
                    mostrarToast(mensaje, "exito");
                }}
            />

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

export default MiPerfil;
