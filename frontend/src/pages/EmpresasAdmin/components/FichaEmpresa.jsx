// Ficha de una empresa: datos, uso del plan, su administrador y lo que hizo
// el equipo SISVIA sobre ella (pacto para-empresas, HU-01 a HU-03 · RNF-05).
import UsoLimite from "../../../components/UsoLimite/UsoLimite.jsx";

const ACCIONES = {
    creada: "Creó la empresa",
    editada: "Editó los datos",
    limites: "Cambió el plan",
    desactivada: "Desactivó la empresa",
    reactivada: "Reactivó la empresa",
    entro: "Entró a la empresa",
    exportada: "Exportó todo (respaldo)",
};

const NOMBRE_CAMPO = {
    limite_sedes: "sedes",
    limite_vehiculos: "vehículos",
    nombre: "nombre",
    nit: "NIT",
    ciudad_id: "ciudad",
    telefono: "teléfono",
    correo: "correo",
};

const fecha = (iso) =>
    new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// "sedes 3 → 5 · vehículos 120 → 150" (los limites muestran el cambio; el resto, solo que cambio)
const detalleAccion = (a) => {
    // Soporte dentro de la empresa: que elemento (por ejemplo, el bloqueado del catalogo)
    if (a.accion === "soporte") return a.detalles?.elemento || null;
    if (!a.detalles || (a.accion !== "limites" && a.accion !== "editada")) return null;
    return Object.entries(a.detalles)
        .map(([campo, v]) => campo.startsWith("limite_") ? `${NOMBRE_CAMPO[campo]} ${v.antes} → ${v.despues}` : NOMBRE_CAMPO[campo] || campo)
        .join(" · ");
};

function Dato({ etiqueta, valor }) {
    return (
        <div className="ficha-dato">
            <dt>{etiqueta}</dt>
            <dd>{valor || "—"}</dd>
        </div>
    );
}

