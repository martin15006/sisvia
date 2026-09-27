---
pacto: correos-de-soporte
---

# Diario · Correos de Soporte: uno por conversación

> Evidencia de cada punto de control y de cada intento de sello. **No se lee para retomar**: lo
> pactado y el estado viven en el pacto (`2026-09-27-correos-de-soporte.md`). Acá se busca cuando
> hace falta saber qué se probó y cómo.

## Tandas 1 a 3 · 2026-09-27 · PC-HU-01 · PC-HU-02 · PC-HU-03

- **Suite:** `npm test` 161 de 161 (10 nuevos en `correosSoporte.test.js`) · lint 34 (= base; el único aviso de `MiPerfil.jsx` es el efecto que llena el formulario, de antes, que solo cambió de línea) · build OK.

### La migración (OB-01)

PostgreSQL 18 local y desechable (`scratchpad/pgcorreos`, puerto 55432, con los stubs de Supabase):

- Sobre el esquema de hoy: la migración corre, y la segunda corrida solo avisa que ya existe.
- Instalación desde cero con `INSTALAR_TODO.sql`: **29 tablas, 0 sin RLS**, las 3 funciones y las 2 columnas. La migración encima de esa instalación, también sin errores.
- Permisos: las 3 funciones, solo `service_role` (anon y authenticated, no).
- Conducta (`pgcorreos/pruebas.sql`, con dos personas del equipo y una conversación):

| Caso | Esperado | Dio |
|---|---|---|
| HU-01.1 conversación nueva | les toca a los dos, sin correo anterior | 2 filas |
| HU-01.2 otro mensaje sin abrirla | a nadie | 0 |
| HU-01.3 la abrió hace 11 min, después del correo | solo a ella | Martín |
| HU-01.4 la está mirando | a nadie | 0 |
| Límite: vista hace 9 min 59 s / 10 min justos | no / sí | 0 / 1 |
| CB-06: vista hace 5 min / 15 min | no / sí | 0 / 1 |
| CB-03 conversación sin filas (de antes) | a los dos | 2 |
| CB-02 liberar con la hora equivocada / con la buena | no toca / vuelve a tocar | sigue reclamado / 1 |
| Lista con repetidos y vacíos | uno por persona | 2 |
| Borrar la conversación y la persona | se van sus filas; `atiende_id` queda vacío | 4 → 2 → 1, vacío |

- **CB-01** con dos `psql` a la vez (el primero reclama y retiene 3 s): el segundo **esperó 2 s y reclamó 0**, con la fila existente y con una conversación nueva.
- **En Supabase, después de que Martín corrió la migración (2026-09-27):** columnas, tabla y función responden con `service_role`; con la llave pública, la tabla devuelve `[]` y las 3 funciones dan 401 *permission denied* (CL-09).

### Por API (`scratchpad/pc/pc-correos.cjs`, backend en :3002 con `CORREO_ACTIVO=0`)

A quién le toca cada correo se mira en `buzon_correo_estado` y en el log (una línea *"se omite: <asunto>"* por envío). **41 de 41 en la primera corrida** (`pc/correos-corrida1.txt`):

- HU-01.1 · RN-02 · RN-03 · conversación nueva: a los dos del equipo, **un** envío; a quien la escribió, nada (queda como vista); la campanita igual; el pie exacto en el correo.
- HU-01.2 · dos respuestas más sin abrirla: 0 envíos; la campanita avisó las dos.
- HU-01.4 · abrirla anota "la vio" después del correo; un mensaje enseguida: sin correo.
- HU-01.3 · la abrió hace rato: 1 correo; al que nunca la abrió, no.
- HU-01.5 · la respuesta de SISVIA y el resuelto: 1 correo a quien escribió.
- HU-02.2 · la conversación queda para quien respondió, y el correo le llega solo a él; la campanita, a todo el equipo.
- HU-02.3 · HU-03.2 · él apaga sus correos (sin contraseña, *"Listo: ya no te llegan correos de Soporte."*, `/me` lo trae apagado) y el correo le toca a los demás; lo vuelve a prender (*"Listo: te vuelven a llegar los correos de Soporte."*).
- CB-04 · quien la atiende, desactivado: le toca al resto del equipo.
- CB-05 · responde otra persona: pasa a ella.
- CB-01 · dos respuestas a la vez: **un** envío.
- CB-06 · vista hace 2 min y un solo mensaje: nada; vista hace 20 min: 1.
- CB-03 · conversación con sus filas borradas (como de antes del cambio): la primera novedad manda 1 a cada uno.
- HU-03.3-4 · el Coordinador: 403 *"Solo los Administradores reciben correos de Soporte."*; un valor que no es verdadero ni falso: 400; la Administradora de empresa con los correos apagados: sin correo, con campanita.
- **Lo que ya funcionaba:** `pc-hu18` (Soporte, pacto para-empresas) **51 de 51**, igual que antes.

### En la ventana (`navegador-visible`, app de pruebas en :5175)

- HU-03.1 · la Administradora de TST A (sesión cargada): "Correos de Soporte", el interruptor "Recibir correos de Soporte" prendido y la ayuda exacta; la fila mide 48 px.
- HU-03.2 · al tocarlo, *"Listo: ya no te llegan correos de Soporte."*, sin contraseña, y en la base `false`; al volver a tocarlo, *"Listo: te vuelven a llegar los correos de Soporte."*; después de recargar sigue prendido.
- CL-07 · medidor en Mi perfil: 0 fallas en claro y en oscuro (41 textos). En oscuro, la pista prendida se ve naranja con la bolita oscura.
- HU-03.1 · el Coordinador no ve la sección; **Martín (Administrador general), logueado por él**, la ve entre sus datos y "Dueño de SISVIA" (no se tocó su interruptor).
- **Soporte en la ventana:** la Administradora escribe (*"Mensaje enviado a SISVIA…"*), abre el hilo y responde dos veces: el hilo muestra los tres mensajes y el backend decidió **un solo correo**, el de la conversación nueva.

### Qué falló y cómo se arregló

- El primer intento de ver la sesión de Martín dio el login: la ventana no tenía su sesión. Entró otra vez y se vio bien.
- Al reflejar la migración en los instaladores, `node -e` con una comilla simple dentro rompió el comando en Bash: se pasó a un archivo (`pgcorreos/reflejar.cjs`), que copia sin `replace` (los `$$` pasaron enteros: +8 en cada archivo).

### Limpieza

- Empresas TST y cuentas `@sisvia.test`: 0. Avisos de prueba en campanitas reales: los del script los borra el script; los 9 del recorrido de Soporte, `limpiar-avisos.cjs`. Cloudinary: 0 sueltos.
- Queda **una** fila real en `buzon_correo_estado`: Martín abrió hoy la conversación de «sara martin» (TRANSCARGA) desde su propia app, que ya corre el código nuevo. Es uso real, no se tocó.
- PostgreSQL local detenido; servidores de prueba y ventana cerrados; archivos de sesión borrados.

## Sello · intento 1 · 2026-09-27

- Todo lo de arriba, contra el código final (sin cambios después de los puntos de control): suite 161 de 161, lint 34, build OK.
- **HU-01.6 queda ⏳ esperando a Martín:** es la prueba en su Gmail, después del push.
