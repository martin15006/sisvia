// Nombre de la ORGANIZACION que se muestra en la cabecera, el pie y los
// documentos (pacto para-empresas, HU-08 · CL-02): la empresa del usuario.
// El superadmin ve la empresa a la que entro, o el nombre del producto (HU-08.4).
// El backend usa la misma regla (organizacionDeUsuario en export/branding.js).
import { MARCA } from "./marca.js";

export const nombreOrganizacion = (usuario, empresaActiva = null) => {
    if (!usuario) return "";
    if (usuario.rol === "superadmin") return empresaActiva?.nombre || MARCA.nombre;
    return usuario.empresa_nombre || MARCA.nombre;
};
