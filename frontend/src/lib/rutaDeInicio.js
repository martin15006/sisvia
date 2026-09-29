// A donde va cada usuario al entrar: despues del login y cuando abre la portada
// con la sesion abierta (pacto portada-publica, HU-01.3). Una sola regla para
// los dos lugares.
export const rutaDeInicio = (usuario) => {
    if (usuario.debe_cambiar_password) return "/cambiar-password";
    if (usuario.rol === "conductor") return "/conductor";
    return "/dashboard";
};
