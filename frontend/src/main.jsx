import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// === ESTILOS GLOBALES ===
// El orden importa: variables primero (define colores y tamanos),
// despues reset (normaliza navegadores), despues global (base),
// y por ultimo animations (animaciones reutilizables).
import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/global.css";
import "./styles/animations.css";

// === COMPONENTE PRINCIPAL ===
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
