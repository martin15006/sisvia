// El semáforo de KLM 204 (HU-01.4): baja un nivel por cada falla y se bloquea al
// cruzar la puerta. Los rangos son los de la app (operativo 0–19 … no operativo
// 90–100). Con "reducir movimiento", queda quieto en crítico.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconoCandado, IconoVisto } from "./iconos.jsx";
import "./SemaforoPlaca.css";

const NIVELES = [
    { clase: "operativo", nombre: "Operativo", rango: "0–19 %" },
    { clase: "observacion", nombre: "Observación", rango: "20–39 %" },
    { clase: "alerta", nombre: "Alerta", rango: "40–59 %" },
    { clase: "critico", nombre: "Crítico", rango: "60–89 %" },
    { clase: "no-operativo", nombre: "No operativo", rango: "90–100 %" },
];
const PUERTA = 3;        // de crítico para abajo, no sale
const ULTIMO_PASO = 3;   // recorre operativo → crítico y vuelve a empezar

const quieto = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function SemaforoPlaca() {
    const raiz = useRef(null);
    const placa = useRef(null);
    const niveles = useRef([]);
    const [paso, setPaso] = useState(() => (quieto() ? ULTIMO_PASO : 0));
    const [enPantalla, setEnPantalla] = useState(false);
    const [desplazamiento, setDesplazamiento] = useState(9);

    // La placa se centra sobre el nivel actual, midiendo donde quedo cada uno.
    const ubicar = useCallback(() => {
        const nivel = niveles.current[paso];
        if (!nivel || !placa.current) return;
        setDesplazamiento(nivel.offsetTop + (nivel.offsetHeight - placa.current.offsetHeight) / 2);
    }, [paso]);

    useLayoutEffect(ubicar, [ubicar]);

    useEffect(() => {
        window.addEventListener("resize", ubicar);
        return () => window.removeEventListener("resize", ubicar);
    }, [ubicar]);

    useEffect(() => {
        const observador = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { threshold: 0.3 });
        observador.observe(raiz.current);
        return () => observador.disconnect();
    }, []);

    useEffect(() => {
        if (!enPantalla || quieto()) return undefined;
        const t = setTimeout(() => setPaso((p) => (p + 1) % (ULTIMO_PASO + 1)), paso === ULTIMO_PASO ? 4200 : 1500);
        return () => clearTimeout(t);
    }, [paso, enPantalla]);

    const bloqueada = paso >= PUERTA;

    return (
        <figure className="semaforo" ref={raiz}
            aria-label="Ejemplo: la criticidad de KLM 204 sube con cada falla del chequeo hasta crítico, y ahí el preoperacional queda bloqueado">
            <div className="semaforo-titulo"><strong>Estado de KLM 204</strong><span className="portada-ejemplo">EJEMPLO</span></div>
            <div className="semaforo-escala" aria-hidden="true">
                {NIVELES.map((n, i) => (
                    <Fragment key={n.clase}>
                        {i === PUERTA && <div className="semaforo-puerta">De aquí para abajo, no sale</div>}
                        <div ref={(el) => { niveles.current[i] = el; }}
                            className={`semaforo-nivel nivel-${n.clase}${i === paso ? " actual" : ""}`}>
                            {n.nombre} <span className="portada-mono">{n.rango}</span>
                        </div>
                    </Fragment>
                ))}
                <div ref={placa} className={`semaforo-placa${bloqueada ? " bloqueada" : ""}`}
                    style={{ transform: `translateY(${desplazamiento}px)` }}>
                    <IconoCandado grosor={2.4} />KLM 204
                </div>
            </div>
            {/* Los dos mensajes ocupan la misma celda: la caja no cambia de alto. */}
            <div className={`semaforo-aviso${bloqueada ? " activo" : ""}`} aria-hidden="true">
                <div className="semaforo-aviso-mensaje mensaje-sale">
                    <IconoVisto />
                    <div><strong>Puede salir.</strong> Hasta alerta, el preoperacional se puede iniciar.</div>
                </div>
                <div className="semaforo-aviso-mensaje mensaje-bloqueo">
                    <IconoCandado />
                    <div><strong>Intento bloqueado.</strong> KLM 204 quedó en crítico: el preoperacional no se puede iniciar y el coordinador ya lo sabe.</div>
                </div>
            </div>
        </figure>
    );
}

export default SemaforoPlaca;
