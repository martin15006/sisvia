// Formulario de empresa (pacto para-empresas, HU-01.2 y HU-02.1).
// Alta: datos de la empresa + su Administrador de empresa.
// Edicion (`empresa` con id): solo datos y limites.
import { useState } from "react";
import { filtrarDocumento, documentoValido, AVISO_DOCUMENTO, EJEMPLO_DOCUMENTO } from "../../../lib/documento.js";
import { filtrarTelefono, telefonoValido, AVISO_TELEFONO, EJEMPLO_TELEFONO } from "../../../lib/telefono.js";

// Texto exacto de CB-10 (el backend dice lo mismo).
const LIMITE_INVALIDO = "El límite debe ser un número entero de 1 en adelante.";
const limiteValido = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const vacio = { nombre: "", nit: "", departamento_id: "", ciudad_id: "", telefono: "", correo: "", limite_sedes: "1", limite_vehiculos: "" };
const adminVacio = { nombre_completo: "", cedula: "", email: "", telefono: "" };

function Campo({ id, etiqueta, error, ayuda, children }) {
    return (
        <div className={`empresa-campo ${error ? "empresa-campo--error" : ""}`}>
            <label className="empresa-label" htmlFor={id}>{etiqueta}</label>
            {children}
            {error ? (
                <small className="empresa-campo-error" id={`${id}-error`}>{error}</small>
            ) : ayuda ? (
                <small className="empresa-ayuda">{ayuda}</small>
            ) : null}
        </div>
    );
}

