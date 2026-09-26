// "Actividad" de la empresa (pacto para-empresas, HU-19) y "Registro del equipo"
// del dueño de SISVIA (HU-20.1): la misma lista, lo mas nuevo primero, agrupada
// por dia. Solo se lee: nadie la edita ni la borra desde la app (RN-14).
//   modo="empresa" -> GET /api/actividad        (Administrador de empresa)
//   modo="equipo"  -> GET /api/equipo/registro  (dueño de SISVIA)

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { nombreOrganizacion } from "../../lib/organizacion.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import Toast from "../../components/Toast/Toast.jsx";
import "./Actividad.css";

// HU-19.4: los filtros por tipo (mismos valores que el backend)
const TIPOS = [
    { valor: "", etiqueta: "Todo" },
    { valor: "vehiculos", etiqueta: "Vehículos" },
    { valor: "usuarios", etiqueta: "Usuarios" },
    { valor: "sedes", etiqueta: "Sedes" },
    { valor: "catalogo", etiqueta: "Catálogo" },
    { valor: "sisvia", etiqueta: "Equipo SISVIA" },
];

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const ICONO = {
    vehiculo: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M3 17h2l2-6h12l2 6h2v3h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-3z" />
        </svg>
    ),
    usuario: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    sede: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    ),
    catalogo: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    ),
    empresa: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4v18" />
            <path d="M19 21V11l-7-4" />
        </svg>
    ),
    equipo: (
        <svg viewBox="0 0 24 24" {...trazo}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
};

// Fechas y horas siempre en hora de Colombia (los filtros del backend tambien).
const ZONA = "America/Bogota";
const claveDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const nombreDia = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
const nombreDiaConAnio = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });

const etiquetaDia = (fecha, ahora) => {
    const dia = claveDia.format(fecha);
    const hoy = claveDia.format(ahora);
    const ayer = claveDia.format(new Date(ahora.getTime() - 24 * 60 * 60 * 1000));
    const texto = (dia.slice(0, 4) === hoy.slice(0, 4) ? nombreDia : nombreDiaConAnio).format(fecha);
    if (dia === hoy) return `Hoy · ${texto}`;
    if (dia === ayer) return `Ayer · ${texto}`;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Agrupa las filas (ya vienen de la mas nueva a la mas vieja) por dia.
const agruparPorDia = (filas) => {
    const ahora = new Date();
    const grupos = [];
    for (const fila of filas) {
        const fecha = new Date(fila.cuando);
        const clave = claveDia.format(fecha);
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.clave === clave) ultimo.filas.push(fila);
        else grupos.push({ clave, titulo: etiquetaDia(fecha, ahora), filas: [fila] });
    }
    return grupos;
};

const armarQuery = (filtros, despuesDe) => {
    const params = new URLSearchParams();
    for (const [campo, valor] of Object.entries(filtros)) if (valor) params.append(campo, valor);
    if (despuesDe) params.append("despues_de", despuesDe);
    const texto = params.toString();
    return texto ? `?${texto}` : "";
};

// Espera a que se deje de escribir para buscar (un pedido por busqueda, no por tecla).
const useSinPrisa = (valor, ms = 350) => {
    const [quieto, setQuieto] = useState(valor);
    useEffect(() => {
        const t = setTimeout(() => setQuieto(valor.trim()), ms);
        return () => clearTimeout(t);
    }, [valor, ms]);
    return quieto;
};

