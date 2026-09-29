// Portada publica (pacto portada-publica, HU-01). Contrato visual:
// docs/pactos/2026-09-27-portada-publica.maqueta.html. Todo lo que afirma es lo
// que SISVIA hace hoy (RN-01, ver PRODUCT.md); los datos de ejemplo son
// inventados y van rotulados (RN-02).
// Fija su tema claro (data-tema="claro"): se ve igual con el oscuro guardado (RN-05).
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { MARCA } from "../../lib/marca.js";
import { rutaDeInicio } from "../../lib/rutaDeInicio.js";
import PanelEnVivo from "./PanelEnVivo.jsx";
import SemaforoPlaca from "./SemaforoPlaca.jsx";
import ContactoCita from "./ContactoCita.jsx";
import { enlaceCorreo, enlaceWhatsApp } from "./enlaces.js";
import { IconoAlerta, IconoCalendario, IconoDocumento } from "./iconos.jsx";
import "./Portada.css";

function Portada() {
    const { usuario, cargando } = useAuth();

    // HU-01.3: con la sesion abierta va a su panel. Mientras se confirma quien es,
    // no se muestra nada (CB-10: con la sesion vencida, cae en la portada).
    if (usuario) return <Navigate to={rutaDeInicio(usuario)} replace />;
    if (cargando) return null;

    return (
        <div className="portada-pagina" data-tema="claro">
            <Menu />
            <header className="portada-hero">
                <div className="portada-envoltura">
                    <div className="portada-hero-texto">
                        <h1>Un vehículo con fallas <span>no sale.</span></h1>
                        <div>
                            <p className="portada-hero-lead">
                                Cada conductor hace su chequeo desde el celular antes de salir. Tú ves en un solo panel
                                qué vehículos pueden salir, cuáles no y por qué.
                            </p>
                            <div className="portada-hero-acciones">
                                <a className="portada-boton portada-boton-negro" href="#cita">Reservar una cita</a>
                                <a className="portada-boton portada-boton-linea" href={enlaceWhatsApp()}>Escribir por WhatsApp</a>
                            </div>
                        </div>
                    </div>
                    <PanelEnVivo />
                </div>
            </header>

            <main>
                <EnPapel />
                <section className="portada-porque" id="porque">
                    <div className="portada-envoltura portada-porque-rejilla">
                        <div>
                            <h2>¿Por qué <span className="portada-placa-titulo">KLM 204</span> no sale?</h2>
                            <p>
                                Cada chequeo le da al vehículo un estado según lo que encontró el conductor. Hasta alerta,
                                puede salir. De crítico para abajo, no: la app no lo deja arrancar el recorrido, el intento
                                queda registrado y el coordinador se entera.
                            </p>
                        </div>
                        <SemaforoPlaca />
                    </div>
                </section>
                <FranjasDeEstado />
                <Papeles />
                <AvisosYPrueba />
                <ParaTuEmpresa />
            </main>

            <ContactoCita />

            <footer className="portada-pie">
                <div className="portada-envoltura portada-pie-dentro">
                    <a className="portada-marca" href="#"><img src={MARCA.logo} alt="" />{MARCA.nombre}</a>
                    <span>{MARCA.lema}</span>
                    <span><a href={enlaceCorreo()}>{MARCA.contacto.correo}</a> · <Link to="/login">Entrar</Link></span>
                </div>
            </footer>
        </div>
    );
}

function Menu() {
    return (
        <nav className="portada-menu" aria-label="Principal">
            <div className="portada-envoltura portada-menu-dentro">
                <a className="portada-marca" href="#"><img src={MARCA.logo} alt="" />{MARCA.nombre}</a>
                <div className="portada-menu-enlaces">
                    <a href="#porque">Cómo decide</a>
                    <a href="#papeles">Documentos</a>
                    <a href="#avisos">Avisos</a>
                    <a href="#empresa">Tu empresa</a>
                </div>
                <div className="portada-menu-acciones">
                    <Link className="portada-entrar" to="/login">Entrar</Link>
                    <a className="portada-boton portada-boton-negro portada-boton-chico" href="#cita">
                        <span className="portada-solo-ancho">Reservar una cita</span>
                        <span className="portada-solo-angosto">Reservar</span>
                    </a>
                </div>
            </div>
        </nav>
    );
}

