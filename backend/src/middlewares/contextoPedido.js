// El pedido en curso, para lo que escribe el Registro del equipo (pacto
// portada-publica, enmienda 1: HU-07). Un solo lugar mira la IP y el navegador;
// los que registran piden respaldoDelPedido() sin tener que recibir req.
// req.usuario lo llena verificarToken despues: se lee al momento de registrar.
import { AsyncLocalStorage } from 'node:async_hooks';
import { datosDeRespaldo } from '../services/respaldoReglas.js';

const almacen = new AsyncLocalStorage();

export const contextoPedido = (req, res, next) => almacen.run({ req }, next);

// { ip, navegador } si quien hace el pedido es del equipo SISVIA; si no, {} (RN-07).
// Fuera de un pedido (un cron, un script), {}.
export const respaldoDelPedido = () => {
    const req = almacen.getStore()?.req;
    if (!req) return {};
    return datosDeRespaldo({ usuario: req.usuario, ip: req.ip, agente: req.get?.('user-agent') });
};
