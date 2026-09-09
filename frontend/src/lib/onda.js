// Aplica un cambio de tema con la "onda" (View Transitions API) desde un punto
// de origen {x, y} en pantalla. Si el navegador no la soporta o el usuario pidio
// menos movimiento, degrada a un cambio instantaneo.
//
// `aplicar` es la funcion que de verdad cambia el tema (p.ej. setPreferencia).
export function cambiarConOnda(aplicar, origen) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const x = origen?.x ?? window.innerWidth / 2;
  const y = origen?.y ?? 0;

  if (reduce || !document.startViewTransition) {
    aplicar();
    return;
  }

  const raiz = document.documentElement;
  const radio = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );
  raiz.style.setProperty("--onda-x", `${x}px`);
  raiz.style.setProperty("--onda-y", `${y}px`);
  raiz.style.setProperty("--onda-r", `${radio}px`);
  raiz.dataset.ondaActiva = "1";

  const t = document.startViewTransition(() => aplicar());
  t.finished.finally(() => {
    delete raiz.dataset.ondaActiva;
  });
}