function Actividad({ modo = "empresa" }) {
    const equipo = modo === "equipo";
    const { usuario, empresaActiva } = useAuth();
    const base = equipo ? "/equipo/registro" : "/actividad";

    const [tipo, setTipo] = useState("");
    const [persona, setPersona] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const personaQuieta = useSinPrisa(persona);
    const empresaQuieta = useSinPrisa(empresa);

    const filtros = useMemo(() => (equipo
        ? { persona: personaQuieta, empresa: empresaQuieta, desde, hasta }
        : { tipo, persona: personaQuieta, desde, hasta }), [equipo, tipo, personaQuieta, empresaQuieta, desde, hasta]);
    const clave = `${base}${armarQuery(filtros)}`;
    const hayFiltros = Object.values(filtros).some(Boolean);

    // Lo cargado corresponde a una "clave" (ruta + filtros): mientras no coincide
    // con la actual, esta cargando.
    const [estado, setEstado] = useState({ clave: null, filas: [], siguiente: null, error: null });
    const [cargandoMas, setCargandoMas] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        let vigente = true;
        api(clave)
            .then((r) => { if (vigente) setEstado({ clave, filas: r.actividad || [], siguiente: r.siguiente || null, error: null }); })
            .catch((err) => { if (vigente && !err.sesionExpirada) setEstado({ clave, filas: [], siguiente: null, error: err.message }); });
        return () => { vigente = false; };
    }, [clave]);

    const cargando = estado.clave !== clave;

    const verMas = async () => {
        if (!estado.siguiente || cargandoMas) return;
        setCargandoMas(true);
        try {
            const r = await api(`${base}${armarQuery(filtros, estado.siguiente)}`);
            setEstado((e) => {
                if (e.clave !== clave) return e;
                const vistos = new Set(e.filas.map((f) => f.id));
                return { ...e, filas: [...e.filas, ...(r.actividad || []).filter((f) => !vistos.has(f.id))], siguiente: r.siguiente || null };
            });
        } catch (err) {
            if (!err.sesionExpirada) setToast({ mensaje: err.message, tipo: "error" });
        } finally {
            setCargandoMas(false);
        }
    };

    const limpiar = () => {
        setTipo("");
        setPersona("");
        setEmpresa("");
        setDesde("");
        setHasta("");
    };

    const grupos = useMemo(() => agruparPorDia(estado.filas), [estado.filas]);
    const titulo = equipo ? "Registro del equipo" : "Actividad";
    const nombreEmpresa = nombreOrganizacion(usuario, empresaActiva);

    return (
        <AdminLayout titulo={titulo}>
            <div className="actividad">
                <header className="actividad-encabezado">
                    <h1 className="actividad-titulo">{titulo}</h1>
                    <p className="actividad-subtitulo">
                        {equipo
                            ? "Todo lo que hizo cada persona del equipo SISVIA: en las empresas y con las cuentas del equipo. Lo más nuevo primero."
                            : `Quién hizo qué en ${nombreEmpresa || "tu empresa"}, incluido lo que hizo el equipo SISVIA en tu cuenta. Lo más nuevo primero.`}
                        {" "}Nadie puede editar ni borrar este registro.
                    </p>
                </header>

                <form className="actividad-filtros" role="search" onSubmit={(e) => e.preventDefault()}>
                    {!equipo && (
                        <div className="actividad-tipos" role="group" aria-label="Qué mostrar">
                            {TIPOS.map((t) => (
                                <button
                                    key={t.valor || "todo"}
                                    type="button"
                                    className={`actividad-tipo${tipo === t.valor ? " actividad-tipo--activo" : ""}`}
                                    aria-pressed={tipo === t.valor}
                                    onClick={() => setTipo(t.valor)}
                                >
                                    {t.etiqueta}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="actividad-campos">
                        <label className="actividad-campo actividad-campo--ancho">
                            <span className="actividad-label">Persona</span>
                            <input
                                type="search"
                                className="actividad-input"
                                placeholder="Nombre de quien lo hizo"
                                value={persona}
                                onChange={(e) => setPersona(e.target.value)}
                                maxLength={100}
                            />
                        </label>
                        {equipo && (
                            <label className="actividad-campo actividad-campo--ancho">
                                <span className="actividad-label">Empresa</span>
                                <input
                                    type="search"
                                    className="actividad-input"
                                    placeholder="Nombre de la empresa"
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value)}
                                    maxLength={100}
                                />
                            </label>
                        )}
                        <label className="actividad-campo">
                            <span className="actividad-label">Desde</span>
                            <input type="date" className="actividad-input" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
                        </label>
                        <label className="actividad-campo">
                            <span className="actividad-label">Hasta</span>
                            <input type="date" className="actividad-input" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
                        </label>
                        <button type="button" className="actividad-limpiar" onClick={limpiar} disabled={!hayFiltros && !persona && !empresa}>
                            Limpiar filtros
                        </button>
                    </div>
                </form>

                <section className="actividad-registro" aria-busy={cargando} aria-live="polite">
                    {cargando && (
                        <ol className="actividad-dia-lista" aria-label="Cargando la actividad">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <li key={i} className="actividad-fila actividad-fila--esqueleto">
                                    <span className="actividad-esqueleto actividad-esqueleto--hora" />
                                    <span className="actividad-icono" />
                                    <span className="actividad-cuerpo">
                                        <span className="actividad-esqueleto actividad-esqueleto--quien" />
                                        <span className="actividad-esqueleto actividad-esqueleto--texto" />
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {!cargando && estado.error && (
                        <p className="actividad-aviso actividad-aviso--error" role="alert">{estado.error}</p>
                    )}

                    {!cargando && !estado.error && estado.filas.length === 0 && (
                        <div className="actividad-vacio">
                            {hayFiltros ? (
                                <>
                                    <p>No hay actividad con estos filtros.</p>
                                    <button type="button" className="actividad-limpiar" onClick={limpiar}>Limpiar filtros</button>
                                </>
                            ) : equipo ? (
                                <p>Todavía no hay nada registrado del equipo SISVIA. Cada vez que alguien del equipo cree, cambie o entre a una empresa, o toque una cuenta del equipo, va a aparecer acá.</p>
                            ) : (
                                <p>Todavía no hay actividad. Cada cambio en vehículos, usuarios, sedes y catálogo va a aparecer acá, con quién lo hizo y cuándo.</p>
                            )}
                        </div>
                    )}

                    {!cargando && !estado.error && grupos.map((g) => (
                        <div key={g.clave} className="actividad-dia">
                            <h2 className="actividad-dia-titulo">{g.titulo}</h2>
                            <ol className="actividad-dia-lista">
                                {g.filas.map((f) => (
                                    <li key={f.id} className={`actividad-fila${f.de_sisvia && !equipo ? " actividad-fila--sisvia" : ""}`}>
                                        <time className="actividad-hora" dateTime={f.cuando}>{hora.format(new Date(f.cuando))}</time>
                                        <span className="actividad-icono" aria-hidden="true">{ICONO[f.tipo] || ICONO.empresa}</span>
                                        <div className="actividad-cuerpo">
                                            {/* Primero quién lo hizo, después qué hizo (enmienda 7) */}
                                            <p className="actividad-quien">
                                                {f.de_sisvia && !equipo && <span className="actividad-sello">Equipo SISVIA</span>}
                                                <span className="actividad-nombre">{f.quien}</span>
                                                {f.cargo && <span className="actividad-cargo">{f.cargo}</span>}
                                                {equipo && f.empresa && <span className="actividad-empresa">{f.empresa}</span>}
                                            </p>
                                            <p className="actividad-texto">{f.texto}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}

                    {!cargando && !estado.error && estado.filas.length > 0 && (
                        <div className="actividad-pie">
                            {estado.siguiente ? (
                                <button type="button" className="actividad-mas" onClick={verMas} disabled={cargandoMas}>
                                    {cargandoMas ? "Cargando..." : "Ver más"}
                                </button>
                            ) : (
                                <p className="actividad-fin">Esto es todo lo registrado{hayFiltros ? " con estos filtros" : ""}.</p>
                            )}
                        </div>
                    )}
                </section>
            </div>
            {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onCerrar={() => setToast(null)} />}
        </AdminLayout>
    );
}

export default Actividad;
