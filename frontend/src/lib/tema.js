// Gestion del tema (claro / oscuro). Sin dependencias y desacoplado del login:
// funciona en cualquier pantalla, incluida la de Login. Por defecto: CLARO
// (no sorprendemos a nadie con oscuro; el que lo quiera lo activa en Ajustes).
const CLAVE = "sisvia-tema";
const EVENTO = "sisvia-tema-cambio";

export function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(pref) {
  const efectivo = pref === "oscuro" ? "oscuro" : "claro";
  document.documentElement.setAttribute("data-tema", efectivo);
  return efectivo;
}

export function guardarPreferencia(pref) {
  try {
    localStorage.setItem(CLAVE, pref);
  } catch {
    /* modo privado / sin storage: solo se aplica en memoria */
  }
  const efectivo = aplicarTema(pref);
  // Avisa a las demas instancias del hook (toggle del sidebar, pagina Ajustes).
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: pref }));
  return efectivo;
}

// Suscribe a cambios hechos por OTRAS instancias del hook.
export function suscribirCambio(cb) {
  const handler = (e) => cb(e.detail);
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}
