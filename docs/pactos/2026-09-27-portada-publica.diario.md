---
pacto: portada-publica
---

# Diario · Portada pública y solicitudes de cita

> Evidencia de cada punto de control y de cada intento de sello. **No se lee para retomar**: lo
> pactado y el estado viven en el pacto (`2026-09-27-portada-publica.md`). Acá se busca cuando
> hace falta saber qué se probó y cómo.

## Tanda 1 · 2026-09-28 · PC-HU-01

- **Suite:** `npm test` en `backend/` · 161 de 161 · lint del front 34 (= base) · `vite build` OK.
- **Ventana:** front `vite` en el 5173 y backend local en el 3001 con `CORREO_ACTIVO=0`, en la ventana de Chrome de `navegador-visible`, a 1440 × 900 y a 390 × 844.

### La migración (OB-01)

PostgreSQL 18 local y desechable (`scratchpad/pgcorreos`, puerto 55432, con los stubs de Supabase):

- Sobre el esquema de hoy: corre, y la segunda corrida no falla (`solicitudes | true` las dos veces).
- Instalación desde cero con `INSTALAR_TODO.sql`: sin errores, **30 tablas**, `solicitudes` con RLS activo.
- Límites (el valor límite entra, el siguiente no): empresa 120/121, vehículos 9999/10000 y 1/0, mensaje 1000/1001; sin `autorizo_datos_en` no entra; estado `descartada` no entra; estado por defecto `nueva`.
- Al terminar: base de prueba borrada y cluster apagado.

### Criterio por criterio

| Qué | Cómo se probó | Dio |
|---|---|---|
| HU-01.1 | Ventana: títulos en orden leídos del DOM. Capturas a 1440 y 390 contra la maqueta aprobada | Mismo orden que el pacto; fiel a la maqueta |
| HU-01.2 | Ventana: "Entrar" del menú → `/login`; "Reservar una cita" → `#cita`, con la sección a 64 px de arriba (debajo del menú) | ✅ |
| HU-01.3 | Ventana, con un script de prueba que responde `/auth/me` en la página (ver abajo) y otro que anota cada ruta: conductor `/ → /conductor`; debe cambiar la contraseña `/ → /cambiar-password`; admin_empresa `/ → /dashboard`. En ninguno aparece la portada | ✅ |
| HU-01.4 | Ventana: el panel suma chequeos, sale "Falla crítica en KLM 204" y la campanita; la placa baja nivel por nivel y se bloquea en crítico. Con `set media light reduced-motion`: "12 de 24 revisados", 3 en "No pueden salir", aviso oculto, campanita con aviso, placa bloqueada en "Crítico" | ✅ |
| HU-01.5 | Ventana: los dos botones de WhatsApp abren `wa.me/573332540815?text=Hola, quiero conocer SISVIA para mi empresa`; "Copiar el correo" → "Correo copiado" y a los 2,5 s vuelve | ✅ |
| HU-01.6 | Ventana a 390: sin desplazamiento horizontal. Controles < 44 px: solo las etiquetas de los campos (el campo mide 48) y la casilla de 22 px, que se toca por su etiqueta de 44+ px | ✅ |
| CB-10 | Token inventado en `localStorage` → `/`: el servidor responde 401, se borra el token y queda la portada, sin dar vueltas | ✅ |
| CB-11 | `/esta-no-existe` → `/` con la portada | ✅ |
| CB-12 | `sisvia-tema=oscuro` guardado: `<html data-tema="oscuro">`, la portada `data-tema="claro"`; panel blanco, texto gris claro y franja verde con los valores del claro. Captura igual a la del claro | ✅ |

**Por qué se simuló `/auth/me` (HU-01.3):** las dos cuentas `@sisvia.test` que quedan en Auth ya no tienen perfil (la limpieza de la base), y la regla es no crear cuentas en producción para probar ni usar superadmin en la ventana. `agent-browser network route --body` no sirve: la respuesta falsa no trae CORS (el front está en el 5173 y la API en el 3001) y el navegador la bloquea ("Failed to fetch"). Se usó `scratchpad/landing/simular-me.js` como `--init-script`: envuelve `fetch` y responde `/auth/me` solo si `sessionStorage.__simular_me` existe. No es código de SISVIA.