function EnPapel() {
    const renglones = [["Luces", true], ["Llantas", true], ["Líquido de frenos", false], ["Pito", true]];
    return (
        <section className="portada-papel" id="papel">
            <div className="portada-envoltura portada-papel-rejilla">
                <div className="portada-papel-texto">
                    <h2>En papel, <span className="portada-placa-titulo">KLM 204</span> habría salido.</h2>
                    <p>
                        Muchas empresas todavía hacen el preoperacional en una hoja. El conductor puede marcar que los
                        frenos no cumplen y el vehículo sale igual, porque la hoja no detiene a nadie.
                    </p>
                    <p>Después, la hoja va a una carpeta. Si alguien la necesita en una auditoría, primero hay que encontrarla.</p>
                </div>
                <figure className="portada-hoja"
                    aria-label="Ejemplo de un preoperacional en papel: marca que los frenos no cumplen y aun así tiene hora de salida">
                    <div className="portada-hoja-cabeza"><strong>FORMATO PREOPERACIONAL</strong><span className="portada-ejemplo">EJEMPLO</span></div>
                    <div className="portada-hoja-datos">
                        <span>Placa: <span className="portada-tinta">KLM 204</span></span>
                        <span>Fecha: <span className="portada-tinta">27/09</span></span>
                    </div>
                    <table className="portada-hoja-tabla">
                        <thead><tr><th scope="col">Ítem</th><th scope="col">C</th><th scope="col">NC</th></tr></thead>
                        <tbody>
                            {renglones.map(([item, cumple]) => (
                                <tr key={item}>
                                    <td>{item}</td>
                                    <td><span className="portada-casilla">{cumple ? "X" : ""}</span></td>
                                    <td><span className="portada-casilla">{cumple ? "" : "X"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="portada-hoja-pie">
                        <span>Observaciones: <span className="portada-tinta">frenos bajos</span></span>
                        <span>Hora de salida: <span className="portada-tinta">5:40 a. m.</span></span>
                    </div>
                    <div className="portada-hoja-archivo"><span className="portada-sello-archivo">ARCHIVADO</span></div>
                </figure>
            </div>
        </section>
    );
}

function Franja({ estado, nombre, titulo, rango, children, muestra }) {
    return (
        <section className={`portada-franja franja-${estado}`}>
            <div className="portada-envoltura portada-franja-rejilla">
                <div className="portada-franja-texto">
                    <h2><span className="portada-franja-estado">{nombre}</span> {titulo}</h2>
                    <p>{children}</p>
                    <p className="portada-franja-rango portada-mono">Criticidad del chequeo: {rango}</p>
                </div>
                {muestra}
            </div>
        </section>
    );
}

function Muestra({ titulo, rotulo = "EJEMPLO", sello, etiqueta, children }) {
    return (
        <div className="portada-muestra" aria-label={etiqueta}>
            <div className="portada-muestra-cabeza">
                <strong>{titulo}</strong>
                {sello || <span className="portada-ejemplo">{rotulo}</span>}
            </div>
            {children}
        </div>
    );
}

function FranjasDeEstado() {
    return (
        <>
            <Franja estado="operativo" nombre="Operativo." titulo="Sale." rango="0–19 %"
                muestra={
                    <Muestra titulo="Checklist · NIVELES" etiqueta="Ejemplo de checklist">
                        {["Líquido de frenos", "Aceite del motor", "Líquido hidráulico"].map((i) => (
                            <div key={i} className="portada-fila">{i} <span className="portada-sello sello-cumple">CUMPLE</span></div>
                        ))}
                    </Muestra>
                }>
                El conductor responde primero si está en condiciones de manejar, y después revisa el vehículo por
                categorías, desde su celular. Si todo cumple, queda listo para salir.
            </Franja>
            <Franja estado="observacion" nombre="Observación." titulo="Sale, y queda anotado." rango="20–39 %"
                muestra={
                    <Muestra titulo="Espejo lateral derecho" etiqueta="Ejemplo de observación"
                        sello={<span className="portada-sello sello-obs">NO CUMPLE</span>}>
                        <div className="portada-fila portada-fila-foto">
                            <div className="portada-foto" role="img" aria-label="Foto del conductor" />
                            <span>“Está rayado, pero se ve bien.” <span className="portada-ejemplo">— el conductor, 5:32 a. m.</span></span>
                        </div>
                    </Muestra>
                }>
                Lo que no cumple necesita una observación del conductor y puede llevar foto. El coordinador la ve en el
                detalle del chequeo, sin llamadas ni papeles.
            </Franja>
            <Franja estado="alerta" nombre="Alerta." titulo="Sale, pero ya hay que mirarlo." rango="40–59 %"
                muestra={
                    <Muestra titulo="Necesita atención" etiqueta="Ejemplo del panel">
                        <div className="portada-fila">
                            <span><span className="portada-mono">PLN 330</span> · Sede Norte</span>
                            <span className="portada-sello sello-alerta">ALERTA · 45 %</span>
                        </div>
                    </Muestra>
                }>
                Cuando las fallas se suman, sube la criticidad. El panel del coordinador lo pone entre los vehículos que
                necesitan atención.
            </Franja>
            <Franja estado="critico" nombre="Crítico." titulo="No sale. Y se sabe al instante." rango="60–89 %"
                muestra={
                    <Muestra titulo="Lo que ve el conductor" rotulo="TEXTO REAL DE LA APP" etiqueta="El mensaje que ve el conductor">
                        <p className="portada-cita-texto">
                            No puedes operar este vehículo: está en estado crítico. Avísale al Coordinador de sede para que lo revise.
                        </p>
                    </Muestra>
                }>
                El preoperacional no se puede iniciar. El conductor ve el motivo, el intento queda registrado, y si falló
                un ítem crítico a los responsables de la sede les llega un correo en ese momento.
            </Franja>
            <Franja estado="no-operativo" nombre="No operativo." titulo="No sale hasta que lo reparen." rango="90–100 %"
                muestra={
                    <Muestra titulo={<>Hoja de vida · <span className="portada-mono">PQR 841</span></>} etiqueta="Ejemplo de hoja de vida">
                        <div className="portada-fila"><span className="portada-mono">24/09 · 5:41 a. m.</span><span>Chequeo · Crítico</span></div>
                        <div className="portada-fila"><span className="portada-mono">24/09 · 7:10 a. m.</span><span>Pasó a No operativo</span></div>
                        <div className="portada-fila"><span className="portada-mono">26/09 · 3:25 p. m.</span><span>Reparado · Operativo</span></div>
                    </Muestra>
                }>
                Así queda hasta que alguien lo revise y le cambie el estado. Su hoja de vida guarda cada chequeo, cada
                falla y cada cambio.
            </Franja>
        </>
    );
}

function Papeles() {
    const documentos = [
        { nombre: "SOAT", fecha: "vence 14/10/2026", estado: "AVISADO · FALTAN 17 DÍAS", clase: "doc-pronto" },
        { nombre: "Técnico-mecánica", fecha: "vence 03/05/2027", estado: "AL DÍA", clase: "doc-ok" },
        { nombre: "Extintor", fecha: "venció 20/09/2026", estado: "NO SALE", clase: "doc-vencido" },
        { nombre: "Licencia del conductor", fecha: "vence 31/12/2030", estado: "AL DÍA", clase: "doc-ok" },
    ];
    return (
        <section className="portada-seccion" id="papeles">
            <div className="portada-envoltura">
                <h2>Los papeles también cierran la puerta.</h2>
                <p className="portada-seccion-lead">
                    Con el SOAT, la técnico-mecánica o el extintor vencidos, o con la licencia del conductor vencida, el
                    preoperacional no se puede iniciar. Desde 30 días antes, el coordinador recibe el aviso. Las fechas
                    viven en la app, no en una hoja de cálculo que alguien tiene que acordarse de revisar.
                </p>
                <div className="portada-documentos" aria-label="Ejemplo de documentos de un vehículo">
                    {documentos.map((d) => (
                        <div key={d.nombre} className="portada-documento">
                            <h3>{d.nombre}</h3>
                            <span className="portada-mono">{d.fecha}</span>
                            <span className={`portada-estado-doc ${d.clase}`}>{d.estado}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function AvisosYPrueba() {
    return (
        <section className="portada-seccion portada-seccion-gris" id="avisos">
            <div className="portada-envoltura portada-avisos-rejilla">
                <div>
                    <h2>Te enteras sin que nadie llame. Y queda la prueba.</h2>
                    <div className="portada-avisos-lista">
                        <div className="portada-aviso"><IconoAlerta /><div><strong>Falla crítica, en el momento</strong><span>A los responsables de la sede les llega un correo apenas falla un ítem crítico.</span></div></div>
                        <div className="portada-aviso"><IconoCalendario /><div><strong>Vencimientos, con 30 días</strong><span>SOAT, técnico-mecánica, extintor y licencias, en la campanita y por correo.</span></div></div>
                        <div className="portada-aviso"><IconoDocumento /><div><strong>Cada chequeo, en PDF o Word</strong><span>Con la empresa, la sede, el conductor, el kilometraje y cada respuesta. Si llega una auditoría, no hay que buscar en carpetas.</span></div></div>
                    </div>
                </div>
                <div className="portada-pdf" aria-label="Ejemplo del PDF de un chequeo">
                    <div className="portada-pdf-banda">
                        <div><strong>Chequeo preoperacional</strong><span>Tu empresa · Sede Norte</span></div>
                        <span className="portada-mono">N.º 5CF98CF5</span>
                    </div>
                    <div className="portada-pdf-resultado"><span>Resultado: OPERATIVO</span><span className="portada-mono">Criticidad 10 %</span></div>
                    <div className="portada-pdf-cuerpo">
                        <div className="portada-pdf-datos">
                            <div><small>VEHÍCULO</small><strong className="portada-mono">WEP 318</strong></div>
                            <div><small>CONDUCTOR</small><strong>Ejemplo Pérez</strong></div>
                            <div><small>KILOMETRAJE</small><strong className="portada-mono">48.210 km</strong></div>
                            <div><small>FECHA</small><strong className="portada-mono">27/09/2026</strong></div>
                        </div>
                        <div className="portada-fila">Líquido de frenos <span className="portada-sello sello-cumple">CUMPLE</span></div>
                        <div className="portada-fila">Luces direccionales <span className="portada-sello sello-cumple">CUMPLE</span></div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ParaTuEmpresa() {
    const puntos = [
        ["Tus sedes y tus cargos", "Administrador de empresa, Director Regional, Coordinador de sede y Conductor: cada uno ve lo que le toca."],
        ["Tu propio checklist", "Una base común y tus propios ítems, categorías y preguntas, según el tipo de vehículo."],
        ["Quién hizo qué", "La Actividad registra cada cambio con el nombre de quien lo hizo y la hora."],
        ["Soporte adentro de la app", `Le escribes al equipo ${MARCA.nombre} desde la misma app y te responde ahí.`],
        ["Solo tu empresa ve lo tuyo", "Cada empresa ve únicamente sus vehículos, su gente y sus chequeos."],
        ["En cualquier municipio", "Tus sedes pueden estar en cualquiera de los municipios de Colombia."],
    ];
    return (
        <section className="portada-seccion" id="empresa">
            <div className="portada-envoltura">
                <h2>Hecho para toda tu empresa.</h2>
                <dl className="portada-lista-empresa">
                    {puntos.map(([titulo, texto]) => (
                        <div key={titulo}><dt>{titulo}</dt><dd>{texto}</dd></div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

export default Portada;
