// "Reservemos una cita" (HU-02): el formulario de la solicitud y el contacto
// directo por WhatsApp y correo. La autorizacion de datos es obligatoria (HU-02.7):
// sin la casilla el servidor no guarda nada y el campo lo dice.
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { MARCA } from "../../lib/marca.js";
import { limpiarCiudad, limpiarNombre } from "../../lib/solicitudes.js";
import { enlaceCorreo, enlaceWhatsApp } from "./enlaces.js";
import { IconoCorreo, IconoMensaje } from "./iconos.jsx";
import "./ContactoCita.css";

// Limites de HU-02.5: en pantalla los campos no dejan escribir mas.
const LARGO = { empresa: 120, ciudad: 80, nombre: 100, correo: 254, mensaje: 1000 };

const VACIO = { empresa: "", ciudad: "", vehiculos: "", nombre: "", telefono: "", correo: "", mensaje: "", autorizo: false, sitio_web: "" };

// HU-02.8 · CB-15: en Tu nombre y Ciudad lo que no va no llega a escribirse.
const LIMPIAR = { nombre: limpiarNombre, ciudad: limpiarCiudad };

// Orden de los campos en pantalla: al fallar, el foco va al primero con error.
const ORDEN = ["empresa", "ciudad", "vehiculos", "nombre", "telefono", "correo", "mensaje", "autorizo"];

const MENSAJES = {
    listo: "Listo, recibimos tu solicitud. Te escribimos pronto para acordar la cita.",
    fallo: "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.",
};