function FichaEmpresa({ empresa, onEditar, onCambiarEstado, onEntrar, onVerUsuarios, onExportar, onEliminar, exportando, entrando }) {
    return (
        <div className="ficha">
            <div className="ficha-cabecera">
                <span className={`empresa-pill ${empresa.activa ? "empresa-pill--activa" : "empresa-pill--desactivada"}`}>
                    {empresa.activa ? "Activa" : "Desactivada"}
                </span>
                {!empresa.activa && empresa.desactivada_en && (
                    <span className="ficha-nota">desde el {fecha(empresa.desactivada_en)}</span>
                )}
            </div>

            <section className="ficha-seccion" aria-labelledby="ficha-plan">
                <h3 className="ficha-titulo" id="ficha-plan">Plan</h3>
                <div className="ficha-uso">
                    <UsoLimite etiqueta="Sedes" usados={empresa.uso.sedes.usadas} limite={empresa.uso.sedes.limite} />
                    <UsoLimite etiqueta="Vehículos" usados={empresa.uso.vehiculos.usados} limite={empresa.uso.vehiculos.limite} />
                </div>
            </section>

            <section className="ficha-seccion" aria-labelledby="ficha-datos">
                <h3 className="ficha-titulo" id="ficha-datos">Datos</h3>
                <dl className="ficha-datos">
                    <Dato etiqueta="NIT" valor={empresa.nit} />
                    <Dato etiqueta="Ciudad principal" valor={empresa.ciudad_nombre} />
                    <Dato etiqueta="Teléfono" valor={empresa.telefono} />
                    <Dato etiqueta="Correo" valor={empresa.correo} />
                </dl>
            </section>

            {/* HU-04: el respaldo que se le entrega a la empresa (y que pide HU-05 para eliminarla) */}
            <section className="ficha-seccion" aria-labelledby="ficha-respaldo">
                <h3 className="ficha-titulo" id="ficha-respaldo">Respaldo</h3>
                <dl className="ficha-datos">
                    <Dato etiqueta="Último respaldo" valor={empresa.ultimo_respaldo_en ? fecha(empresa.ultimo_respaldo_en) : "Nunca"} />
                </dl>
                <div className="ficha-respaldo">
                    <p className="empresa-ayuda" aria-live="polite">
                        {exportando
                            ? "Generando el respaldo. Puede tardar hasta 2 minutos: no cierres esta ventana."
                            : "Un .zip con sedes, usuarios, vehículos, chequeos e intentos bloqueados (CSV que abre Excel) y un PDF por chequeo."}
                    </p>
                    <button type="button" className="empresa-boton empresa-boton--secundario" onClick={onExportar} disabled={exportando}>
                        {exportando ? "Generando..." : "Exportar todo"}
                    </button>
                </div>
            </section>

            <section className="ficha-seccion" aria-labelledby="ficha-admin">
                <h3 className="ficha-titulo" id="ficha-admin">
                    {empresa.administradores.length === 1 ? "Administrador de empresa" : "Administradores de empresa"}
                </h3>
                {empresa.administradores.length === 0 ? (
                    <p className="ficha-vacio">No tiene Administrador de empresa.</p>
                ) : (
                    <ul className="ficha-lista">
                        {empresa.administradores.map((a) => (
                            <li key={a.id} className="ficha-admin">
                                <strong>{a.nombre_completo}</strong>
                                <span>{a.email}</span>
                                <span>C.C. {a.cedula}{a.telefono ? ` · ${a.telefono}` : ""}</span>
                                {!a.activo && <span className="empresa-pill empresa-pill--desactivada">Cuenta desactivada</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="ficha-seccion" aria-labelledby="ficha-historial">
                <h3 className="ficha-titulo" id="ficha-historial">Lo que hizo el equipo SISVIA</h3>
                {empresa.auditoria.length === 0 ? (
                    <p className="ficha-vacio">Sin acciones registradas.</p>
                ) : (
                    <ol className="ficha-lista ficha-historial">
                        {empresa.auditoria.map((a) => (
                            <li key={a.id}>
                                <span className="ficha-historial-accion">
                                    {a.accion === "soporte" ? a.detalles?.que : ACCIONES[a.accion] || a.accion}
                                </span>
                                {detalleAccion(a) && <span className="ficha-historial-detalle">{detalleAccion(a)}</span>}
                                <span className="ficha-historial-quien">
                                    {a.actor?.nombre_completo || "Alguien del equipo"} · {fecha(a.created_at)}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {/* HU-05: para siempre. Mientras no se pueda, dice por qué (activa o sin respaldo reciente). */}
            <section className="ficha-seccion ficha-eliminar" aria-labelledby="ficha-eliminar">
                <h3 className="ficha-titulo" id="ficha-eliminar">Eliminar la empresa</h3>
                <div className="ficha-respaldo">
                    <p className="empresa-ayuda">
                        {empresa.no_se_elimina ||
                            "Borra para siempre la empresa y todo lo suyo: sedes, usuarios con su acceso, vehículos, chequeos, fotos, catálogo propio y bloqueos."}
                    </p>
                    <button type="button" className="empresa-boton empresa-boton--peligro" onClick={onEliminar} disabled={!!empresa.no_se_elimina}>
                        Eliminar empresa
                    </button>
                </div>
            </section>

            <div className="empresa-form-acciones">
                <button
                    type="button"
                    className={`empresa-boton ${empresa.activa ? "empresa-boton--peligro" : "empresa-boton--secundario"}`}
                    onClick={onCambiarEstado}
                >
                    {empresa.activa ? "Desactivar empresa" : "Reactivar empresa"}
                </button>
                <button type="button" className="empresa-boton empresa-boton--secundario" onClick={onEditar}>
                    Editar datos y plan
                </button>
                {/* HU-11.2: sus usuarios se ven y se crean entrando a la empresa */}
                <button type="button" className="empresa-boton empresa-boton--secundario" onClick={onVerUsuarios} disabled={entrando}>
                    Ver sus usuarios
                </button>
                {/* HU-16.1: ver y ajustar sus módulos, con contraseña y registro */}
                <button type="button" className="empresa-boton empresa-boton--primario" onClick={onEntrar} disabled={entrando}>
                    {entrando ? "Entrando..." : "Entrar a la empresa"}
                </button>
            </div>
        </div>
    );
}

export default FichaEmpresa;