### Cláusulas

- **CL-02:** ningún "SISVIA" a mano en `pages/Portada/`; nombre, lema, logo, correo, WhatsApp y ciudad salen de `marca.js`.
- **CL-03:** cero "SENA" en `pages/Portada/`.
- **CL-04:** cero hex, `rgb()` o `rgba()` en los `.css` de la portada; los colores propios son `--portada-*` en `variables.css`.
- **CL-05:** franjas, semáforo, panel y sellos de estado con `--veh-*`.
- **CL-06:** cada `.jsx` con su `.css`; en línea solo el `flexGrow` de cada tramo de la barra y el `translateY` de la placa, que se calculan.
- **CL-07:** medidor `scratchpad/medir.js`: 1440 → 249 textos, 0 fallas (claro y con el oscuro guardado); 390 con movimiento reducido → 245 textos, 0 fallas.
- **CL-08:** ver HU-01.6.

### Qué falló y cómo se arregló

- El ícono del aviso "Falla crítica" salía gris: la regla de los textos del aviso (`.panel-vivo-aviso span`) también pintaba el `span` del ícono. Ahora es `div > span`.
- Menos de 44 px: la marca del menú y del pie (34 y 26 px), el correo del pie (18 px), el correo del aviso de datos y "Entrar" del pie (40 px de ancho). Arreglado con `min-height`/`min-width` y relleno.
- Dos reglas de color de la portada perdían contra la general (`.portada-pagina h1…h3 { color: inherit }` y `.portada-pagina a`): el título rojo de "No pueden salir" y el enlace del aviso de datos. Se les subió la especificidad.
- `react-hooks/set-state-in-effect` en el aviso del panel: el aviso se calcula del paso y solo se guarda que ya se cerró.
- A 390, en plena animación, el medidor marcó 4 textos bajo 4.5:1: eran renglones y el aviso a mitad de su aparición (opacidad en transición). Quietos dan 0 fallas.
- El puerto 5173 lo tenía otro Vite de SISVIA (no lanzado en esta sesión); se usó ese. Después de un corte se apagaron los dos y se levantaron de nuevo.

## Tandas 2 y 3 · 2026-09-28 · PC-HU-02 · PC-HU-03

- **Suite:** `npm test` en `backend/` · 182 de 182 (21 nuevos en `solicitudes.test.js`) · lint del front 34 (= base) · `vite build` OK.
- **Migración:** corrida por Martín en Supabase el 2026-09-28.
- **Servidores:** Martín tenía su propio `npm run dev` (nodemon en 3001, Vite en 5173). La primera prueba en ventana la atendió su backend, que no tiene `SOLICITUDES_COPIA` y escribe el registro en su consola: por eso no aparecía el resultado del correo en el mío. Diagnóstico con registros temporales (ya quitados) en un backend aislado: `PORT=3002 CORREO_ACTIVO=1 SOLICITUDES_COPIA=<correo de Martín>` y Vite propio en 5174 con `VITE_API_URL=http://localhost:3002/api`.

