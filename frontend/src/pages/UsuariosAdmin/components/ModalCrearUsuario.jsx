import { useEffect, useRef, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api, API_URL } from "../../../lib/api.js";
import { useAuth } from "../../../hooks/useAuth.js";
import {
  ETIQUETA_ROL,
  NIVEL_TERRITORIO,
  rolesQuePuedeCrear,
  esDirector,
} from "../../../lib/roles.js";
import "./ModalCrearUsuario.css";
import { filtrarTelefono, telefonoValido, AVISO_TELEFONO, EJEMPLO_TELEFONO } from "../../../lib/telefono.js";
import { filtrarDocumento, documentoValido, AVISO_DOCUMENTO, EJEMPLO_DOCUMENTO } from "../../../lib/documento.js";

const ESTADO_INICIAL = {
  cedula: "",
  nombre_completo: "",
  email: "",
  telefono: "",
  rol: "conductor",
  sede_id: "",
  departamento_id: "",
  es_pool: false,
  licencia_numero: "",
  licencia_categoria: "",
  licencia_vencimiento: "",
  eps: "",
  arl: "",
};

// Filtros de input por tipo de dato. Se aplican en el onChange para que el usuario
// no pueda introducir caracteres invalidos (en vez de mostrar error despues).
const soloDigitos = (texto) => (texto || "").replace(/\D/g, "");
const soloLetrasYEspacios = (texto) =>
    (texto || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
// Categoria de licencia colombiana: una letra + un digito (A1, A2, B1, B2, C1, C2, C3, etc.)
const categoriaLicencia = (texto) =>
    (texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);

function ModalCrearUsuario({ abierto, onCerrar, onCreado }) {
  const { usuario } = useAuth();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  // Listas geograficas para los selectores de territorio (ya vienen filtradas
  // por el scope del admin desde el backend, ver geo.routes.js).
  const [sedes, setSedes] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  // Filtro TRANSITORIO de la cascada: cuando el Administrador general crea un
  // conductor/coordinador, primero elige un departamento para acotar la lista de
  // sedes. NO se guarda en el usuario (un conductor solo almacena sede_id).
  const [filtroDepto, setFiltroDepto] = useState("");
  // Avisos contextuales debajo de cada campo cuando se intenta escribir un caracter invalido.
  // Cada aviso se borra solo despues de 2.5 segundos.
  const [avisos, setAvisos] = useState({});
  const timersAvisos = useRef({});

  // Muestra un aviso temporal para un campo. Reinicia el timer si ya habia uno activo.
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

  // Wrapper que aplica un filtro y muestra aviso si removio caracteres
  const filtrarConAviso = (valor, filtro, campo, mensajeAviso) => {
    const filtrado = filtro(valor);
    if (filtrado.length < valor.length) {
      mostrarAviso(campo, mensajeAviso);
    }
    return filtrado;
  };

  // Cargar las listas geograficas (ya scopeadas) al abrir el modal. Solo se usan
  // sede y departamento como niveles de territorio; el selector muestra el que
  // corresponde al rol elegido.
  useEffect(() => {
    if (!abierto) return;
    const cargar = (ruta, set) =>
      api(ruta)
        .then((data) => set(data[Object.keys(data)[0]] || []))
        .catch((err) => {
          if (!err.sesionExpirada) console.error(`Error cargando ${ruta}:`, err.message);
        });
    cargar("/geo/sedes", setSedes);
    cargar("/geo/departamentos", setDepartamentos);
  }, [abierto]);

  const esConductor = form.rol === "conductor";
  // Nivel de territorio que necesita el NUEVO usuario: 'departamento' (Director
  // Regional) o 'sede' (Coordinador / Conductor). null = superadmin (sin territorio).
  const nivelTerritorio = NIVEL_TERRITORIO[form.rol] || null;

  // Roles que el admin actual puede crear (solo rangos inferiores). Si por algun
  // motivo no hay ninguno, dejamos al menos 'conductor' como fallback seguro.
  const rolesCreables = (() => {
    const lista = rolesQuePuedeCrear(usuario?.rol);
    return lista.length > 0 ? lista : ["conductor"];
  })();

  // ===== CASCADA DE TERRITORIO (#116 — "que el usuario haga lo minimo") =====
  // Segun QUIEN crea, solo se piden los niveles que faltan entre el creador y el
  // nuevo usuario. El territorio se hereda/acota, no se escribe libre.
  const rolActor = usuario?.rol;
  const actorEsNacional = rolActor === "superadmin";
  const actorEsRegional = rolActor === "admin_departamental";
  const actorEsCoordinador = rolActor === "admin_sede" || rolActor === "admin";
  // Solo los Directores marcan el "Pool de transporte" (conductor que maneja los
  // vehiculos especiales/VIP). Ver docs/diseno-pool-vip.md.
  const actorEsDirector = esDirector(rolActor);

  // Cuando el nivel objetivo es 'sede' y el creador es Nacional, la lista de
  // sedes se filtra por el departamento elegido en el primer paso.
  const sedesDisponibles =
    actorEsNacional && filtroDepto
      ? sedes.filter((c) => c.departamento_id === filtroDepto)
      : sedes;

  // El Coordinador siempre asigna SU propia sede (cero clics).
  const sedeAutoAsignado = actorEsCoordinador && nivelTerritorio === "sede";

  // Texto de la cadena de mando, para mostrar a quien queda conectado el usuario.
  const nombreDeptoSel = departamentos.find(
    (d) => d.id === (nivelTerritorio === "departamento" ? form.departamento_id : filtroDepto)
  )?.nombre;
  const sedeSel = sedes.find((c) => c.id === form.sede_id);
  const resumenCadena = (() => {
    if (form.rol === "admin_departamental" && form.departamento_id) {
      return `Será Director Regional de ${nombreDeptoSel}. Reportará al Administrador general.`;
    }
    if (nivelTerritorio === "sede") {
      const sede = sedeAutoAsignado ? usuario?.sede_nombre : sedeSel?.nombre;
      const ciudadDepto = sedeSel
        ? `${sedeSel.ciudad ? sedeSel.ciudad + " · " : ""}${sedeSel.departamento || ""}`
        : "";
      if (!sede) return null;
      const cargo = form.rol === "conductor" ? "Conductor" : "Coordinador de sede";
      const superior =
        form.rol === "conductor"
          ? "Reportará al Coordinador de sede de esa sede."
          : "Reportará al Director Regional de ese departamento.";
      return `Será ${cargo} en ${sede}${ciudadDepto ? ` (${ciudadDepto})` : ""}. ${superior}`;
    }
    return null;
  })();

  const cerrar = () => {
    setForm(ESTADO_INICIAL);
    setFoto(null);
    setFotoPreview(null);
    setError(null);
    onCerrar();
  };

  const cambiarCampo = (campo, valor) => {
    setForm({ ...form, [campo]: valor });
  };

  // Al cambiar el rol limpiamos los campos de territorio, para no arrastrar (ni
  // enviar) uno que no corresponde al nuevo nivel (p.ej. un sede_id al pasar a
  // Director Regional, que usa departamento).
  const cambiarRol = (nuevoRol) => {
    setFiltroDepto("");
    setForm((prev) => ({
      ...prev,
      rol: nuevoRol,
      sede_id: "",
      departamento_id: "",
      es_pool: false, // el pool solo aplica a conductores
    }));
  };

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
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(archivo);
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoPreview(null);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);

    if (!documentoValido(form.cedula)) {
        setError("Cédula: " + AVISO_DOCUMENTO.toLowerCase() + ".");
        return;
    }
    if (!telefonoValido(form.telefono)) {
        setError(AVISO_TELEFONO + ".");
        return;
    }

    // Validacion frontend del territorio segun el nivel del nuevo usuario.
    if (nivelTerritorio === "departamento" && !form.departamento_id) {
      setError("Debes elegir el departamento (la Regional) del Director Regional.");
      return;
    }
    if (nivelTerritorio === "sede") {
      // El Coordinador asigna su propia sede automaticamente; los demas eligen.
      const sedeFinal = sedeAutoAsignado ? usuario?.sede_id : form.sede_id;
      if (!sedeFinal) {
        setError("Debes elegir la sede.");
        return;
      }
    }

    setCargando(true);

    try {
      let foto_url = null;

      // Subir foto a Cloudinary primero si hay una
      if (foto) {
        setSubiendoFoto(true);
        const fd = new FormData();
        fd.append("foto", foto);
        fd.append("folder", "usuarios");

        const token = localStorage.getItem("token");
        const resp = await fetch(`${API_URL}/upload/foto`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const dataUpload = await resp.json();
        if (!resp.ok)
          throw new Error(dataUpload.error || "Error subiendo foto");
        foto_url = dataUpload.url;
        setSubiendoFoto(false);
      }

      // Preparar datos: quitar campos vacios opcionales
      const datos = { ...form };
      // El Coordinador hereda SU sede automaticamente (no eligio nada).
      if (sedeAutoAsignado) datos.sede_id = usuario.sede_id;
      Object.keys(datos).forEach((k) => {
        if (datos[k] === "") delete datos[k];
      });
      if (foto_url) datos.foto_url = foto_url;

      // Crear usuario
      const resultado = await api("/usuarios", {
        method: "POST",
        body: datos,
      });

      // Pasar al padre la info de la password generada
      onCreado({
        password: resultado.password_temporal,
        email: resultado.email,
        nombreUsuario: resultado.usuario.nombre_completo,
      });

      cerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      setSubiendoFoto(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Crear nuevo usuario"
      ancho="grande"
    >
      <form className="form-usuario" onSubmit={enviar}>
        {/* === FOTO === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Foto del usuario</h3>
          <div className="form-usuario-foto-area">
            {fotoPreview ? (
              <div className="form-usuario-foto-preview-contenedor">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="form-usuario-foto-preview"
                />
                <button
                  type="button"
                  className="form-usuario-foto-quitar"
                  onClick={quitarFoto}
                  disabled={cargando}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label className="form-usuario-foto-placeholder">
                <span className="form-usuario-foto-icono">📷</span>
                <span>Seleccionar foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={cambiarFoto}
                  hidden
                />
              </label>
            )}
          </div>
        </div>

        {/* === DATOS BASICOS === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Datos básicos</h3>
          <div className="form-usuario-grid">
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Nombre completo *</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.nombre_completo}
                onChange={(e) =>
                  cambiarCampo("nombre_completo", filtrarConAviso(
                    e.target.value, soloLetrasYEspacios, "nombre_completo",
                    "Solo se permiten letras y espacios"
                  ))
                }
                placeholder="Solo letras"
                required
                disabled={cargando}
              />
              {avisos.nombre_completo && (
                <small className="form-usuario-aviso-validacion">{avisos.nombre_completo}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Cédula *</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-usuario-input"
                value={form.cedula}
                onChange={(e) => cambiarCampo("cedula", filtrarConAviso(
                  e.target.value, filtrarDocumento, "cedula", AVISO_DOCUMENTO
                ))}
                placeholder={EJEMPLO_DOCUMENTO}
                required
                disabled={cargando}
              />
              {avisos.cedula && (
                <small className="form-usuario-aviso-validacion">{avisos.cedula}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Correo electrónico *</label>
              <input
                type="email"
                className="form-usuario-input"
                value={form.email}
                onChange={(e) => cambiarCampo("email", e.target.value)}
                required
                disabled={cargando}
              />
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Teléfono</label>
              <input
                type="tel"
                inputMode="tel"
                className="form-usuario-input"
                value={form.telefono}
                onChange={(e) => cambiarCampo("telefono", filtrarConAviso(
                  e.target.value, filtrarTelefono, "telefono", AVISO_TELEFONO
                ))}
                placeholder={EJEMPLO_TELEFONO}
                disabled={cargando}
              />
              {avisos.telefono && (
                <small className="form-usuario-aviso-validacion">{avisos.telefono}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Cargo *</label>
              <select
                className="form-usuario-input"
                value={form.rol}
                onChange={(e) => cambiarRol(e.target.value)}
                disabled={cargando}
              >
                {rolesCreables.map((r) => (
                  <option key={r} value={r}>
                    {ETIQUETA_ROL[r] || r}
                  </option>
                ))}
              </select>
            </div>
            {/* ===== Territorio en CASCADA: solo los pasos que faltan entre el
                creador y el nuevo usuario (ver comentario y lib/roles.js). ===== */}

            {/* Director Regional → elige su Regional (departamento) */}
            {nivelTerritorio === "departamento" && (
              <div className="form-usuario-campo">
                <label className="form-usuario-label">Regional (departamento) *</label>
                <select
                  className="form-usuario-input"
                  value={form.departamento_id}
                  onChange={(e) => cambiarCampo("departamento_id", e.target.value)}
                  required
                  disabled={cargando || departamentos.length === 0}
                >
                  <option value="">— Selecciona el departamento —</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Nivel SEDE (Coordinador / Conductor): 0, 1 o 2 pasos segun quien crea */}
            {nivelTerritorio === "sede" && (
              <>
                {/* Coordinador: hereda SU sede, sin elegir nada */}
                {sedeAutoAsignado && (
                  <div className="form-usuario-campo">
                    <label className="form-usuario-label">Sede</label>
                    <input
                      type="text"
                      className="form-usuario-input"
                      value={usuario?.sede_nombre || "Tu sede"}
                      disabled
                    />
                    <small className="form-usuario-ayuda">
                      Se asigna automáticamente tu sede.
                    </small>
                  </div>
                )}

                {/* Administrador general: primer paso = Departamento (acota las sedes) */}
                {actorEsNacional && (
                  <div className="form-usuario-campo">
                    <label className="form-usuario-label">Departamento *</label>
                    <select
                      className="form-usuario-input"
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

                {/* Director Regional o Nacional (ya con depto): elige la Sede */}
                {(actorEsRegional || actorEsNacional) && (
                  <div className="form-usuario-campo">
                    <label className="form-usuario-label">Sede *</label>
                    <select
                      className="form-usuario-input"
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
                    {sedesDisponibles.length === 0 && (!actorEsNacional || filtroDepto) && (
                      <small className="form-usuario-ayuda">
                        No hay sedes en esa área.
                      </small>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Pool de transporte: conductor que maneja los vehículos especiales/VIP
                (de dirección). Solo lo marcan los Directores. Ver docs/diseno-pool-vip.md */}
            {esConductor && actorEsDirector && (
              <div className="form-usuario-campo form-usuario-campo-ancho">
                <label className="form-usuario-checkbox">
                  <input
                    type="checkbox"
                    checked={form.es_pool}
                    onChange={(e) => cambiarCampo("es_pool", e.target.checked)}
                    disabled={cargando}
                  />
                  <span>Pool de transporte — maneja los vehículos especiales/VIP (de dirección)</span>
                </label>
              </div>
            )}

            {/* Confirmación de la cadena de mando (a quién queda conectado) */}
            {resumenCadena && (
              <div className="form-usuario-resumen-cadena">
                ↳ {resumenCadena}
              </div>
            )}
          </div>
        </div>

        {/* === LICENCIA (solo conductor, todos obligatorios por ley) === */}
        {esConductor && (
          <div className="form-usuario-seccion">
            <h3 className="form-usuario-seccion-titulo">
              Licencia de conducción
            </h3>
            <div className="form-usuario-grid">
              <div className="form-usuario-campo">
                <label className="form-usuario-label">Número *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-usuario-input"
                  value={form.licencia_numero}
                  onChange={(e) =>
                    cambiarCampo("licencia_numero", filtrarConAviso(
                      e.target.value, soloDigitos, "licencia_numero",
                      "Solo se permiten números"
                    ))
                  }
                  placeholder="Solo números"
                  required
                  disabled={cargando}
                />
                {avisos.licencia_numero && (
                  <small className="form-usuario-aviso-validacion">{avisos.licencia_numero}</small>
                )}
              </div>
              <div className="form-usuario-campo">
                <label className="form-usuario-label">Categoría *</label>
                <input
                  type="text"
                  className="form-usuario-input"
                  value={form.licencia_categoria}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const procesado = categoriaLicencia(raw);
                    // Mensaje especifico segun el motivo: longitud o caracter invalido
                    if (raw.length > 2 && procesado.length === 2) {
                      mostrarAviso("licencia_categoria", "Máximo 2 caracteres (ej: C2)");
                    } else if (procesado.length < raw.length) {
                      mostrarAviso("licencia_categoria", "Solo letras y números (ej: C2, B1)");
                    }
                    cambiarCampo("licencia_categoria", procesado);
                  }}
                  placeholder="Ej: C2, C3"
                  required
                  disabled={cargando}
                />
                {avisos.licencia_categoria && (
                  <small className="form-usuario-aviso-validacion">{avisos.licencia_categoria}</small>
                )}
              </div>
              <div className="form-usuario-campo">
                <label className="form-usuario-label">
                  Fecha de vencimiento *
                </label>
                <input
                  type="date"
                  className="form-usuario-input"
                  value={form.licencia_vencimiento}
                  onChange={(e) =>
                    cambiarCampo("licencia_vencimiento", e.target.value)
                  }
                  required
                  disabled={cargando}
                />
              </div>
            </div>
            <small className="form-usuario-ayuda">
              Obligatorio para conductores. Sin licencia vigente no se puede operar vehículos institucionales.
            </small>
          </div>
        )}

        {/* === SEGURIDAD SOCIAL (obligatoria solo para conductor) === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Seguridad social</h3>
          <div className="form-usuario-grid">
            <div className="form-usuario-campo">
              <label className="form-usuario-label">EPS {esConductor && "*"}</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.eps}
                onChange={(e) => cambiarCampo("eps", e.target.value)}
                required={esConductor}
                disabled={cargando}
              />
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">ARL {esConductor && "*"}</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.arl}
                onChange={(e) => cambiarCampo("arl", e.target.value)}
                required={esConductor}
                disabled={cargando}
              />
            </div>
          </div>
          {esConductor && (
            <small className="form-usuario-ayuda">
              Obligatoria para conductores. Cobertura ante accidente conduciendo el vehículo institucional.
            </small>
          )}
        </div>

        {error && (
          <div className="form-usuario-error animar-shake">⚠️ {error}</div>
        )}

        {subiendoFoto && (
          <div className="form-usuario-info">
            Subiendo foto a Cloudinary...
          </div>
        )}

        <div className="form-usuario-acciones">
          <button
            type="button"
            className="form-usuario-boton form-usuario-boton-cancelar"
            onClick={cerrar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="form-usuario-boton form-usuario-boton-crear"
            disabled={cargando}
          >
            {cargando ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ModalCrearUsuario;