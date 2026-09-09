// Sidebar del AdminLayout. Lista los modulos del admin con NavLink para que
// React Router marque el item activo automaticamente.
//
// Si el usuario es admin_sede (no admin global) algunos modulos pueden
// ocultarse en el futuro — por ahora mostramos todos porque todos los modulos
// que tenemos pertenecen al ambito del admin.

import { NavLink, useNavigate } from "react-router-dom";
import { ETIQUETA_ROL, enSuplencia, cubreVariasSedes } from "../../lib/roles.js";
import { MARCA, ORGANIZACION } from "../../lib/marca.js";
import "./Sidebar.css";

// SVGs inline para iconos del menu — todos siguen el mismo estilo "stroke" para
// que se vean coherentes entre si y con el resto del proyecto.
const Icono = {
    dashboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
        </svg>
    ),
    vehiculos: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 17h2l2-6h12l2 6h2v3h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-3z" />
            <circle cx="7" cy="20" r="1.5" />
            <circle cx="17" cy="20" r="1.5" />
        </svg>
    ),
    usuarios: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    catalogo: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="9" y1="7" x2="16" y2="7" />
            <line x1="9" y1="11" x2="16" y2="11" />
        </svg>
    ),
    chequeos: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    bloqueados: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
    ),
    miPerfil: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    geografia: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
    notificaciones: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    logout: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    ajustes: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
};

// Items del menu, diferenciados por NIVEL del admin (#102/#116):
//   - El admin de SEDE (alias 'admin') es el rol operativo: catalogo,
//     chequeos e intentos viven en su menu del dia a dia.
//   - Los niveles superiores (ciudad/departamental/regional/superadmin) son
//     gestores de personas y estructura: usuarios, vehiculos y dashboard.
//     Chequeos/intentos los supervisan desde las cajas del dashboard (las
//     rutas siguen accesibles; solo se ocultan del menu).
//   - La geografia (ciudades/sedes) es exclusiva del superadmin.
// `roles` ausente = visible para todos los admins.
const SOLO_SEDE = ["admin", "admin_sede"];

const ITEMS = [
    { ruta: "/dashboard", etiqueta: "Dashboard", icono: Icono.dashboard, end: true },
    { ruta: "/admin/vehiculos", etiqueta: "Gestión de vehículos", icono: Icono.vehiculos },
    { ruta: "/admin/usuarios", etiqueta: "Gestión de usuarios", icono: Icono.usuarios },
    { ruta: "/admin/geografia", etiqueta: "Gestión de geografía", icono: Icono.geografia, roles: ["superadmin", "admin_departamental"] },
    { ruta: "/admin/catalogo", etiqueta: "Catálogo del chequeo", icono: Icono.catalogo, roles: SOLO_SEDE },
    { ruta: "/admin/chequeos", etiqueta: "Chequeos realizados", icono: Icono.chequeos, end: true, roles: SOLO_SEDE },
    { ruta: "/admin/chequeos/intentos-bloqueados", etiqueta: "Intentos bloqueados", icono: Icono.bloqueados, roles: SOLO_SEDE },
    { ruta: "/admin/notificaciones", etiqueta: "Notificaciones", icono: Icono.notificaciones },
    { ruta: "/admin/ajustes", etiqueta: "Ajustes", icono: Icono.ajustes },
    { ruta: "/admin/mi-perfil", etiqueta: "Mi perfil", icono: Icono.miPerfil },
];

function Sidebar({ abierto, onCerrar, usuario, onLogout }) {
    const navigate = useNavigate();
    // El suplente (conductor del pool con suplencia vigente) ve el menú de un
    // Coordinador de sede (admin_sede) de su sede.
    const suplente = enSuplencia(usuario);
    const rolUI = suplente ? "admin_sede" : usuario.rol;
    const variosSedes = cubreVariasSedes(usuario);
    // Nombre de la sede que está gestionando ahora (sede activa del selector).
    const sedeActivaNombre = suplente
        ? (usuario.suplencia_sedes?.find((c) => c.id === usuario.sede_activa)?.nombre
            || usuario.suplencia?.sede?.nombre
            || usuario.sede_nombre || "")
        : "";
    return (
        <aside className={`sidebar ${abierto ? "sidebar--abierto" : "sidebar--cerrado"}`}>
            {/* Cabecera con logo y datos de la organizacion */}
            <div className="sidebar-cabecera">
                <img
                    src={MARCA.logo}
                    alt={MARCA.nombre}
                    className="sidebar-logo"
                />
                <div className="sidebar-cabecera-texto">
                    <div className="sidebar-cabecera-titulo">{MARCA.nombre}</div>
                    <div className="sidebar-cabecera-org">{ORGANIZACION}</div>
                </div>
            </div>

            {/* Lista de items de navegacion (filtrada por el nivel del admin) */}
            <nav className="sidebar-nav">
                <ul className="sidebar-lista">
                    {ITEMS.filter(
                        (item) => !item.roles || item.roles.includes(rolUI)
                    ).map((item) => (
                        <li key={item.ruta}>
                            <NavLink
                                to={item.ruta}
                                end={item.end}
                                className={({ isActive }) =>
                                    `sidebar-item ${isActive ? "sidebar-item--activo" : ""}`
                                }
                                onClick={() => {
                                    // En movil cerramos el sidebar al hacer clic en un item
                                    if (window.innerWidth <= 900) onCerrar();
                                }}
                            >
                                <span className="sidebar-item-icono">{item.icono}</span>
                                <span className="sidebar-item-etiqueta">{item.etiqueta}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Pie: usuario actual + cerrar sesion */}
            <div className="sidebar-pie">
                <div className="sidebar-usuario">
                    <div className="sidebar-usuario-nombre">{usuario.nombre_completo}</div>
                    <div className="sidebar-usuario-rol">
                        {suplente
                            ? "Coordinador de sede · suplencia"
                            : ETIQUETA_ROL[usuario.rol] || usuario.rol}
                        {/* Area: el suplente muestra la sede que CUBRE; el superadmin
                            "Nacional"; los roles de sede su propia sede. */}
                        {suplente
                            ? ` · ${sedeActivaNombre}`
                            : usuario.rol === "superadmin"
                            ? " · Nacional"
                            : usuario.sede_nombre &&
                              ["admin", "admin_sede", "conductor"].includes(usuario.rol)
                            ? ` · ${usuario.sede_nombre}`
                            : ""}
                    </div>
                </div>
                {/* Suplente multi-sede: cambiar a qué sede está gestionando. */}
                {suplente && variosSedes && (
                    <button
                        type="button"
                        className="sidebar-modo-conductor"
                        onClick={() => navigate("/suplencia/sedes")}
                        title="Cambiar de sede a gestionar"
                    >
                        <span className="sidebar-item-icono">{Icono.geografia}</span>
                        <span className="sidebar-item-etiqueta">Cambiar de sede</span>
                    </button>
                )}
                {/* El suplente sigue siendo conductor: este boton lo lleva a su panel
                    de conductor para usar un vehiculo y hacer los chequeos. */}
                {suplente && (
                    <button
                        type="button"
                        className="sidebar-modo-conductor"
                        onClick={() => navigate("/conductor")}
                        title="Volver a tu panel de conductor para hacer un chequeo"
                    >
                        <span className="sidebar-item-icono">{Icono.vehiculos}</span>
                        <span className="sidebar-item-etiqueta">Ir a hacer un chequeo</span>
                    </button>
                )}
                <button type="button" className="sidebar-logout" onClick={onLogout}>
                    <span className="sidebar-item-icono">{Icono.logout}</span>
                    <span className="sidebar-item-etiqueta">Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