| Qué | Cómo se probó | Dio |
|---|---|---|
| HU-02.1 | Ventana: formulario lleno + casilla → "Listo, recibimos tu solicitud. Te escribimos pronto para acordar la cita." en lugar del formulario, con el foco ahí. En la base: estado `nueva`, `autorizo_datos_en` con fecha | ✅ |
| HU-02.2 | Tests (vacío, espacios, `null`) + ventana: formulario vacío → los 4 textos exactos y el foco en Empresa | ✅ |
| HU-02.3 · CB-03 | Tests: 9, 10 y 11 dígitos, fijo, `+57 300 123-4567` → `+573001234567`. Ventana: `+57 300 000-0000` guardado `+573000000000` | ✅ |
| HU-02.4 | Tests: 1 y 9999 entran; 0, 10000, 2.5, -3, "25 aprox", "abc" no; correo con y sin forma | ✅ |
| HU-02.5 | Tests: 120/121, 80/81, 100/101, 254/255, 1000/1001. En la tabla, los mismos límites (probado en la base local en la tanda 1) | ✅ |
| HU-02.6 | Ventana (5174) con la red cortada a los 2,5 s: "Enviando…" y botón desactivado; después "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." (`role=alert`), con lo escrito y la casilla intactos | ✅ |
| HU-02.7 | **Pedido de Martín.** Ventana: todo lleno sin la casilla → "Marca la casilla para que podamos guardar tus datos.", foco en la casilla, base en 0. Por API, sin la casilla y con `"autorizo":"true"` (texto) → 400. Tests: `false`, `undefined`, `"true"`, `1`, `"on"` no valen | ✅ |
| CB-01 | Ventana: dos toques seguidos a "Enviar" → 1 sola fila | ✅ |
| CB-02 | Test: el HTML se guarda tal cual. Script: el correo trae `&lt;script&gt;` y `&lt;b&gt;`, nunca crudos. La página Solicitudes lo muestra como texto (React) | ✅ |
| CB-04 | Test con el limitador real (5 × 201, la 6.ª 429 con el texto; 8 errores 400 no gastan). Script contra la ruta montada: 3 × 400, 2.ª a 5.ª 201, 6.ª 429 con el texto, nada guardado. Ventana: con el tope gastado, el formulario muestra el texto de RN-04 | ✅ |
| CB-05 | Test + script contra la ruta: trampa llena → 201, 0 solicitudes y 0 avisos nuevos | ✅ |
| HU-03.1 | Base: 3 avisos `solicitud_cita`, uno por superadmin activo, "Nueva solicitud de cita" · "TST Transportes Portada · Ibagué · 12 vehículos" · `/admin/solicitudes`. Test del texto con y sin vehículos | ✅ |
| HU-03.2 | Backend aislado: `[solicitudes] aviso: campanita a 3, correo a 2` (1,5 s). Tests: destinos, copia vacía, repetida o mal escrita, asunto exacto. Script: el correo trae WhatsApp y "Ver en SISVIA" | ✅ |
| CB-06 · CB-07 · RN-06 | Tests: correo apagado, correo que falla, campanita que falla y sin superadmin → la solicitud queda guardada | ✅ |
| HU-03.3 | Lo prueba Martín en su Gmail tras el push | ⏳ |
| HU-04.4 | Test del guardia con cada rol (y el suplente) → 403. Script: GET, `/nuevas`, PATCH y DELETE sin sesión → 401 | ✅ |
| CB-08 | Script: dos del equipo marcan la misma a la vez → las dos respuestas dicen "sandra beltran" y en la base quedó una sola persona | ✅ |

- **Contraste (CL-07):** 390 px con los errores a la vista, 224 textos, 0 fallas en claro y con el oscuro guardado. Errores `#FCA5A5` sobre `#111`.
- **Qué falló y cómo se arregló:** `react/no-unused-vars` por la desestructuración que quitaba un error (ahora `delete`). El navegador de agent-browser se reinició en blanco una vez a mitad de una prueba (falla conocida con el PC cargado): se reabrió y se repitió. La solicitud "TST Diagnostico Correo" quedó con "Ibagu�" porque `curl` desde Git Bash no manda la tilde en UTF-8; desde la ventana se guarda bien.

## Tanda 4 · 2026-09-28 · Enmienda 1 · PC-HU-02 · PC-HU-07 (y parte de PC-HU-01 y PC-HU-04)

- **Suite:** `npm test` 194 de 194 (25 en `solicitudes.test.js`, 8 en `registroIp.test.js`) · lint del front 34 (= base) · `vite build` OK.
- **Migración `2026-09-28_registro_ip.sql`:** PostgreSQL local (55432) sobre el esquema de hoy, dos corridas sin error; instalación desde cero con `INSTALAR_TODO.sql` sin error (las funciones de la marca quedan solo en su versión nueva: 4, 4, 3 y 5 parámetros). Conducta: auditoría de empresa con IP → el registro la trae; `dar_marca_dueno` con 2 parámetros (backend viejo) y `quitarme_marca_dueno` con IP → las dos anotan; tipo `solicitud` entra y uno inventado no; solo `service_role` ejecuta. Martín ya la corrió en Supabase.
- **Servidores:** backend propio en 3002 y Vite en 5174 (Martín tiene su `npm run dev` en 3001/5173). La ventana con la sesión de Martín.

