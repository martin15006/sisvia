// Modulo Empresas (pacto para-empresas, HU-01 a HU-03) — SOLO SUPERADMIN.
//   - Lista de empresas con su estado y el uso del plan (sedes y vehiculos).
//   - Alta de una empresa junto con su Administrador de empresa.
//   - Ficha: datos, plan, administrador e historial; editar y desactivar/reactivar.
// El backend protege todo con requiereRol('superadmin'); esta pagina ademas
// redirige a cualquier otro rol que entre por URL directa.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { descargarArchivo } from "../../lib/descargar.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Modal from "../../components/Modal/Modal.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import UsoLimite from "../../components/UsoLimite/UsoLimite.jsx";
import ModalPasswordTemporal from "../UsuariosAdmin/components/ModalPasswordTemporal.jsx";
import FormEmpresa from "./components/FormEmpresa.jsx";
import FichaEmpresa from "./components/FichaEmpresa.jsx";
import "./EmpresasAdmin.css";

const FILTROS = [
    { clave: "todas", etiqueta: "Todas" },
    { clave: "activas", etiqueta: "Activas" },
    { clave: "desactivadas", etiqueta: "Desactivadas" },
];

const sinTildes = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function EmpresasAdmin() {
    const { usuario, entrarEmpresa } = useAuth();
    const navigate = useNavigate();
    const [entrando, setEntrando] = useState(false);

    const [empresas, setEmpresas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [toast, setToast] = useState(null);
    const [filtro, setFiltro] = useState("todas");
    const [busqueda, setBusqueda] = useState("");

    const [departamentos, setDepartamentos] = useState([]);
    const [ciudades, setCiudades] = useState([]);

    // Modal principal: { tipo: 'nueva' } | { tipo: 'ficha', empresa } | { tipo: 'editar', empresa }
    const [modal, setModal] = useState(null);
    const [cargandoFicha, setCargandoFicha] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorServidor, setErrorServidor] = useState(null);
    const [confirmar, setConfirmar] = useState(null); // empresa a desactivar / reactivar
    // HU-05: empresa a eliminar y el nombre que se escribe para confirmar
    const [eliminarDe, setEliminarDe] = useState(null);
    const [nombreEscrito, setNombreEscrito] = useState("");
    const [errorEliminar, setErrorEliminar] = useState(null);
    const [password, setPassword] = useState(null);

    const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });
    const avisarError = (err) => { if (!err.sesionExpirada && !err.cuentaDesactivada) mostrarToast(err.message, "error"); };

    const cargarEmpresas = async () => {
        try {
            const data = await api("/empresas");
            setEmpresas(data.empresas || []);
        } catch (err) {
            avisarError(err);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (usuario?.rol !== "superadmin") return;
        api("/empresas")
            .then((data) => setEmpresas(data.empresas || []))
            .catch(avisarError)
            .finally(() => setCargando(false));
        Promise.all([api("/geo/departamentos"), api("/geo/ciudades")])
            .then(([d, c]) => { setDepartamentos(d.departamentos || []); setCiudades(c.ciudades || []); })
            .catch(avisarError);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario?.rol]);

    const abrirFicha = async (id) => {
        setCargandoFicha(true);
        setModal({ tipo: "ficha", empresa: null });
        try {
            const data = await api(`/empresas/${id}`);
            setModal({ tipo: "ficha", empresa: data.empresa });
        } catch (err) {
            setModal(null);
            avisarError(err);
        } finally {
            setCargandoFicha(false);
        }
    };

    // HU-04: "Exportar todo". Al terminar, si la ficha sigue abierta, se recarga
    // para mostrar el "Último respaldo" y la acción en el historial.
    const [exportando, setExportando] = useState(false);
    const exportarTodo = async (empresa) => {
        setExportando(true);
        try {
            await descargarArchivo(`/empresas/${empresa.id}/exportar`, null, { method: "POST" });
            mostrarToast(`Respaldo de "${empresa.nombre}" descargado`);
            const data = await api(`/empresas/${empresa.id}`);
            setModal((m) => (m?.tipo === "ficha" && m.empresa?.id === empresa.id ? { tipo: "ficha", empresa: data.empresa } : m));
        } catch (err) {
            avisarError(err);
        } finally {
            setExportando(false);
        }
    };

    const cerrarModal = () => { if (!guardando) { setModal(null); setErrorServidor(null); } };

    const abrirEliminar = (empresa) => { setNombreEscrito(""); setErrorEliminar(null); setEliminarDe(empresa); };
    const cerrarEliminar = () => { if (!guardando) setEliminarDe(null); };
    const eliminarEmpresa = async () => {
        const empresa = eliminarDe;
        setGuardando(true);
        setErrorEliminar(null);
        try {
            await api(`/empresas/${empresa.id}/eliminar`, { method: "POST", body: { nombre: nombreEscrito } });
            setEliminarDe(null);
            setModal(null);
            mostrarToast(`Empresa "${empresa.nombre}" eliminada`);
            cargarEmpresas();
        } catch (err) {
            if (!err.sesionExpirada && !err.cuentaDesactivada) setErrorEliminar(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const crearEmpresa = async (cuerpo) => {
        setGuardando(true);
        setErrorServidor(null);
        try {
            const data = await api("/empresas", { method: "POST", body: cuerpo });
            setModal(null);
            setPassword({
                password: data.password_temporal,
                email: data.administrador.email,
                nombreUsuario: data.administrador.nombre_completo,
            });
            mostrarToast(`Empresa "${data.empresa.nombre}" creada`);
            cargarEmpresas();
        } catch (err) {
            if (!err.sesionExpirada && !err.cuentaDesactivada) setErrorServidor(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const editarEmpresa = async (cambios) => {
        const id = modal.empresa.id;
        setGuardando(true);
        setErrorServidor(null);
        try {
            await api(`/empresas/${id}`, { method: "PATCH", body: cambios });
            mostrarToast("Cambios guardados");
            cargarEmpresas();
            setGuardando(false);
            abrirFicha(id);
        } catch (err) {
            if (!err.sesionExpirada && !err.cuentaDesactivada) setErrorServidor(err.message);
            setGuardando(false);
        }
    };

    const cambiarEstado = async () => {
        const empresa = confirmar;
        setGuardando(true);
        try {
            await api(`/empresas/${empresa.id}/${empresa.activa ? "desactivar" : "reactivar"}`, { method: "POST" });
            mostrarToast(
                empresa.activa ? `"${empresa.nombre}" quedó desactivada` : `"${empresa.nombre}" está activa otra vez`,
                empresa.activa ? "advertencia" : "exito"
            );
            setConfirmar(null);
            cargarEmpresas();
            if (modal?.tipo === "ficha") abrirFicha(empresa.id);
        } catch (err) {
            avisarError(err);
        } finally {
            setGuardando(false);
        }
    };

    // HU-16.1: entra a la empresa y abre su panel (o sus usuarios, HU-11.2).
    // Queda registrado en el backend.
    const entrar = async (empresa, destino = "/dashboard") => {
        setEntrando(true);
        try {
            const data = await api(`/empresas/${empresa.id}/entrar`, { method: "POST" });
            entrarEmpresa(data.empresa);
            navigate(destino);
        } catch (err) {
            avisarError(err);
            setEntrando(false);
        }
    };

    if (usuario && usuario.rol !== "superadmin") {
        return <Navigate to="/dashboard" replace />;
    }

    const texto = sinTildes(busqueda.trim());
    const visibles = empresas.filter((e) => {
        if (filtro === "activas" && !e.activa) return false;
        if (filtro === "desactivadas" && e.activa) return false;
        return !texto || sinTildes(e.nombre).includes(texto) || sinTildes(e.nit).includes(texto);
    });
    const cuantas = {
        todas: empresas.length,
        activas: empresas.filter((e) => e.activa).length,
        desactivadas: empresas.filter((e) => !e.activa).length,
    };

    const tituloModal =
        modal?.tipo === "nueva" ? "Nueva empresa"
            : modal?.tipo === "editar" ? `Editar ${modal.empresa.nombre}`
                : modal?.empresa?.nombre || "Empresa";

    return (
        <AdminLayout titulo="Empresas">
            {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onCerrar={() => setToast(null)} />}

            <div className="empresas">
                <header className="empresas-encabezado">
                    <div>
                        <h2 className="empresas-titulo">Empresas</h2>
                        <p className="empresas-subtitulo">
                            Cada empresa ve solo lo suyo. Aquí das de alta a un cliente con su administrador,
                            ajustas su plan y le cortas el acceso si se va.
                        </p>
                    </div>
                    <button type="button" className="empresa-boton empresa-boton--primario" onClick={() => { setErrorServidor(null); setModal({ tipo: "nueva" }); }}>
                        + Nueva empresa
                    </button>
                </header>

                <div className="empresas-barra">
                    <div className="empresas-filtros" role="group" aria-label="Filtrar por estado">
                        {FILTROS.map((f) => (
                            <button
                                key={f.clave}
                                type="button"
                                className={`empresas-filtro ${filtro === f.clave ? "empresas-filtro--activo" : ""}`}
                                aria-pressed={filtro === f.clave}
                                onClick={() => setFiltro(f.clave)}
                            >
                                {f.etiqueta} <span className="empresas-filtro-cuenta">{cuantas[f.clave]}</span>
                            </button>
                        ))}
                    </div>
                    <input
                        type="search"
                        className="empresas-buscar"
                        placeholder="Buscar por nombre o NIT"
                        aria-label="Buscar empresa por nombre o NIT"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {cargando ? (
                    <div className="empresas-estado">Cargando empresas...</div>
                ) : visibles.length === 0 ? (
                    <div className="empresas-estado">
                        {empresas.length === 0 ? "Todavía no hay empresas." : "Ninguna empresa coincide con la búsqueda."}
                    </div>
                ) : (
                    <ul className="empresas-lista animar-fade-in">
                        {visibles.map((e) => (
                            <li key={e.id} className={`empresa-fila ${!e.activa ? "empresa-fila--desactivada" : ""}`}>
                                <button type="button" className="empresa-fila-nombre" onClick={() => abrirFicha(e.id)}>
                                    <span className="empresa-fila-titulo">{e.nombre}</span>
                                    <span className="empresa-fila-sub">
                                        {[e.ciudad_nombre, e.nit && `NIT ${e.nit}`].filter(Boolean).join(" · ") || "Sin ciudad ni NIT"}
                                    </span>
                                </button>
                                <span className={`empresa-pill ${e.activa ? "empresa-pill--activa" : "empresa-pill--desactivada"}`}>
                                    {e.activa ? "Activa" : "Desactivada"}
                                </span>
                                <div className="empresa-fila-uso">
                                    <UsoLimite compacto etiqueta="Sedes" usados={e.uso.sedes.usadas} limite={e.uso.sedes.limite} />
                                    <UsoLimite compacto etiqueta="Vehículos" usados={e.uso.vehiculos.usados} limite={e.uso.vehiculos.limite} />
                                </div>
                                <div className="empresa-fila-acciones">
                                    <button type="button" className="empresa-boton empresa-boton--secundario" onClick={() => abrirFicha(e.id)}>
                                        Ver ficha
                                    </button>
                                    <button
                                        type="button"
                                        className={`empresa-boton ${e.activa ? "empresa-boton--peligro" : "empresa-boton--secundario"}`}
                                        onClick={() => setConfirmar(e)}
                                    >
                                        {e.activa ? "Desactivar" : "Reactivar"}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal abierto={!!modal} onCerrar={cerrarModal} titulo={tituloModal} ancho="grande">
                {modal?.tipo === "nueva" && (
                    <FormEmpresa
                        departamentos={departamentos}
                        ciudades={ciudades}
                        guardando={guardando}
                        errorServidor={errorServidor}
                        onGuardar={crearEmpresa}
                        onCancelar={cerrarModal}
                    />
                )}
                {modal?.tipo === "editar" && (
                    <FormEmpresa
                        empresa={modal.empresa}
                        departamentos={departamentos}
                        ciudades={ciudades}
                        guardando={guardando}
                        errorServidor={errorServidor}
                        onGuardar={editarEmpresa}
                        onCancelar={() => { setErrorServidor(null); setModal({ tipo: "ficha", empresa: modal.empresa }); }}
                    />
                )}
                {modal?.tipo === "ficha" && (cargandoFicha || !modal.empresa ? (
                    <div className="empresas-estado">Cargando la ficha...</div>
                ) : (
                    <FichaEmpresa
                        empresa={modal.empresa}
                        onEditar={() => { setErrorServidor(null); setModal({ tipo: "editar", empresa: modal.empresa }); }}
                        onCambiarEstado={() => setConfirmar(modal.empresa)}
                        onEntrar={() => entrar(modal.empresa)}
                        onVerUsuarios={() => entrar(modal.empresa, "/admin/usuarios")}
                        onExportar={() => exportarTodo(modal.empresa)}
                        onEliminar={() => abrirEliminar(modal.empresa)}
                        exportando={exportando}
                        entrando={entrando}
                    />
                ))}
            </Modal>

            <Modal
                abierto={!!eliminarDe}
                onCerrar={cerrarEliminar}
                titulo={`¿Eliminar ${eliminarDe?.nombre || ""} para siempre?`}
                ancho="pequeno"
                encima
            >
                {eliminarDe && (
                    <form className="empresa-confirmar" onSubmit={(e) => { e.preventDefault(); if (nombreEscrito === eliminarDe.nombre) eliminarEmpresa(); }}>
                        <p>
                            Se borran la empresa y todo lo suyo: sedes, usuarios con su acceso, vehículos, chequeos,
                            fotos, catálogo propio y bloqueos. <b>No se puede deshacer.</b> Su respaldo es el que
                            descargaste con «Exportar todo».
                        </p>
                        <label className="empresa-campo">
                            <span className="empresa-label">Escribe <b>{eliminarDe.nombre}</b> para confirmar</span>
                            <input
                                className="empresa-input"
                                value={nombreEscrito}
                                onChange={(e) => setNombreEscrito(e.target.value)}
                                autoComplete="off"
                                spellCheck={false}
                                autoFocus
                            />
                        </label>
                        {errorEliminar && <p className="empresa-form-error" role="alert">{errorEliminar}</p>}
                        <div className="empresa-form-acciones">
                            <button type="button" className="empresa-boton empresa-boton--secundario" onClick={cerrarEliminar} disabled={guardando}>
                                Cancelar
                            </button>
                            <button type="submit" className="empresa-boton empresa-boton--peligro-lleno" disabled={guardando || nombreEscrito !== eliminarDe.nombre}>
                                {guardando ? "Eliminando..." : "Eliminar para siempre"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                abierto={!!confirmar}
                onCerrar={() => !guardando && setConfirmar(null)}
                titulo={confirmar?.activa ? `¿Desactivar ${confirmar?.nombre}?` : `¿Reactivar ${confirmar?.nombre}?`}
                ancho="pequeno"
            >
                {confirmar && (
                    <div className="empresa-confirmar">
                        <p>
                            {confirmar.activa
                                ? "Sus usuarios no podrán entrar hasta que la reactives, y quien tenga la sesión abierta sale al login en su próxima acción. No se borra ningún dato."
                                : "Sus usuarios vuelven a entrar como antes, con todos sus datos."}
                        </p>
                        <div className="empresa-form-acciones">
                            <button type="button" className="empresa-boton empresa-boton--secundario" onClick={() => setConfirmar(null)} disabled={guardando}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className={`empresa-boton ${confirmar.activa ? "empresa-boton--peligro-lleno" : "empresa-boton--primario"}`}
                                onClick={cambiarEstado}
                                disabled={guardando}
                            >
                                {guardando ? "Guardando..." : confirmar.activa ? "Desactivar" : "Reactivar"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <ModalPasswordTemporal
                abierto={password !== null}
                onCerrar={() => setPassword(null)}
                password={password?.password}
                email={password?.email}
                nombreUsuario={password?.nombreUsuario}
            />
        </AdminLayout>
    );
}

export default EmpresasAdmin;
