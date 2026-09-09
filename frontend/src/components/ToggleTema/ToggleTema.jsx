// Interruptor de tema con "onda": al cambiar, la View Transitions API revela el
// nuevo tema con un circulo que crece desde la sede del boton. Si el navegador
// no la soporta o el usuario pidio menos movimiento, el cambio es instantaneo.
import { useRef } from "react";
import { useTheme } from "../../lib/useTheme.js";
import { cambiarConOnda } from "../../lib/onda.js";
import "./ToggleTema.css";

const Sol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
const Luna = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

function ToggleTema({ className = "" }) {
  const { temaEfectivo, setPreferencia } = useTheme();
  const ref = useRef(null);
  const oscuro = temaEfectivo === "oscuro";
  const siguiente = oscuro ? "claro" : "oscuro";

  const cambiar = () => {
    const r = ref.current?.getBoundingClientRect();
    const origen = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    cambiarConOnda(() => setPreferencia(siguiente), origen);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`toggle-tema ${className}`}
      onClick={cambiar}
      role="switch"
      aria-checked={oscuro}
      aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="toggle-tema-thumb">{oscuro ? <Luna /> : <Sol />}</span>
    </button>
  );
}

export default ToggleTema;
