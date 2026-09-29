// Panel recreado de la portada (HU-01.4): llegan los chequeos de la madrugada,
// KLM 204 cae en crítico y salta el aviso. Datos inventados y rotulados (RN-02).
// Corre solo mientras está en pantalla; con "reducir movimiento", queda quieto
// en el estado final.
import { useEffect, useRef, useState } from "react";
import { MARCA } from "../../lib/marca.js";
import { IconoAlerta, IconoCampana } from "./iconos.jsx";
import "./PanelEnVivo.css";

const TOTAL = 24;
const CHEQUEOS = [
    { hora: "5:31", placa: "WEP 318", estado: "operativo" },
    { hora: "5:32", placa: "SXT 927", estado: "observacion" },
    { hora: "5:33", placa: "GHA 553", estado: "operativo" },
    { hora: "5:34", placa: "KLM 204", estado: "critico", motivo: "Crítico · líquido de frenos" },
    { hora: "5:35", placa: "TMB 076", estado: "operativo" },
    { hora: "5:36", placa: "RJD 412", estado: "operativo" },
    { hora: "5:37", placa: "PLN 330", estado: "alerta" },
    { hora: "5:38", placa: "VCE 118", estado: "operativo" },
    { hora: "5:39", placa: "HMS 605", estado: "operativo" },
    { hora: "5:40", placa: "PQR 841", estado: "no", motivo: "No operativo · en reparación" },
    { hora: "5:41", placa: "BZT 290", estado: "operativo" },
    { hora: "5:42", placa: "DKA 771", estado: "observacion" },
];
// Ya bloqueado desde antes de la madrugada: por papeles, no por el chequeo.
const POR_PAPELES = { placa: "HNT 552", estado: "papeles", motivo: "SOAT vencido desde el 12/09" };
const NOMBRE = {
    operativo: "OPERATIVO", observacion: "OBSERVACIÓN", alerta: "ALERTA",
    critico: "CRÍTICO", no: "NO OPERATIVO", papeles: "BLOQUEADO",
};
const TRAMOS = ["operativo", "observacion", "alerta", "critico", "no"];
const noSale = (c) => c.estado === "critico" || c.estado === "no";
const PASO_CRITICO = CHEQUEOS.findIndex((c) => c.estado === "critico") + 1; // el paso en que entra KLM 204

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PanelEnVivo() {
    const raiz = useRef(null);
    const [paso, setPaso] = useState(() => (quieto() ? CHEQUEOS.length : 0));
    const [avisoCerrado, setAvisoCerrado] = useState(false);
    const [enPantalla, setEnPantalla] = useState(false);

    useEffect(() => {
        const observador = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { threshold: 0.2 });
        observador.observe(raiz.current);
        return () => observador.disconnect();
    }, []);

    // Un chequeo por vez; al llegar al final espera y vuelve a empezar.
    useEffect(() => {
        if (!enPantalla || quieto()) return undefined;
        let espera;
        if (paso >= CHEQUEOS.length) {
            espera = setTimeout(() => { setPaso(0); setAvisoCerrado(false); }, 5700);
        } else {
            const ultimo = CHEQUEOS[paso - 1];
            espera = setTimeout(() => setPaso((p) => p + 1), paso === 0 ? 900 : ultimo?.estado === "critico" ? 2600 : 1100);
        }
        return () => clearTimeout(espera);
    }, [paso, enPantalla]);

    // El aviso de la falla crítica aparece cuando entra KLM 204 y se va a los 3,8 s,
    // aunque sigan llegando chequeos.
    const llegoCritico = paso >= PASO_CRITICO;
    const aviso = llegoCritico && !avisoCerrado && !quieto();
    useEffect(() => {
        if (!llegoCritico || quieto()) return undefined;
        const t = setTimeout(() => setAvisoCerrado(true), 3800);
        return () => clearTimeout(t);
    }, [llegoCritico]);

    const hechos = CHEQUEOS.slice(0, paso);
    const cuenta = Object.fromEntries(TRAMOS.map((t) => [t, hechos.filter((c) => c.estado === t).length]));
    const noPuedenSalir = [POR_PAPELES, ...hechos.filter(noSale)];
    const conAviso = hechos.some((c) => c.estado === "critico");
    const hora = paso === 0 ? "5:30" : hechos[hechos.length - 1].hora;
    const animar = !quieto();

    return (
        <div className="panel-vivo" ref={raiz}>
            <p className="portada-solo-lector">
                Recreación del panel de {MARCA.nombre} con datos de ejemplo: en la madrugada llegan los chequeos
                de 12 de 24 vehículos, KLM 204 queda en crítico por el líquido de frenos y pasa a la lista de los que
                no pueden salir, junto a HNT 552, que tiene el SOAT vencido.
            </p>
            <div className="panel-vivo-etiqueta" aria-hidden="true"><span className="portada-ejemplo">PANEL RECREADO · DATOS DE EJEMPLO</span></div>
            <div className="panel-vivo-marco" aria-hidden="true">
                <div className="panel-vivo-barra">
                    <span className="panel-vivo-chip"><img src={MARCA.logo} alt="" />{MARCA.nombre}</span>
                    <span className="panel-vivo-empresa">Tu empresa · Sede Norte</span>
                    <span className="panel-vivo-hora">{hora} a. m.</span>
                    <span className={`panel-vivo-campana${conAviso ? " con-aviso" : ""}`}><IconoCampana /><b>1</b></span>
                </div>
                <div className={`panel-vivo-aviso${aviso ? " visible" : ""}`}>
                    <span className="panel-vivo-aviso-icono"><IconoAlerta /></span>
                    <div><strong>Falla crítica en KLM 204</strong><span>Líquido de frenos no cumple · el vehículo quedó en crítico</span></div>
                </div>
                <div className="panel-vivo-cuerpo">
                    <div className="panel-vivo-flota">
                        <div className="panel-vivo-flota-cabeza">
                            <h2>Así amanece tu flota.</h2>
                            <span className="portada-mono">{paso} de {TOTAL} revisados</span>
                        </div>
                        <div className="panel-vivo-franja">
                            {TRAMOS.map((t) => (
                                <span key={t} className={`panel-vivo-tramo tramo-${t}`} style={{ flexGrow: cuenta[t] }} />
                            ))}
                        </div>
                        <div className="panel-vivo-leyenda">
                            <span><i className="tramo-operativo" /><b>{cuenta.operativo}</b> operativos</span>
                            <span><i className="tramo-observacion" /><b>{cuenta.observacion}</b> en observación</span>
                            <span><i className="tramo-alerta" /><b>{cuenta.alerta}</b> en alerta</span>
                            <span><i className="tramo-critico" /><b>{noPuedenSalir.length}</b> no pueden salir</span>
                        </div>
                    </div>
                    <div className="panel-vivo-caja panel-vivo-caja-no">
                        <h3>No pueden salir <span className="portada-mono">{noPuedenSalir.length}</span></h3>
                        {noPuedenSalir.map((c) => (
                            <Renglon key={c.placa} chequeo={c} conMotivo animar={animar} />
                        ))}
                    </div>
                    <div className="panel-vivo-caja">
                        <h3>Chequeos de hoy <span className="portada-mono">en vivo</span></h3>
                        <div className="panel-vivo-lista">
                            {[...hechos].reverse().map((c) => (
                                <Renglon key={c.placa} chequeo={c} animar={animar} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Renglon({ chequeo, conMotivo = false, animar }) {
    return (
        <div className={`panel-vivo-renglon${animar ? " entra" : ""}`}>
            <span className="portada-placa-mini">{chequeo.placa}</span>
            {conMotivo
                ? <span className="panel-vivo-motivo">{chequeo.motivo}</span>
                : <span className="panel-vivo-hora-mini">{chequeo.hora} a. m.</span>}
            <span className={`panel-vivo-estado estado-${chequeo.estado}`}>{NOMBRE[chequeo.estado]}</span>
        </div>
    );
}

export default PanelEnVivo;
