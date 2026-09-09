// Modulo de Ajustes. Por ahora gestiona el tema (claro / oscuro).
import { useTheme } from "../../lib/useTheme.js";
import { cambiarConOnda } from "../../lib/onda.js";
import AdminLayout from "../../components/AdminLayout/AdminLayout.jsx";
import "./Ajustes.css";

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

const OPCIONES = [
  { valor: "claro", titulo: "Claro", icono: <Sol /> },
  { valor: "oscuro", titulo: "Oscuro", icono: <Luna /> },
];

function Ajustes() {
  const { preferencia, temaEfectivo, setPreferencia } = useTheme();

  const elegir = (e, valor) =>
    cambiarConOnda(() => setPreferencia(valor), { x: e.clientX, y: e.clientY });

  return (
    <AdminLayout titulo="Ajustes">
      <section className="ajustes-seccion">
        <h3 className="ajustes-titulo">Apariencia</h3>
        <p className="ajustes-sub">
          Elige cómo se ve la aplicación. Actualmente:{" "}
          <b>{temaEfectivo === "oscuro" ? "oscuro" : "claro"}</b>.
        </p>

        <div className="ajustes-rows">
          {OPCIONES.map((o) => {
            const activa = preferencia === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                className={`ajustes-row ${activa ? "ajustes-row--activa" : ""}`}
                onClick={(e) => elegir(e, o.valor)}
                aria-pressed={activa}
              >
                <span className="ajustes-row-ic">{o.icono}</span>
                <span className="ajustes-row-tt">{o.titulo}</span>
                <span className="ajustes-row-rd" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </AdminLayout>
  );
}

export default Ajustes;
