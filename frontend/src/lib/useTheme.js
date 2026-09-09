import { useEffect, useState, useCallback } from "react";
import { leerPreferencia, guardarPreferencia, suscribirCambio } from "./tema.js";

// Hook de tema. Expone la preferencia ('claro'|'oscuro'), el tema efectivo
// (igual a la preferencia) y un setter que persiste + aplica.
export function useTheme() {
  const [preferencia, setPref] = useState(leerPreferencia);

  // Cambios hechos desde OTRA instancia del hook (otro toggle / Ajustes).
  useEffect(() => suscribirCambio((pref) => setPref(pref)), []);

  const temaEfectivo = preferencia === "oscuro" ? "oscuro" : "claro";

  // Mantiene <html data-tema> en sincronia (efecto de DOM, no setState).
  useEffect(() => {
    document.documentElement.setAttribute("data-tema", temaEfectivo);
  }, [temaEfectivo]);

  const setPreferencia = useCallback((pref) => {
    guardarPreferencia(pref);
    setPref(pref);
  }, []);

  return { preferencia, temaEfectivo, setPreferencia };
}
