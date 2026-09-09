import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { esAdmin, esAdminEfectivo, enSuplencia, etiquetaCargoCorta } from "../../lib/roles.js";
import "./UsuariosAdmin.css";
import ModalPasswordTemporal from "./components/ModalPasswordTemporal.jsx";
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import Toast from '../../components/Toast/Toast.jsx';
import BotonExportar from "../../components/BotonExportar/BotonExportar.jsx";
import ModalCrearUsuario from "./components/ModalCrearUsuario.jsx";
import ModalEditarUsuario from "./components/ModalEditarUsuario.jsx";
import ModalSuplencia from "./components/ModalSuplencia.jsx";

// Texto secundario (gris) que describe el NIVEL del ámbito en la tabla.
const descriptorAmbito = (ambito) => {
  switch (ambito.nivel) {
    case "sede":
      return ambito.ciudad ? `Sede · ${ambito.ciudad}` : "Sede";
    case "departamento":
      return "Departamento";
    case "nacional":
      return "Todo el país";
    default:
      return "";
  }
};

function UsuariosAdmin() {
  const { usuario, actualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCiudad, setFiltroCiudad] = useState("todos");
  const [modalPassword, setModalPassword] = useState(null);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioAEditar, setUsuarioAeditar] = useState(null);
  const [suplenciaDe, setSuplenciaDe] = useState(null); // conductor del pool o null
  const [toast, setToast] = useState(null);

  // Helper para mostrar toast con tipo determinado (exito | error | advertencia | info)
  const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

  // Seguridad del SUPLENTE (pool actuando como Coordinador): tiene poderes acotados.
  //   - No puede resetear contrasenas (de nadie).
  //   - No puede editar/desactivar/eliminar a otros admins (incluido el Coordinador
  //     titular): solo gestiona conductores.
  // El backend tambien lo impone; esto es para no mostrar botones que igual fallarian.
  const soySuplente = enSuplencia(usuario);
  const suplenteNoTocaAdmin = (u) => soySuplente && esAdmin(u.rol);
  const esMiFila = (u) => u.id === usuario?.id; // nadie se desactiva/elimina a si mismo

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api("/usuarios");
      setUsuarios(data.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Cargar para CUALQUIER admin (todos los niveles + el alias 'admin') Y para el
    // pool con suplencia vigente (admin efectivo). Si usaramos esAdmin(rol) a secas,
    // el suplente (rol real 'conductor') nunca cargaria y quedaria en spinner infinito.
    if (usuario && esAdminEfectivo(usuario)) cargarUsuarios();
  }, [usuario]);


  // Ciudades presentes en la lista visible (para el filtro auto-llenado). Solo
  // mostramos el filtro si hay mas de una ciudad — para un admin de un solo sede
  // no tiene sentido. (#102 mejora)
  const ciudadesDisponibles = [
    ...new Set(usuarios.map((u) => u.ambito?.ciudad).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  // Filtros aplicados sobre la lista cruda
  const usuariosFiltrados = usuarios.filter((u) => {
    // "admin" agrupa a TODOS los niveles administrativos (no solo el rol literal)
    if (filtroRol === "admin" && !esAdmin(u.rol)) return false;
    if (filtroRol === "conductor" && u.rol !== "conductor") return false;
    if (filtroEstado === "activos" && !u.activo) return false;
    if (filtroEstado === "inactivos" && u.activo) return false;
    if (filtroCiudad !== "todos" && u.ambito?.ciudad !== filtroCiudad) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const match =
        u.nombre_completo?.toLowerCase().includes(q) ||
        u.cedula?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Acciones
  const desactivar = async (id, nombre) => {
    if (!confirm(`¿Desactivar al usuario ${nombre}?`)) return;
    try {
      await api(`/usuarios/${id}/desactivar`, { method: "PATCH" });
      mostrarToast(`Usuario ${nombre} desactivado`, "advertencia");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const reactivar = async (id, nombre) => {
    try {
      await api(`/usuarios/${id}/reactivar`, { method: "PATCH" });
      mostrarToast(`Usuario ${nombre} reactivado`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar permanentemente a ${nombre}? Esta acción no se puede deshacer.`))
      return;
    try {
      await api(`/usuarios/${id}`, { method: "DELETE" });
      mostrarToast(`Usuario ${nombre} eliminado permanentemente`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const resetearPassword = async (id, nombre) => {
    if (!confirm(`¿Generar una nueva contraseña temporal para ${nombre}?`))
      return;
    try {
      const data = await api(`/usuarios/${id}/resetear-password`, {
        method: "POST",
      });
      setModalPassword({
        password: data.password_temporal,
        email: data.email,
        nombreUsuario: nombre,
      });
      mostrarToast(`Contraseña temporal generada para ${nombre}`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  return (
    <AdminLayout titulo="Gestión de usuarios">
      <div className="usuarios-admin-contenido">
        <div className="usuarios-admin-encabezado">
          <div>
            <h1 className="usuarios-admin-titulo">Gestión de usuarios</h1>
            <p className="usuarios-admin-subtitulo">
              {usuarios.length} registrados · {usuariosFiltrados.length} visibles
            </p>
          </div>
          <div className="usuarios-admin-acciones-encabezado">
            <button
              className="usuarios-admin-boton-refrescar"
              onClick={cargarUsuarios}
              disabled={cargando}
              title="Recargar la lista sin reiniciar la página"
            >
              {cargando ? "Refrescando..." : "Refrescar"}
            </button>
            <button
              className="usuarios-admin-boton-crear"
              onClick={() => setModalCrearAbierto(true)}
            >
              + Crear Usuario
            </button>
          </div>
        </div>

        <div className="usuarios-admin-filtros animar-fade-in">
          <input
            type="text"
            className="usuarios-admin-busqueda"
            placeholder="Buscar por nombre o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="usuarios-admin-select"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="conductor">Conductores</option>
          </select>
          <select
            className="usuarios-admin-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
          {ciudadesDisponibles.length > 1 && (
            <select
              className="usuarios-admin-select"
              value={filtroCiudad}
              onChange={(e) => setFiltroCiudad(e.target.value)}
            >
              <option value="todos">Todas las ciudades</option>
              {ciudadesDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {cargando && (
          <div className="usuarios-admin-estado-cargando">
            Cargando usuarios...
          </div>
        )}

        {error && (
          <div className="usuarios-admin-estado-error animar-shake">
            ⚠️ {error}
          </div>
        )}

        {!cargando && !error && usuariosFiltrados.length === 0 && (
          <div className="usuarios-admin-vacio">
            No hay usuarios que coincidan con los filtros.
          </div>
        )}

        {!cargando && !error && usuariosFiltrados.length > 0 && (
          <div className="usuarios-admin-tabla-wrapper animar-fade-in">
            {/* Cierre del bloque cuando termina la tabla */}
            <table className="usuarios-admin-tabla">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Rol</th>
                  <th>Ámbito</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    className={!u.activo ? "usuarios-admin-fila-inactiva" : ""}
                  >
                    <td>
                      {u.foto_url ? (
                        <img
                          src={u.foto_url}
                          alt={u.nombre_completo}
                          className="usuarios-admin-foto"
                        />
                      ) : (
                        <div className="usuarios-admin-foto-placeholder">
                          {u.nombre_completo?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="usuarios-admin-nombre">
                      {u.nombre_completo}
                    </td>
                    <td>{u.cedula}</td>
                    <td>
                      <span
                        className={`usuarios-admin-rol usuarios-admin-rol-${u.es_pool ? "pool" : esAdmin(u.rol) ? "admin" : "conductor"
                          }`}
                      >
                        {etiquetaCargoCorta(u)}
                      </span>
                      {u.supliendo && (
                        <span
                          className="usuarios-admin-supliendo"
                          title={
                            u.suplencia_hasta
                              ? `Supliendo al Coordinador hasta el ${new Date(u.suplencia_hasta).toLocaleDateString("es-CO")}`
                              : "Supliendo al Coordinador (sin fecha de fin)"
                          }
                        >
                          ⭐ Suplente
                        </span>
                      )}
                    </td>
                    <td>
                      {u.ambito && u.ambito.nivel ? (
                        <div className="usuarios-admin-ambito">
                          <span className="usuarios-admin-ambito-nombre">
                            {u.ambito.etiqueta}
                          </span>
                          <span className="usuarios-admin-ambito-nivel">
                            {descriptorAmbito(u.ambito)}
                          </span>
                        </div>
                      ) : (
                        <span className="usuarios-admin-ambito-nivel">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`usuarios-admin-estado ${u.activo ? "activo" : "inactivo"
                          }`}
                      >
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="usuarios-admin-acciones">
                        <button
                          className="usuarios-admin-accion"
                          onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                          title="Ver perfil completo"
                        >
                          Ver perfil
                        </button>
                        {!suplenteNoTocaAdmin(u) && (
                          <button
                            className="usuarios-admin-accion"
                            onClick={() => setUsuarioAeditar(u)}
                            title="Editar"
                          >
                            Editar
                          </button>
                        )}
                        {!soySuplente && (
                          <button
                            className="usuarios-admin-accion"
                            onClick={() =>
                              resetearPassword(u.id, u.nombre_completo)
                            }
                            title="Resetear contraseña"
                          >
                            Resetear
                          </button>
                        )}
                        {!esMiFila(u) && !suplenteNoTocaAdmin(u) && (
                          u.activo ? (
                            <button
                              className="usuarios-admin-accion usuarios-admin-accion-warning"
                              onClick={() => desactivar(u.id, u.nombre_completo)}
                              title="Desactivar"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              className="usuarios-admin-accion usuarios-admin-accion-success"
                              onClick={() => reactivar(u.id, u.nombre_completo)}
                              title="Reactivar"
                            >
                              Reactivar
                            </button>
                          )
                        )}
                        {!esMiFila(u) && !suplenteNoTocaAdmin(u) && (
                          <button
                            className="usuarios-admin-accion usuarios-admin-accion-danger"
                            onClick={() => eliminar(u.id, u.nombre_completo)}
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      {u.rol === "conductor" && (
                        <div className="usuarios-admin-acciones-exportar">
                          <BotonExportar
                            base={`/export/conductor/${u.id}`}
                            nombre={`conductor-${u.cedula || u.id}`}
                          />
                        </div>
                      )}
                      {/* Acciones propias del Pool de transporte, separadas del resto */}
                      {u.rol === "conductor" && u.es_pool && (
                        <div className="usuarios-admin-acciones-pool">
                          <button
                            className="usuarios-admin-accion usuarios-admin-accion-pool"
                            onClick={() => setSuplenciaDe(u)}
                            title="Activar o finalizar la suplencia del Coordinador"
                          >
                            Suplencia
                          </button>
                          <button
                            className="usuarios-admin-accion usuarios-admin-accion-pool"
                            onClick={() => navigate(`/admin/actividad-pool/${u.id}`)}
                            title="Ver lo que hizo este pool"
                          >
                            Actividad
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ModalPasswordTemporal
        abierto={modalPassword !== null}
        onCerrar={() => setModalPassword(null)}
        password={modalPassword?.password}
        email={modalPassword?.email}
        nombreUsuario={modalPassword?.nombreUsuario}
      />
      <ModalCrearUsuario
        abierto={modalCrearAbierto}
        onCerrar={() => setModalCrearAbierto(false)}
        onCreado={(data) => {
          setModalPassword(data);
          mostrarToast(`Usuario ${data.nombreUsuario} creado correctamente`, "exito");
          cargarUsuarios();
        }}
      />
      <ModalEditarUsuario
        abierto={usuarioAEditar !== null}
        onCerrar={() => setUsuarioAeditar(null)}
        usuario={usuarioAEditar}
        onEditado={(nombre, mensajePersonalizado) => {
          // Si viene un mensaje del backend (cambio de correo/cedula) lo usamos
          // tal cual; si no, mostramos el genérico de "Cambios guardados".
          const mensaje = mensajePersonalizado
            ? mensajePersonalizado
            : `Cambios guardados${nombre ? ` para ${nombre}` : ""}`;
          mostrarToast(mensaje, "exito");
          cargarUsuarios();
        }}
      />
      <ModalSuplencia
        abierto={suplenciaDe !== null}
        onCerrar={() => setSuplenciaDe(null)}
        usuario={suplenciaDe}
        onHecho={async (mensaje) => {
          mostrarToast(mensaje, "exito");
          // Si el suplente finalizó SU PROPIA suplencia, ya dejó de ser admin:
          // refrescamos la sesión y lo mandamos a su panel de conductor, sin que
          // tenga que reiniciar ni quede atascado en un panel que ya no le aplica.
          if (suplenciaDe?.id === usuario?.id) {
            try {
              const data = await api("/auth/me");
              actualizarUsuario(data.usuario);
            } catch { /* si /me falla, igual lo redirigimos */ }
            navigate("/conductor");
            return;
          }
          cargarUsuarios();
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

export default UsuariosAdmin;