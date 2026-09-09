// ============================================================
// MARCA — identidad del producto en UN SOLO LUGAR (lado servidor).
//
// Espejo de frontend/src/lib/marca.js. Si el producto se renombra,
// se cambia ACA y alla. Nada mas.
// ============================================================

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MARCA = {
    nombre: "SISVIA",
    nombreLargo: "SISVIA · Control de vehículos",
    lema: "Chequeo preoperacional y control de vehículos",
};

// Nombre de la ORGANIZACION que usa el sistema (el cliente, no el producto).
// Encabeza los PDF y Word generados. Por entorno, para que el mismo
// despliegue sirva a varios clientes.
export const ORGANIZACION = process.env.ORG_NOMBRE || "Mi organización";

// Logo para documentos y correos. PNG porque @react-pdf/renderer y los
// clientes de correo no renderizan SVG.
export const LOGO_PATH = join(__dirname, "..", "services", "export", "assets", "logo.png");