function FormEmpresa({ empresa = null, departamentos, ciudades, guardando, errorServidor, onGuardar, onCancelar }) {
    const esEdicion = !!empresa?.id;
    const [datos, setDatos] = useState(() => {
        if (!esEdicion) return vacio;
        const ciudad = ciudades.find((c) => c.id === empresa.ciudad_id);
        return {
            nombre: empresa.nombre || "",
            nit: empresa.nit || "",
            departamento_id: ciudad?.departamento_id || "",
            ciudad_id: empresa.ciudad_id || "",
            telefono: empresa.telefono || "",
            correo: empresa.correo || "",
            limite_sedes: String(empresa.limite_sedes ?? ""),
            limite_vehiculos: String(empresa.limite_vehiculos ?? ""),
        };
    });
    const [admin, setAdmin] = useState(adminVacio);
    const [errores, setErrores] = useState({});

    const cambiar = (campo, valor) => {
        setDatos((d) => ({ ...d, [campo]: valor }));
        setErrores((e) => ({ ...e, [campo]: null }));
    };
    const cambiarAdmin = (campo, valor) => {
        setAdmin((a) => ({ ...a, [campo]: valor }));
        setErrores((e) => ({ ...e, [`admin_${campo}`]: null }));
    };

    const ciudadesDelDepto = datos.departamento_id
        ? ciudades.filter((c) => c.departamento_id === datos.departamento_id)
        : [];

    const validar = () => {
        const e = {};
        if (!datos.nombre.trim()) e.nombre = "El nombre de la empresa es obligatorio.";
        if (!limiteValido(datos.limite_sedes)) e.limite_sedes = LIMITE_INVALIDO;
        if (!limiteValido(datos.limite_vehiculos)) e.limite_vehiculos = LIMITE_INVALIDO;
        if (!telefonoValido(datos.telefono)) e.telefono = AVISO_TELEFONO;
        if (datos.correo.trim() && !CORREO.test(datos.correo.trim())) e.correo = "El correo de contacto no es válido.";
        if (!esEdicion) {
            if (!admin.nombre_completo.trim()) e.admin_nombre_completo = "El nombre del administrador es obligatorio.";
            if (!documentoValido(admin.cedula)) e.admin_cedula = AVISO_DOCUMENTO;
            if (!CORREO.test(admin.email.trim())) e.admin_email = "Escribe un correo válido: con él entra a SISVIA.";
            if (!telefonoValido(admin.telefono)) e.admin_telefono = AVISO_TELEFONO;
        }
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const enviar = (ev) => {
        ev.preventDefault();
        if (!validar()) return;
        const empresaLimpia = {
            nombre: datos.nombre.trim(),
            nit: datos.nit.trim(),
            ciudad_id: datos.ciudad_id || null,
            telefono: datos.telefono,
            correo: datos.correo.trim(),
            limite_sedes: Number(datos.limite_sedes),
            limite_vehiculos: Number(datos.limite_vehiculos),
        };
        onGuardar(esEdicion ? empresaLimpia : { empresa: empresaLimpia, administrador: { ...admin, email: admin.email.trim() } });
    };

    const input = (id, campo, props = {}) => (
        <input
            id={id}
            className="empresa-input"
            value={datos[campo]}
            onChange={(e) => cambiar(campo, e.target.value)}
            disabled={guardando}
            aria-invalid={!!errores[campo]}
            aria-describedby={errores[campo] ? `${id}-error` : undefined}
            {...props}
        />
    );

    return (
        <form className="empresa-form" onSubmit={enviar} noValidate>
            {errorServidor && <p className="empresa-form-error" role="alert">{errorServidor}</p>}

            <fieldset className="empresa-grupo" disabled={guardando}>
                <legend className="empresa-grupo-titulo">La empresa</legend>
                <div className="empresa-grid">
                    <Campo id="emp-nombre" etiqueta="Nombre *" error={errores.nombre}>
                        {input("emp-nombre", "nombre", { placeholder: "Ej: Transportes del Sur", autoFocus: !esEdicion })}
                    </Campo>
                    <Campo id="emp-nit" etiqueta="NIT">
                        {input("emp-nit", "nit", { placeholder: "Ej: 900123456-7" })}
                    </Campo>
                    <Campo id="emp-depto" etiqueta="Departamento">
                        <select
                            id="emp-depto"
                            className="empresa-input"
                            value={datos.departamento_id}
                            onChange={(e) => { cambiar("departamento_id", e.target.value); cambiar("ciudad_id", ""); }}
                        >
                            <option value="">— Selecciona —</option>
                            {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </Campo>
                    <Campo id="emp-ciudad" etiqueta="Ciudad principal">
                        <select
                            id="emp-ciudad"
                            className="empresa-input"
                            value={datos.ciudad_id}
                            onChange={(e) => cambiar("ciudad_id", e.target.value)}
                            disabled={guardando || !datos.departamento_id}
                        >
                            <option value="">{datos.departamento_id ? "— Selecciona —" : "— Primero el departamento —"}</option>
                            {ciudadesDelDepto.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </Campo>
                    <Campo id="emp-tel" etiqueta="Teléfono de contacto" error={errores.telefono} ayuda={EJEMPLO_TELEFONO}>
                        <input
                            id="emp-tel"
                            className="empresa-input"
                            inputMode="tel"
                            value={datos.telefono}
                            onChange={(e) => cambiar("telefono", filtrarTelefono(e.target.value))}
                            aria-invalid={!!errores.telefono}
                        />
                    </Campo>
                    <Campo id="emp-correo" etiqueta="Correo de contacto" error={errores.correo}>
                        {input("emp-correo", "correo", { type: "email", placeholder: "contacto@empresa.com" })}
                    </Campo>
                </div>
            </fieldset>

            <fieldset className="empresa-grupo empresa-grupo--plan" disabled={guardando}>
                <legend className="empresa-grupo-titulo">Plan</legend>
                <p className="empresa-grupo-nota">
                    {esEdicion
                        ? "El límite no puede quedar por debajo de lo que la empresa ya usa: si le sobran sedes o vehículos, primero se desactivan."
                        : "Lo que la empresa puede tener activo a la vez. Lo desactivado no cuenta."}
                </p>
                <div className="empresa-grid">
                    <Campo id="emp-lim-sedes" etiqueta="Máximo de sedes *" error={errores.limite_sedes}>
                        {input("emp-lim-sedes", "limite_sedes", { inputMode: "numeric", placeholder: "Ej: 3" })}
                    </Campo>
                    <Campo id="emp-lim-veh" etiqueta="Máximo de vehículos *" error={errores.limite_vehiculos}>
                        {input("emp-lim-veh", "limite_vehiculos", { inputMode: "numeric", placeholder: "Ej: 120" })}
                    </Campo>
                </div>
            </fieldset>

            {!esEdicion && (
                <fieldset className="empresa-grupo" disabled={guardando}>
                    <legend className="empresa-grupo-titulo">Su Administrador de empresa</legend>
                    <p className="empresa-grupo-nota">Recibe una contraseña temporal y la cambia en su primer ingreso.</p>
                    <div className="empresa-grid">
                        <Campo id="adm-nombre" etiqueta="Nombre completo *" error={errores.admin_nombre_completo}>
                            <input id="adm-nombre" className="empresa-input" value={admin.nombre_completo}
                                onChange={(e) => cambiarAdmin("nombre_completo", e.target.value)} aria-invalid={!!errores.admin_nombre_completo} />
                        </Campo>
                        <Campo id="adm-cedula" etiqueta="Cédula *" error={errores.admin_cedula} ayuda={EJEMPLO_DOCUMENTO}>
                            <input id="adm-cedula" className="empresa-input" inputMode="numeric" value={admin.cedula}
                                onChange={(e) => cambiarAdmin("cedula", filtrarDocumento(e.target.value))} aria-invalid={!!errores.admin_cedula} />
                        </Campo>
                        <Campo id="adm-email" etiqueta="Correo *" error={errores.admin_email}>
                            <input id="adm-email" className="empresa-input" type="email" value={admin.email}
                                onChange={(e) => cambiarAdmin("email", e.target.value)} aria-invalid={!!errores.admin_email} />
                        </Campo>
                        <Campo id="adm-tel" etiqueta="Teléfono" error={errores.admin_telefono} ayuda={EJEMPLO_TELEFONO}>
                            <input id="adm-tel" className="empresa-input" inputMode="tel" value={admin.telefono}
                                onChange={(e) => cambiarAdmin("telefono", filtrarTelefono(e.target.value))} aria-invalid={!!errores.admin_telefono} />
                        </Campo>
                    </div>
                </fieldset>
            )}

            <div className="empresa-form-acciones">
                <button type="button" className="empresa-boton empresa-boton--secundario" onClick={onCancelar} disabled={guardando}>
                    Cancelar
                </button>
                <button type="submit" className="empresa-boton empresa-boton--primario" disabled={guardando}>
                    {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear empresa"}
                </button>
            </div>
        </form>
    );
}

export default FormEmpresa;
