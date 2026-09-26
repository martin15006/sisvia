// Avisos de la campanita cuando cambia la marca "Dueño de SISVIA"
// (pacto para-empresas, HU-20.5-7; enmienda 8, 2026-09-22: "toca colocar las
// notificaciones de cuando se coloca otro dueño para ver si sirvió").
//
// Le avisa a quien recibe la marca y a los demás dueños. Nunca frena la
// respuesta: si el aviso falla, el cambio de marca ya está hecho igual.
import { supabase } from '../config/supabase.js';
import { crearNotificacionDirecta } from './notificaciones.service.js';

const TEXTOS = {
    dio: {
        alDestino: (actor) => ({ titulo: 'Ahora eres dueño de SISVIA', mensaje: `${actor} te dio la marca de dueño: ya ves el Registro del equipo.` }),
        alResto: (actor, destino) => ({ titulo: 'Hay un dueño nuevo', mensaje: `${actor} le dio la marca de dueño a ${destino}.` }),
    },
    paso: {
        alDestino: (actor) => ({ titulo: 'Ahora eres dueño de SISVIA', mensaje: `${actor} te pasó su marca de dueño y dejó de serlo.` }),
        alResto: (actor, destino) => ({ titulo: 'La marca de dueño cambió', mensaje: `${actor} le pasó la marca de dueño a ${destino}.` }),
    },
    quito: {
        alResto: (actor) => ({ titulo: 'Un dueño dejó la marca', mensaje: `${actor} se quitó la marca de dueño de SISVIA.` }),
    },
};

const RUTA = '/admin/mi-perfil';

export const avisarCambioDeMarca = async ({ accion, actor, destino = null }) => {
    try {
        const textos = TEXTOS[accion];
        if (!textos) return;

        const { data: duenos } = await supabase.from('usuarios').select('id').eq('es_dueno', true);
        const resto = (duenos || []).map((d) => d.id).filter((id) => id !== actor.id && id !== destino?.id);

        if (destino && textos.alDestino) {
            const { titulo, mensaje } = textos.alDestino(actor.nombre_completo);
            await crearNotificacionDirecta({ destinatarioIds: [destino.id], tipo: 'marca_dueno', titulo, mensaje, url_destino: RUTA });
        }
        if (resto.length > 0) {
            const { titulo, mensaje } = destino
                ? textos.alResto(actor.nombre_completo, destino.nombre_completo)
                : textos.alResto(actor.nombre_completo);
            await crearNotificacionDirecta({ destinatarioIds: resto, tipo: 'marca_dueno', titulo, mensaje, url_destino: RUTA });
        }
    } catch (err) {
        console.error('No se pudo avisar el cambio de la marca de dueño:', err.message);
    }
};
