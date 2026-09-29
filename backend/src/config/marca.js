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
    // Contacto publico del equipo: a este correo llegan las solicitudes de cita
    // de la portada. La copia personal va en la variable SOLICITUDES_COPIA.
    contacto: {
        correo: "sisviacontacto@gmail.com",
        whatsapp: "573332540815",
        whatsappVisible: "333 254 0815",
        ciudad: "Ibagué, Tolima",
    },
};

// El nombre de la ORGANIZACION (el cliente) ya no va aca: sale de la empresa de
// cada sede o usuario (pacto para-empresas, HU-08 · CL-02). Ver export/branding.js.

// Logo para documentos y correos. PNG porque @react-pdf/renderer y los
// clientes de correo no renderizan SVG.
export const LOGO_PATH = join(__dirname, "..", "services", "export", "assets", "logo.png");
