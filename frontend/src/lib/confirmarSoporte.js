// Contraseña del superadmin para los cambios dentro de una empresa (HU-16.2-3).
// El backend responde 403 `confirmar_password` y el helper `api` pide la
// contraseña con el modal <ConfirmarSoporte> y reintenta.
//
// Un "Guardar" puede ser varios pedidos seguidos (vehículo + fotos + RUNT): la
// contraseña confirmada se reusa 20 segundos, solo en memoria (nunca en el
// almacenamiento del navegador). El backend la verifica y registra cada pedido.

const VIGENCIA_MS = 20 * 1000;
let recordada = null; // { password, hasta }

export const passwordRecordada = () =>
    recordada && Date.now() < recordada.hasta ? recordada.password : null;

export const recordarPassword = (password) => {
    recordada = { password, hasta: Date.now() + VIGENCIA_MS };
};

export const olvidarPassword = () => {
    recordada = null;
};

// Abre el modal y devuelve la contraseña escrita, o null si se cancela.
// detalle: { accion, empresa, error }
export const pedirPassword = (detalle) =>
    new Promise((resolve) => {
        window.dispatchEvent(
            new CustomEvent("soporte:pedir-password", { detail: { ...detalle, responder: resolve } })
        );
    });