function ContactoCita() {
    const [datos, setDatos] = useState(VACIO);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState("");
    const [estado, setEstado] = useState("llenando"); // llenando | enviando | listo
    const enviando = useRef(false); // CB-01: un solo envio aunque se toque dos veces
    const aviso = useRef(null);

    useEffect(() => {
        if (estado === "listo") aviso.current?.focus();
    }, [estado]);

    const cambiar = (campo) => (e) => {
        const crudo = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        const valor = LIMPIAR[campo] ? LIMPIAR[campo](crudo) : crudo;
        setDatos((d) => ({ ...d, [campo]: valor }));
        if (errores[campo]) {
            setErrores((actuales) => {
                const resto = { ...actuales };
                delete resto[campo];
                return resto;
            });
        }
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (enviando.current) return;
        enviando.current = true;
        setEstado("enviando");
        setErrorGeneral("");
        try {
            await api("/solicitudes", { method: "POST", body: datos });
            setEstado("listo");
        } catch (err) {
            setEstado("llenando");
            if (err.errores) {
                setErrores(err.errores);
                const primero = ORDEN.find((c) => err.errores[c]);
                if (primero) document.getElementById(`cita-${primero}`)?.focus();
            } else {
                // 429 (RN-04) trae su propio texto; lo demas (red, servidor), el general.
                setErrorGeneral(err.status === 429 ? err.message : MENSAJES.fallo);
            }
        } finally {
            enviando.current = false;
        }
    };

    const campo = (nombre) => ({
        id: `cita-${nombre}`,
        value: datos[nombre],
        onChange: cambiar(nombre),
        "aria-invalid": errores[nombre] ? true : undefined,
        "aria-describedby": errores[nombre] ? `cita-${nombre}-error` : undefined,
    });

    return (
        <section className="cita" id="cita">
            <div className="portada-envoltura cita-rejilla">
                <div>
                    <h2>Reservemos una cita.</h2>
                    <p className="cita-lead">
                        Cuéntanos de tu empresa y te mostramos cómo funcionaría {MARCA.nombre} en tu operación.
                        La suscripción empieza con esa conversación.
                    </p>
                    {estado === "listo" ? (
                        <p className="cita-listo" role="status" tabIndex={-1} ref={aviso}>{MENSAJES.listo}</p>
                    ) : (
                        <form className="cita-formulario" onSubmit={enviar} noValidate>
                            <Campo nombre="empresa" etiqueta="Empresa" error={errores.empresa}>
                                <input {...campo("empresa")} maxLength={LARGO.empresa} autoComplete="organization" placeholder="Transportes El Ejemplo S.A.S." />
                            </Campo>
                            <Campo nombre="ciudad" etiqueta="Ciudad" error={errores.ciudad}>
                                <input {...campo("ciudad")} maxLength={LARGO.ciudad} autoComplete="address-level2" placeholder="Ibagué" />
                            </Campo>
                            <Campo nombre="vehiculos" etiqueta="Vehículos" nota="(aprox., opcional)" error={errores.vehiculos}>
                                <input {...campo("vehiculos")} inputMode="numeric" maxLength={4} placeholder="25" />
                            </Campo>
                            <Campo nombre="nombre" etiqueta="Tu nombre" error={errores.nombre}>
                                <input {...campo("nombre")} maxLength={LARGO.nombre} autoComplete="name" />
                            </Campo>
                            <Campo nombre="telefono" etiqueta="Teléfono o WhatsApp" error={errores.telefono}>
                                <input {...campo("telefono")} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="300 123 4567" />
                            </Campo>
                            <Campo nombre="correo" etiqueta="Correo" nota="(opcional)" error={errores.correo}>
                                <input {...campo("correo")} type="email" maxLength={LARGO.correo} autoComplete="email" placeholder="tu@empresa.com" />
                            </Campo>
                            <Campo nombre="mensaje" etiqueta="¿Algo que debamos saber?" nota="(opcional)" ancho error={errores.mensaje}>
                                <textarea {...campo("mensaje")} maxLength={LARGO.mensaje} />
                            </Campo>
                            <div className="cita-autorizo">
                                <label htmlFor="cita-autorizo">
                                    <input type="checkbox" {...campo("autorizo")} value={undefined} checked={datos.autorizo} />
                                    <span>Autorizo a {MARCA.nombre} a guardar estos datos y usarlos solo para contactarme por esta solicitud.</span>
                                </label>
                                {errores.autorizo && <p className="cita-error" id="cita-autorizo-error">{errores.autorizo}</p>}
                            </div>
                            {/* Campo trampa (RN-04): las personas no lo ven ni llegan a el con el teclado. */}
                            <div className="cita-trampa" aria-hidden="true">
                                <label htmlFor="cita-sitio-web">Sitio web</label>
                                <input id="cita-sitio-web" tabIndex={-1} autoComplete="off" value={datos.sitio_web} onChange={cambiar("sitio_web")} />
                            </div>
                            <button className="portada-boton portada-boton-marca" type="submit" disabled={estado === "enviando"}>
                                {estado === "enviando" ? "Enviando…" : "Enviar solicitud"}
                            </button>
                            {errorGeneral && <p className="cita-error-general" role="alert">{errorGeneral}</p>}
                            <p className="cita-nota">
                                Te escribimos al teléfono o al correo que dejes para acordar la cita. Usamos estos datos solo
                                para responder tu solicitud. Si quieres que los borremos, escríbenos
                                a <a href={enlaceCorreo()}>{MARCA.contacto.correo}</a>.
                            </p>
                        </form>
                    )}
                </div>
                <aside className="cita-directo" aria-label="Contacto directo">
                    <h3>¿Prefieres escribirnos ya?</h3>
                    <div className="cita-canales">
                        <a className="cita-canal" href={enlaceWhatsApp()}>
                            <span className="cita-canal-icono"><IconoMensaje /></span>
                            <span><strong>WhatsApp</strong><span>{MARCA.contacto.whatsappVisible}</span></span>
                        </a>
                        <a className="cita-canal" href={enlaceCorreo()}>
                            <span className="cita-canal-icono"><IconoCorreo /></span>
                            <span><strong>Correo</strong><span>{MARCA.contacto.correo}</span></span>
                        </a>
                    </div>
                    <CopiarCorreo />
                    <p className="cita-ciudad">{MARCA.contacto.ciudad}.</p>
                </aside>
            </div>
        </section>
    );
}

function Campo({ nombre, etiqueta, nota, ancho = false, error, children }) {
    return (
        <div className={`cita-campo${ancho ? " cita-campo-ancho" : ""}`}>
            <label htmlFor={`cita-${nombre}`}>{etiqueta}{nota && <small> {nota}</small>}</label>
            {children}
            {error && <p className="cita-error" id={`cita-${nombre}-error`}>{error}</p>}
        </div>
    );
}

// HU-01.5: copia el correo y avisa 2,5 s. Si el navegador no deja copiar,
// muestra el correo para que se copie a mano.
function CopiarCorreo() {
    const [texto, setTexto] = useState("Copiar el correo");
    const espera = useRef(null);
    useEffect(() => () => clearTimeout(espera.current), []);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(MARCA.contacto.correo);
            setTexto("Correo copiado");
        } catch {
            setTexto(MARCA.contacto.correo);
        }
        clearTimeout(espera.current);
        espera.current = setTimeout(() => setTexto("Copiar el correo"), 2500);
    };

    return <button className="cita-copiar" type="button" onClick={copiar} aria-live="polite">{texto}</button>;
}

export default ContactoCita;