| Qué | Cómo se probó | Dio |
|---|---|---|
| HU-02.8 · CB-15 | Ventana (127.0.0.1:5174, sin sesión): pegar "Ana 2 López @" → "Ana López"; "Ibagué 7" → "Ibagué"; teclear "María#3 O'Neil" → "María O'Neil"; "Bogotá 1 D.C." → "Bogotá D.C.". Tests: nombres buenos y malos, ciudades, la empresa acepta todo, el vacío y el largo se avisan antes | ✅ |
| HU-04.3 | Ventana: la Nueva solo tiene "Marcar como contactada"; las contactadas, "Borrar"; al marcar, "Contactada por Juan Sebastián Martín Moncada · 28 de sept" y aparece "Borrar". Confirmación exacta "¿Borrar la solicitud de TST Lista Treinta? No se puede deshacer."; 5 borradas | ✅ |
| CB-13 | Script contra la base: borrar una Nueva → 409 "Primero márcala como contactada." y sigue en la base | ✅ |
| HU-04.5 | Registro del equipo (ventana y base): "Marcó como contactada la solicitud de TST Enmienda Uno · Neiva" y 5 "Borró la solicitud de …", todos con IP y navegador. Test del texto exacto | ✅ |
| HU-04.6 | Ventana: solicitud TST creada en la base con la ventana en Empresas → el número del menú apareció a los 2 s (tope 10). En la página Solicitudes → la lista la trajo a los 27 s (tope 30) | ✅ |
| CB-16 | La misma prueba: lo que cambia afuera de la pestaña aparece en la siguiente actualización, sin error | ✅ |
| HU-04.2 (vacía) | Ventana: con todo borrado, "Todavía no hay solicitudes. Cuando una empresa llene el formulario de la portada, aparece aquí." | ✅ |
| HU-07.1 | Registro: marcar y borrar solicitudes, y "Entró a la empresa TRANSCARGA" (auditoría de empresas → copia de la base) con "IP ::1 · Chrome 153 · Windows". Tests: el middleware real detrás de proxy (`X-Forwarded-For`), después de un `await` | ✅ |
| HU-07.2 | Ventana: los "Entró a la empresa TRANSCARGA" de antes, sin línea de IP | ✅ |
| HU-07.3 · RN-07 | Tests: ningún rol de empresa guarda IP; el middleware no da nada fuera del equipo ni fuera de un pedido; la Actividad de una empresa nunca trae la línea | ✅ |
| CB-14 · CB-17 | Tests: `::ffff:` se quita; sin navegador → "IP … · navegador desconocido" | ✅ |
| HU-01.8 | Ventana: "Volver al inicio" en el login lleva a `/` con la portada | ✅ |
| HU-01.7 | Ventana: "Cerrar sesión" **terminó en `/login`** ❌ → arreglado (ver abajo); falta verlo con sesión | ⏳ |
| HU-04.1 adentro · CB-09 | Falta mirarlos con la sesión de Martín | ⏳ |

- **Qué falló y cómo se arregló:**
  - **Cerrar sesión iba a `/login`.** `navigate("/")` corre como transición en React Router 7 y `ProtectedRoute`, al quedar sin usuario, redirige antes a `/login`. Arreglo en la raíz: `AuthContext.salioPorSuCuenta` (true al cerrar sesión, false al entrar o si lo sacan) y `ProtectedRoute` manda a `/` o a `/login` según eso.
  - **Sobrescribí `backend/test/respaldo.test.js`** (los tests de "Exportar todo", HU-04 de para-empresas) al crear el de la IP con el mismo nombre. Recuperado con `git show HEAD:…` (lectura) y devuelto idéntico (git no lo marca cambiado); el nuevo se llama `registroIp.test.js`. La suite volvió a contar los 161 de antes.
  - El primer clic en "Marcar como contactada" salió antes de que la página terminara de cargar; se repitió.
- **Limpieza (OK de Martín):** borradas las 5 solicitudes (4 TST y "hola") desde la ventana y sus 9 avisos de campanita por script. Quedan 3 avisos de "mineria · ibague · 2 vehículos" (la solicitud ya no existe): los decide Martín.
