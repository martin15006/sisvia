// Regla PURA del informe al superior (Dashboard → "Informar a mi superior").
// Sin base de datos, para probarla con node --test.

// Texto del informe en la campanita (y en Notificaciones). Lleva TODO: el asunto,
// el mensaje y el resumen del area. Antes llevaba solo el asunto y el resto viajaba
// solo por correo, asi que sin correo configurado el superior no lo veia nunca.
// HU-18.10: si el informe cae en el equipo SISVIA (la empresa no tiene
// Administrador de empresa), no se ofrece el resumen del area: a SISVIA no le
// sirve, y para escribirle a SISVIA esta "Escribir a SISVIA".
export const ofreceResumen = (superior) => !superior?.equipoSisvia;

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const textoInforme = ({ asunto, mensaje, area, resumen, correoEnviado }) => {
    const lineas = [`Asunto: ${asunto}`, mensaje.trim()];
    if (resumen) {
        lineas.push(`Resumen${area ? ` de ${area}` : ''}: ${[
            plural(resumen.vehiculos, 'vehículo', 'vehículos'),
            plural(resumen.criticos, 'crítico', 'críticos'),
            plural(resumen.noOperativos, 'no operativo', 'no operativos'),
            plural(resumen.chequeosHoy, 'chequeo hoy', 'chequeos hoy'),
        ].join(' · ')}`);
    }
    if (correoEnviado) lineas.push('📧 También te llegó una copia a tu correo.');
    return lineas.join('\n');
};
