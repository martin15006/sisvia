---
pacto: portada-publica
nivel: 1          # 1 = ficha · 2 = SRS
estado: en tandas # borrador → firmado (al firmar) → en tandas (1.ª tanda) → sellado (al sellar)
creado: 2026-09-27
---

# Pacto · Portada pública y solicitudes de cita

> **Dónde quedamos**
> 2026-09-28 · Última: tandas 2 y 3 (PC-HU-02 ✅; PC-HU-03 ✅ salvo HU-03.3); código de HU-04 hecho (OB-13 a OB-15)
> 2026-09-28 · Última: tanda 5, la enmienda 2 construida (CL-14 aprobada; "TST Enmienda Dos" enviada con sus 3 avisos)
> Sigue: con la sesión de Martín en la ventana (5174): HU-03.1 desde la campanita, HU-04.7, HU-04.1 adentro, CB-09 y al final HU-01.7 → PC-HU-01 y PC-HU-04; después HU-05 y HU-06 (Should)
> Bloqueos: que Martín entre en la ventana · HU-03.3 espera el push

## 1. Qué y por qué

**Pedido (textual):** "perfecto ahora miremos para hacer una landing page que dices? porque es lo que nos falta por el momento […] toca hacerlo mucho mejor y a nuestros estilos" · y, con la maqueta aprobada: "si me gusta, arma el pacto para construirla".

**Problema:** SISVIA no tiene cara pública. Quien abre `sisvia.pages.dev` cae en el login, y una empresa interesada no tiene cómo saber qué hace SISVIA ni cómo empezar. La suscripción arranca con una cita, y hoy no hay por dónde pedirla.

**Para quién:** la empresa que todavía no usa SISVIA (quien maneja la flota o el dueño), y el equipo SISVIA (los superadmin), que recibe las solicitudes.

**La maqueta aprobada** es el contrato visual: [`2026-09-27-portada-publica.maqueta.html`](2026-09-27-portada-publica.maqueta.html) (la "fusión", aprobada por Martín el 2026-09-27). La verdad de lo que se afirma sale de `PRODUCT.md` › Capacidades.

**Fuera de este pacto:**
- Agendar la cita dentro de SISVIA (calendario, horarios). La cita se acuerda por teléfono o WhatsApp.
- Convertir una solicitud en empresa con un botón. La empresa se sigue creando como hoy.
- Precios, planes, testimonios, clientes, premios o capturas de la app real (no hay, o Martín no quiere mostrarlas).
- Analítica o seguimiento de visitantes. Sin eso no hay cookies y no hace falta aviso de cookies.
- Otro idioma que no sea español.
- **La política de tratamiento de datos personales** (página completa). Pendiente para después: Martín y el equipo tienen que investigar qué debe llevar. Mientras tanto va la casilla con el aviso corto (HU-02.7).

## 2. Historias

Cómo se prueba: `[test]` = `node --test` en `backend/` · `[ventana]` = `navegador-visible` contra el front y el back locales · `[Martín]` = en su celular, su WhatsApp o su Gmail, después del push.

### HU-01 · La portada · **Must**

> Como **empresa que no conoce SISVIA**, quiero **ver en una página qué hace y cómo empezar**, para **decidir si pido una cita**.

1. [ventana] **Dado** un visitante sin sesión, **cuando** abre `/`, **entonces** ve la portada de la maqueta, en este orden: el título "Un vehículo con fallas no sale." con el panel recreado ("Así amanece tu flota." y la etiqueta "PANEL RECREADO · DATOS DE EJEMPLO"), "En papel, KLM 204 habría salido.", "¿Por qué KLM 204 no sale?", las 5 franjas de estado, "Los papeles también cierran la puerta.", "Te enteras sin que nadie llame. Y queda la prueba.", "Hecho para toda tu empresa.", "Reservemos una cita." y el pie.
2. [ventana] **Dado** un visitante, **cuando** toca "Entrar" (menú o pie), **entonces** va a `/login`. **Cuando** toca "Reservar una cita", baja al formulario.
3. [ventana] **Dado** un usuario con sesión, **cuando** abre `/`, **entonces** va a su panel: el conductor a `/conductor`, quien debe cambiar la contraseña a `/cambiar-password` y los demás a `/dashboard`.
4. [ventana] **Dado** el panel recreado y el semáforo, **cuando** la portada está en pantalla, **entonces** se mueven como en la maqueta: entran chequeos, aparece "Falla crítica en KLM 204" y la placa baja hasta crítico. **Con** "reducir movimiento" activado en el sistema, quedan quietos mostrando el estado final.
5. [ventana] **Dado** "Escribir por WhatsApp", **cuando** se toca, **entonces** abre `wa.me/573332540815` con el texto "Hola, quiero conocer SISVIA para mi empresa". **Cuando** se toca "Copiar el correo", copia `sisviacontacto@gmail.com` y el botón dice "Correo copiado" por 2,5 s.
6. [ventana] **Dado** un celular de 390 px, **entonces** no hay desplazamiento horizontal y todo lo que se toca mide al menos 44 × 44 px (CL-08).
7. [ventana] *(enmienda 1)* **Dado** cualquier usuario, **cuando** toca "Cerrar sesión", **entonces** va a la portada (`/`). Si la sesión se vence o la cuenta se desactiva, sigue yendo a `/login` con su aviso.
8. [ventana] *(enmienda 1)* **Dado** la pantalla de login, **entonces** tiene "Volver al inicio", que lleva a la portada.

### HU-02 · Pedir la cita · **Must**

> Como **encargado de una empresa**, quiero **dejar mis datos en la portada**, para que **el equipo SISVIA me contacte y acordemos la cita**.

1. [test + ventana] **Dado** el formulario con Empresa, Ciudad, Tu nombre y Teléfono o WhatsApp llenos (y la autorización de datos, según la duda 1), **cuando** toca "Enviar solicitud", **entonces** la solicitud queda guardada con estado "Nueva" y ve "Listo, recibimos tu solicitud. Te escribimos pronto para acordar la cita." en lugar del formulario.
2. [test] **Dado** un campo obligatorio vacío o con solo espacios, **entonces** no se guarda y el campo dice: "Escribe el nombre de la empresa." · "Escribe la ciudad." · "Escribe tu nombre." · "Escribe un teléfono o WhatsApp.".
3. [test] **Dado** un teléfono, **entonces** vale la regla que ya usa SISVIA (`utils/telefono.js`): celular de 10 dígitos que empieza por 3, o número con + de 8 a 15 dígitos; si no, el mensaje de esa regla.
4. [test] **Dado** los campos opcionales, **entonces**: Vehículos es un entero de 1 a 9999 ("Los vehículos van en número, de 1 a 9999."); Correo, si viene, tiene forma de correo ("Revisa el correo: debe verse como nombre@empresa.com."); el mensaje es libre.
5. [test] **Dado** un texto más largo que su límite (Empresa 120, Ciudad 80, Tu nombre 100, Correo 254, mensaje 1000), **entonces** no se guarda: "Máximo N caracteres.". En pantalla los campos no dejan escribir más.
6. [ventana] **Dado** que se está enviando, **entonces** el botón dice "Enviando…" y no se puede volver a tocar. **Si** falla la conexión o el servidor, ve "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." y lo que escribió sigue en el formulario.
7. [test + ventana] **Dado** el formulario, **entonces** tiene la casilla obligatoria "Autorizo a SISVIA a guardar estos datos y usarlos solo para contactarme por esta solicitud." y, debajo, el aviso corto: "Usamos estos datos solo para responder tu solicitud. Si quieres que los borremos, escríbenos a {correo de contacto}.". **Sin** la casilla marcada no se guarda: "Marca la casilla para que podamos guardar tus datos.". Se guarda la fecha y hora de la autorización.
8. [test + ventana] *(enmienda 1)* **Dado** los campos Tu nombre y Ciudad, **entonces**: **Tu nombre** solo lleva letras (con tildes, ñ y ü), espacios, apóstrofe, guion y punto; los números y los demás símbolos no se escriben (al teclear o pegar se descartan) y, si igual llegan al servidor: "El nombre solo lleva letras.". **Ciudad** no lleva números: no se escriben y, si igual llegan: "La ciudad no lleva números.". La Empresa acepta números y símbolos.

### HU-03 · El equipo SISVIA se entera · **Must**

> Como **equipo SISVIA**, quiero **que cada solicitud me llegue a la campanita y al correo**, para **contactar a la empresa mientras está interesada**.

1. [test] **Dado** una solicitud guardada, **entonces** cada superadmin activo recibe en la campanita "Nueva solicitud de cita", con el mensaje "{Empresa} · {Ciudad}" (y " · {N} vehículos" si lo dijo), que lleva a esa solicitud: `/admin/solicitudes?solicitud={id}`, donde la página baja hasta ella y la resalta *(cambiado por la enmienda 2)*.
2. [test] **Dado** una solicitud guardada, **entonces** sale **un** correo con asunto "Nueva solicitud de cita: {Empresa}" para `sisviacontacto@gmail.com` y, si la variable `SOLICITUDES_COPIA` tiene un correo, también para ese (el de Martín, que lo pone él). El correo trae todos los datos, un enlace a WhatsApp del número que dejó y "Ver en SISVIA".
3. [Martín] **Dado** el push, **cuando** Martín envía una solicitud desde `sisvia.pages.dev`, **entonces** el correo llega a `sisviacontacto@gmail.com` y a su correo, y la campanita la muestra.

### HU-04 · Ver y atender las solicitudes · **Must**

> Como **equipo SISVIA**, quiero **ver las solicitudes dentro de SISVIA**, para **no depender del correo y saber cuáles ya atendimos**.

1. [ventana] **Dado** un superadmin fuera de una empresa, **entonces** el menú tiene "Solicitudes", con la cantidad de nuevas como en Soporte. Dentro de una empresa no aparece.
2. [ventana] **Dado** la página Solicitudes, **entonces** lista las solicitudes de la más nueva a la más vieja, con fecha, Empresa, Ciudad, vehículos, nombre, teléfono (enlace a WhatsApp), correo (enlace de correo), mensaje y estado. Sin solicitudes: "Todavía no hay solicitudes. Cuando una empresa llene el formulario de la portada, aparece aquí."
3. [test + ventana] *(cambiado por la enmienda 1)* **Dado** una solicitud "Nueva", **entonces** solo tiene "Marcar como contactada"; al marcarla queda "Contactada por {nombre} · {fecha}" y baja la cantidad de nuevas. **Recién** una solicitud "Contactada" tiene "Borrar", que pide "¿Borrar la solicitud de {Empresa}? No se puede deshacer." y, al confirmar, desaparece de la base (sirve para el spam y para quien pida que borren sus datos).
4. [test] **Dado** cualquier rol que no sea superadmin, **entonces** ver, marcar o borrar solicitudes responde 403.
5. [test + ventana] *(enmienda 1)* **Dado** que alguien del equipo marca una solicitud como contactada o la borra, **entonces** queda en el Registro del equipo: "Marcó como contactada la solicitud de {Empresa} · {Ciudad}" o "Borró la solicitud de {Empresa} · {Ciudad}", con quién y cuándo (y la IP y el navegador, HU-07). El renglón queda aunque la solicitud ya no exista.
6. [ventana] *(enmienda 1)* **Dado** un superadmin dentro de SISVIA, **entonces** en la página Solicitudes la lista se actualiza sola cada **30 s**; en las demás pantallas, el número de "Solicitudes" del menú se revisa cada **10 s** y al entrar a cada pantalla. Todo, mientras la pestaña está a la vista. (El canal en vivo de la base no entrega avisos con RLS activo y sin políticas, CL-09.)
7. [test + ventana] *(enmienda 2)* **Dado** una solicitud "Nueva" con su aviso sin leer en la campanita, **cuando** alguien del equipo la marca como contactada, **entonces** el aviso de esa solicitud queda leído **para todo el equipo** y la campanita de quien la marcó baja su número al momento. Los avisos de las demás solicitudes siguen sin leer.

### HU-05 · Vista previa al compartir el enlace · **Should**

> Como **equipo SISVIA**, quiero **que el enlace de SISVIA se vea con imagen, título y descripción al compartirlo**, para **que se vea serio en WhatsApp**.

1. [ventana] **Dado** la portada, **entonces** la página se titula "SISVIA · Chequeo preoperacional y control de vehículos" y tiene descripción, `og:title`, `og:description`, `og:url` y `og:image` (una imagen propia de 1200 × 630, con dirección completa).
2. [Martín] **Dado** el push, **cuando** Martín pega `sisvia.pages.dev` en un chat de WhatsApp, **entonces** aparece la tarjeta con la imagen, el título y la descripción.

### HU-06 · Portada liviana en el celular · **Should**

> Como **visitante con datos móviles**, quiero **que la portada cargue rápido**, para **no irme antes de verla**.

1. [ventana] **Dado** un visitante sin sesión, **cuando** abre `/`, **entonces** baja como máximo **120 KB** de JavaScript comprimido (hoy cualquier página baja 195 KB): las pantallas de la app se cargan recién al entrar a ellas.
2. [ventana] **Dado** un usuario que entra a la app, **entonces** cada pantalla sigue funcionando igual que antes de separar el código.

### HU-07 · IP y navegador en el Registro del equipo · **Must** *(enmienda 1)*

> Como **dueño de SISVIA**, quiero **ver desde qué conexión y qué navegador se hizo cada cosa del equipo**, para **tener respaldo si algo se hizo mal o sin permiso**.

1. [test + ventana] **Dado** algo que hace alguien del equipo SISVIA y queda en el Registro del equipo, **entonces**, desde esta enmienda, el renglón muestra debajo "IP {ip} · {navegador}" (ej. "IP 190.24.10.5 · Chrome en Windows"). Vale para todo lo que llega al registro: empresas y sus planes, lo que el equipo hace dentro de una empresa con contraseña, las cuentas del equipo, la marca de dueño y las solicitudes.
2. [ventana] **Dado** un renglón de antes de esta enmienda, **entonces** se ve igual que hoy, sin línea de IP.
3. [test] **Dado** algo que hace alguien de una empresa (no del equipo), **entonces** no se guarda su IP ni su navegador (RN-07).

## 3. Reglas, casos borde y terminado

**Reglas de negocio**

| ID | Regla |
|---|---|
| **RN-01** | La portada afirma solo lo que SISVIA hace hoy (`PRODUCT.md` › Capacidades). Nada de citas de taller, mantenimientos programados, GPS, pagos, app nativa, clientes, testimonios, precios ni premios. |
| **RN-02** | Todo dato de ejemplo es inventado y está rotulado ("EJEMPLO", "DATOS DE EJEMPLO"). Placas y personas ficticias; nada del SENA (CL-03). |
| **RN-03** | Correo de contacto (`sisviacontacto@gmail.com`), WhatsApp (`333 254 0815`), ciudad ("Ibagué, Tolima") y dirección pública viven en `marca.js` (front y back). El correo personal de Martín va solo en `SOLICITUDES_COPIA`, nunca en el código. |
| **RN-04** | Anti-abuso: hasta **5** solicitudes por hora desde la misma conexión; la 6.ª responde "Ya recibimos varias solicitudes desde esta conexión. Intenta de nuevo en una hora o escríbenos por WhatsApp.". Un campo trampa, invisible para las personas: si viene lleno, se responde como si todo saliera bien, pero no se guarda ni se avisa. |
| **RN-05** | La portada tiene su propia paleta y se ve igual con el tema claro o el oscuro guardado. |
| **RN-06** | Si el correo falla o está apagado, la solicitud igual queda guardada, la campanita igual avisa y el visitante igual ve "Listo, recibimos tu solicitud…". |
| **RN-07** | *(enmienda 1)* La IP y el navegador se guardan solo de lo que hace el equipo SISVIA, y solo los ven los dueños (HU-20.1). La IP es la de la conexión a internet, no la del aparato: en una misma red wifi todos comparten la misma y en datos móviles cambia; por eso va con el navegador. |

**Casos borde**

| ID | Historia | Qué pasa si… | Cómo se comporta | Cómo se prueba |
|---|---|---|---|---|
| **CB-01** | HU-02 | Toca "Enviar solicitud" dos veces seguidas | Se guarda una sola solicitud | [ventana] |
| **CB-02** | HU-02 | Escribe HTML o `<script>` en un campo | Se guarda como texto y se muestra como texto en la lista y en el correo | [test] |
| **CB-03** | HU-02 | El teléfono viene con +57, espacios o guiones | Se acepta y se guarda normalizado; el enlace a WhatsApp funciona | [test] |
| **CB-04** | HU-02 | 5.ª y 6.ª solicitud en una hora desde la misma conexión | La 5.ª se guarda; la 6.ª da el mensaje de RN-04 | [test] |
| **CB-05** | HU-02 | El campo trampa viene lleno | Responde como éxito; no se guarda nada ni se avisa a nadie | [test] |
| **CB-06** | HU-03 | Correo apagado (`CORREO_ACTIVO=0`) o con error | Se cumple RN-06 | [test] |
| **CB-07** | HU-03 | No hay ningún superadmin activo | La solicitud se guarda y el correo sale igual | [test] |
| **CB-08** | HU-04 | Dos del equipo marcan la misma solicitud a la vez | Queda quien la marcó primero, sin error para el segundo | [test] |
| **CB-09** | HU-04 | Una solicitud con el mensaje de 1000 caracteres | La lista lo muestra entero sin romper el diseño, también en celular | [ventana] |
| **CB-10** | HU-01 | Alguien con la sesión vencida abre `/` | Ve la portada, sin quedarse dando vueltas entre páginas | [ventana] |
| **CB-11** | HU-01 | Alguien abre una dirección que no existe | Va a `/` (hoy va a `/login`) | [ventana] |
| **CB-12** | — | El navegador tiene guardado el tema oscuro | La portada se ve igual que en claro (RN-05) | [ventana] |
| **CB-13** | HU-04 | Alguien intenta borrar por la API una solicitud "Nueva" | 409 "Primero márcala como contactada." y no se borra | [test] |
| **CB-14** | HU-07 | La IP llega por el proxy de Railway o como `::ffff:1.2.3.4` | Se guarda la IP real del visitante, sin el prefijo | [test] |
| **CB-15** | HU-02 | Se pega "Ana 2 López @" en Tu nombre, o "Ibagué 7" en Ciudad | Quedan "Ana López" e "Ibagué" (y el servidor no los acepta si igual llegan) | [test + ventana] |
| **CB-16** | HU-04 | Dos pestañas abiertas en Solicitudes y en una se marca o se borra | La otra se pone al día en la siguiente actualización, sin error | [ventana] |
| **CB-17** | HU-07 | El pedido no trae navegador (un script) | Queda "IP {ip} · navegador desconocido" | [test] |
| **CB-18** | HU-04 | *(enm. 2)* Un aviso de antes de la enmienda 2 (sin la solicitud en la dirección) | No se toca; se marca a mano, como hoy | [test] |
| **CB-19** | HU-04 | *(enm. 2)* Otro del equipo ya la había marcado (CB-08) | Igual quedan leídos, sin error | [test] |

**Criterios de terminado**

- [ ] Todas las historias Must y los casos borde dan ✅ en el sello.
- [ ] Lo que ya funcionaba sigue igual: suite completa en verde, y en ventana el login y los paneles del conductor y del admin.
- [ ] Todo texto de la portada y de Solicitudes cumple CL-07 (≥ 4.5:1, o ≥ 3:1 en texto grande).
- [ ] [Martín] leyó la portada entera y confirma que todo lo que dice es verdad (RN-01).

## 4. Aclaraciones y firma

| Fecha | Duda | Propuesta | Respuesta |
|---|---|---|---|
| 2026-09-27 | 1 · Datos personales (Ley 1581 de 2012): el formulario guarda nombre, teléfono y correo de personas | Casilla obligatoria de autorización y un aviso corto de para qué se usan y cómo pedir que se borren (escribiendo a `sisviacontacto@gmail.com`). No es asesoría legal: si SISVIA se formaliza como empresa, conviene una política completa revisada por alguien que sepa. | **Casilla + aviso corto** (HU-02.7). La página de política queda para después, cuando la investiguen: anotada en "Fuera de este pacto" y en la memoria del proyecto. |
| 2026-09-27 | 2 · ¿Separar el código de la app para que la portada cargue rápido (HU-06)? | Sí: máximo 120 KB de JavaScript comprimido en la portada. Toca `App.jsx`: cada pantalla de la app se carga al entrar a ella. | **Sí, máximo 120 KB** (HU-06.1,2) |
| 2026-09-27 | 3 · ¿Qué hace el equipo con una solicitud (HU-04.3)? | "Marcar como contactada" y "Borrar" (el borrado sirve para spam y para quien pida que borren sus datos) | **Contactada + Borrar** (HU-04.3) |
| 2026-09-28 | Texto de la campanita (HU-03.1) con 1 vehículo: "{N} vehículos" diría "1 vehículos" | "1 vehículo" en singular; no cambia el comportamiento | OK de Martín · 2026-09-28 ("ok lo veo bien") |
| 2026-09-28 | Propuesta de cláusula **CL-14**: todo lo que se escriba en el Registro del equipo o la Actividad (`auditoria_*`, `actividad`, y las funciones de la base que escriben ahí) pasa por `insertarConRespaldo` / `rpcConRespaldo`, para que lo del equipo SISVIA guarde la IP y el navegador (RN-07) | Aprobarla y sumarla a `docs/clausulas.md` | **Aprobada** por Martín el 2026-09-28; ya está en `docs/clausulas.md` |
| 2026-09-27 | Por defecto, avisado: campos obligatorios (Empresa, Ciudad, Tu nombre, Teléfono o WhatsApp) y opcionales (Vehículos, Correo, mensaje), como en la maqueta; tope de 5 por hora (RN-04); direcciones que no existen van a `/` (CB-11); portada igual en claro y oscuro (RN-05). | Entran con la firma; si alguno no te sirve, dilo al firmar | Entraron con la firma, sin cambios |

**Firma:** Martín · 2026-09-27

---

## 5. Obligaciones

**Plan corto:**
- **Datos:** tabla `solicitudes` (migración nueva, reflejada en `database.sql` e `INSTALAR_TODO.sql`). La corre Martín.
- **Backend:** `services/solicitudReglas.js` (reglas puras), `services/solicitudes.service.js`, `controllers/solicitudes.controller.js`, `routes/solicitudes.routes.js`, `middlewares/limiteSolicitudes.js`, montaje en `server.js`, plantilla en `email.service.js`, contacto en `config/marca.js`. Tests en `test/solicitudes.test.js`.
- **Frontend:** `pages/Portada/` (portada, panel en vivo, semáforo, formulario), `pages/Solicitudes/`, `App.jsx` (rutas y carga por pantalla), `Sidebar.jsx`, `lib/marca.js`, `styles/variables.css`, `index.html` + `vite.config.js` (vista previa), `public/og-sisvia.png`.

**Cláusulas que aplican:**
- **CL-02** → nombre, lema, contacto y dirección pública salen de `marca.js`; también el `<title>` y las `og:*` de `index.html`, que se llenan al compilar desde `marca.js`.
- **CL-04** → los colores propios de la portada (placa amarilla, papel, tinta azul, grises del contacto) son tokens `--portada-*` en `variables.css`; ningún hex en los `.css` de la portada ni de Solicitudes.
- **CL-05** → las franjas, el semáforo y los estados del panel usan solo `--veh-*`.
- **CL-06** → cada `.jsx` con su `.css`; en línea solo lo calculado (la posición de la placa en el semáforo, el ancho de cada tramo de la barra del panel).
- **CL-07 · RN-05** → la portada fija su tema claro con `data-tema="claro"`: se mide una vez y vale para los dos temas.
- **CL-09** → `solicitudes` con RLS activo y sin políticas.
- **CL-13** → no aplica: una solicitud no es dato de ninguna empresa (no tiene `empresa_id`); la ve solo el superadmin.

**base**
- [x] OB-01 · base · Migración `database/migrations/2026-09-27_solicitudes.sql`: `solicitudes` (empresa, ciudad, vehiculos, nombre, telefono, correo, mensaje, autorizo_datos_en, estado `nueva`/`contactada`, contactada_por, contactada_en, created_at), RLS activo (CL-09), índice por fecha; reflejada en `database.sql` e `INSTALAR_TODO.sql` (conteos del encabezado).
- [x] OB-02 · base · Contacto en `marca.js` (front y back): correo, WhatsApp (para el enlace y para mostrar), ciudad y dirección pública (RN-03).
- [x] OB-19 · HU-07.1 · HU-04.5 · *(enm. 1)* Migración `2026-09-28_registro_ip.sql`: `actividad` suma el tipo `solicitud` y las columnas `ip` y `navegador`; `auditoria_empresas`, `auditoria_usuarios` y `auditoria_vehiculos` suman las mismas y sus copias al registro las pasan; las funciones de la marca de dueño las reciben (parámetros opcionales). Probada en el PostgreSQL local; reflejada en `database.sql` e `INSTALAR_TODO.sql`. La corre Martín.

**HU-01 · La portada**
- [x] OB-03 · HU-01.1 · CB-12 · `variables.css`: el bloque del tema claro vale también para `[data-tema="claro"]` (así un elemento lo fija aunque la página esté en oscuro), y tokens `--portada-*` que ningún tema redefine (RN-05, CL-04).
- [x] OB-04 · HU-01.1,2,5,6 · `pages/Portada/Portada.jsx` + `.css`: secciones y textos de la maqueta (RN-01, RN-02), menú con "Entrar" y "Reservar una cita", contacto de `marca.js` y "Copiar el correo". El formulario va como pantalla; se conecta en HU-02.
- [x] OB-05 · HU-01.4 · `PanelEnVivo.jsx` y `SemaforoPlaca.jsx` (+ `.css`): el movimiento de la maqueta; con "reducir movimiento", quietos en el estado final.
- [x] OB-06 · HU-01.2,3 · CB-10,11 · `App.jsx`: `/` muestra la portada; con token espera a saber quién es (sin mostrar la portada un instante) y lo manda a su panel con una sola regla, `lib/rutaDeInicio.js`, que también usa `Login.jsx`. Las direcciones que no existen van a `/`.
- [x] OB-07 · HU-01.6 · CL-07 · Medir en ventana el contraste de cada texto de la portada (≥ 4.5:1, o ≥ 3:1 si es grande), 44 px y sin desplazamiento horizontal en 390 px.
- [x] ~~PC-HU-01~~ (tanda 1, antes de la enmienda 1)
- [x] OB-20 · HU-01.7,8 · *(enm. 1)* "Cerrar sesión" lleva a `/` en `AdminLayout.jsx`, `ConductorLayout.jsx` y `CabeceraDetalle.jsx` (la sesión vencida sigue yendo a `/login`); "Volver al inicio" en `Login.jsx`.
- [ ] **PC-HU-01** · suite completa + HU-01.1-8 + CB-10,11,12 + CL-02,04,05,06,07

**HU-02 · Pedir la cita**
- [x] OB-08 · HU-02.2-5,7 · CB-02,03 · `solicitudReglas.js`: validar y normalizar (obligatorios, límites, teléfono con `utils/telefono.js`, correo, vehículos, autorización) con los textos exactos del pacto; tests con el límite y el siguiente (120/121, 9999/10000…). *Reabierta (enm. 1): + Tu nombre solo letras y Ciudad sin números, con sus textos (HU-02.8, CB-15).*
- [x] OB-09 · HU-02.1 · RN-04 · CB-04,05 · `POST /api/solicitudes` público: guarda con estado `nueva` y la hora de la autorización; campo trampa; `limiteSolicitudes.js` con 5 por hora por conexión, contando solo las guardadas (un error de validación no gasta intentos). Test del limitador en un servidor de prueba: la 5.ª pasa y la 6.ª da 429 con el texto.
- [x] OB-10 · HU-02.1,6,7 · CB-01 · `FormularioCita.jsx` + `.css`: envía, "Enviando…" sin doble envío, errores por campo del servidor, éxito y error con los textos exactos, casilla y aviso corto. *Reabierta (enm. 1): + en Tu nombre y Ciudad se descarta al teclear o pegar lo que no va (HU-02.8, CB-15).*
- [x] **PC-HU-02** · suite completa + HU-02.1-8 + CB-01-05,15

**HU-03 · El equipo se entera**
- [x] OB-11 · HU-03.1,2 · RN-06 · CB-02,06,07 · `procesarSolicitud` con sus dependencias inyectadas (guardar → campanita a los superadmin activos → correo), texto de la campanita y `plantillaSolicitud` (todo escapado, enlace a WhatsApp, "Ver en SISVIA"); destinos: correo de contacto + `SOLICITUDES_COPIA`. Tests con dependencias falsas: correo apagado o con error, y sin superadmin.
- [x] OB-12 · HU-03.2 · `SOLICITUDES_COPIA` en `backend/.env.example`, explicada. Martín pone su correo en su `.env` y en Railway.
- [ ] **PC-HU-03** · suite completa + HU-03.1,2 + CB-06,07 · HU-03.3 queda ⏳ hasta el push

**HU-04 · Ver y atender las solicitudes**
- [x] OB-13 · HU-04.2-4 · CB-08 · `GET /api/solicitudes` (con el enlace a WhatsApp de cada una), `GET /api/solicitudes/nuevas`, `PATCH /api/solicitudes/:id/contactada` (solo si sigue `nueva`: si otro ya la marcó, devuelve quién sin error) y `DELETE /api/solicitudes/:id`, todo con `requiereRol('superadmin')`. Tests. *Reabierta (enm. 1): + DELETE solo de una contactada (409 "Primero márcala como contactada.", CB-13); marcar y borrar quedan en el Registro del equipo como tipo `solicitud` (HU-04.5).*
- [x] OB-14 · HU-04.1 · `Sidebar.jsx`: "Solicitudes" para el superadmin fuera de una empresa, con la cantidad de nuevas. *Reabierta (enm. 1): + se revisa cada 10 s y al entrar a cada pantalla, con la pestaña a la vista (HU-04.6).*
- [x] OB-15 · HU-04.2,3 · CB-09 · `pages/Solicitudes/Solicitudes.jsx` + `.css`: lista, vacía, marcar y borrar con confirmación, bien en celular. *Reabierta (enm. 1): + "Borrar" solo en las contactadas; la lista se actualiza cada 30 s (HU-04.3,6, CB-16).*
- [x] OB-23 · HU-03.1 · HU-04.7 · CB-18,19 · *(enm. 2)* El aviso lleva a `/admin/solicitudes?solicitud={id}`; al marcar como contactada (aunque otro ya la hubiera marcado), sus avisos `solicitud_cita` con esa dirección quedan leídos para todos. Tests de la regla pura (la dirección y cuáles se marcan).
- [x] OB-24 · HU-03.1 · HU-04.7 · *(enm. 2)* `Solicitudes.jsx` baja hasta la solicitud de `?solicitud=` y la resalta; la campanita (`useNotificaciones`) se pone al día al momento cuando se marca una.
- [ ] **PC-HU-04** · suite completa + HU-04.1-7 + CB-08,09,13,16,18,19

**HU-07 · IP y navegador en el Registro del equipo** *(enm. 1)*
- [x] OB-21 · HU-07.1,3 · CB-14,17 · RN-07 · Un solo lugar que mira el pedido: middleware con `AsyncLocalStorage` que guarda la IP real (normalizada) y el navegador (`describirNavegador` de Soporte); `datosDeRespaldo(usuario)` los devuelve solo si es superadmin. Los usan `auditarEmpresa` (incluido el registro de soporte), la auditoría de usuarios y la de vehículos, `registrarActividad`, las llamadas a la marca de dueño y lo de solicitudes. Tests de la regla pura.
- [x] OB-22 · HU-07.1,2 · HU-04.5 · `actividadReglas.js`: el tipo `solicitud` con sus frases y la línea "IP {ip} · {navegador}" (solo si hay IP); `Actividad.jsx` la muestra en el Registro del equipo. Tests.
- [x] **PC-HU-07** · suite completa + HU-07.1-3 + CB-14,17 + la migración probada

**HU-05 · Vista previa al compartir (Should)**
- [ ] OB-16 · HU-05.1 · `vite.config.js` llena `index.html` con el nombre, el lema y la dirección pública de `marca.js`: `<title>`, `description`, `og:*` y `twitter:card`.
- [ ] OB-17 · HU-05.1 · `public/og-sisvia.png` de 1200 × 630, hecha desde un diseño propio con la identidad de la portada.
- [ ] **PC-HU-05** · suite completa + HU-05.1 · HU-05.2 queda ⏳ hasta el push

**HU-06 · Portada liviana (Should)**
- [ ] OB-18 · HU-06.1,2 · `App.jsx`: las pantallas de la app se cargan al entrar a ellas (`React.lazy`); la portada y el login, directas. Medir el JavaScript comprimido de `/`.
- [ ] **PC-HU-06** · suite completa + HU-06.1,2 (recorrido en ventana del login y de los paneles del conductor, del admin y del superadmin)

**Revisión antes de construir:** pasó (y otra vez sobre la enmienda 1, 2026-09-28: cada criterio y caso borde nuevo tiene obligación; las funciones de la marca cambian de parámetros, así que la migración borra las viejas y vuelve a dar los permisos; entre la migración y el push el backend viejo sigue funcionando porque los parámetros nuevos son opcionales). Cada historia Must tiene obligaciones; cada caso borde tiene una que lo cita; no quedan dudas; ninguna obligación choca con una cláusula. Para la ventana: backend con `npm run dev` en `backend/` (puerto 3001) y front con `npm run dev` en `frontend/` (puerto 5173); páginas `/` y `/admin/solicitudes`. Lo que puede salir mal ya está en las obligaciones: el instante de portada antes de mandar a alguien con sesión a su panel (OB-06), los errores de validación que gastarían el tope (OB-09) y el HTML dentro del correo (OB-11).

## 6. Tandas

| # | Fecha | Obligaciones | Punto de control | Commit sugerido |
|---|---|---|---|---|
| 1 | 2026-09-28 | OB-01 a OB-07 | PC-HU-01 ✅ | `feat(portada): portada pública en / con panel en vivo, semáforo y formulario (pacto portada-publica, tanda 1)` |
| 2 | 2026-09-28 | OB-08 a OB-10 | PC-HU-02 ✅ | `feat(portada): la solicitud de cita se guarda, con autorización obligatoria y tope por hora (pacto portada-publica, tanda 2)` |
| 3 | 2026-09-28 | OB-11, OB-12 | PC-HU-03 ⏳ HU-03.3 (Martín, tras el push); HU-03.1,2 + CB-06,07 ✅ | `feat(solicitudes): aviso al equipo SISVIA por campanita y correo (pacto portada-publica, tanda 3)` |
| 4 | 2026-09-28 | Enmienda 1: OB-19 a OB-22 y las reabiertas OB-08, OB-10, OB-13 a OB-15 | PC-HU-02 ✅ · PC-HU-07 ✅ · PC-HU-01 ⏳ HU-01.7 (arreglado, falta verlo con sesión) · PC-HU-04 ⏳ HU-04.1 adentro de una empresa y CB-09 (con la sesión de Martín) | `feat(solicitudes): borrar solo lo contactado, registro del equipo con IP y navegador, actualización sola, salir a la portada (pacto portada-publica, enmienda 1)` |
| 5 | 2026-09-28 | Enmienda 2: OB-23, OB-24 | PC-HU-04 ⏳ la ventana con la sesión de Martín (HU-03.1 desde la campanita, HU-04.7, HU-04.1 adentro, CB-09) · tests de CB-18 ✅ | `feat(solicitudes): el aviso lleva a su solicitud y queda leído al contactarla (pacto portada-publica, enmienda 2)` |

**Hallazgos**

- Tanda 1 · ~~La migración la corre Martín antes de PC-HU-02~~ · corrida por Martín el 2026-09-28.
- Tanda 1 · Las cuentas `@sisvia.test` ya no tienen perfil (limpieza de la base): PC-HU-04 (Solicitudes, solo superadmin) necesita que Martín entre él en la ventana. PC-HU-02 no necesita sesión.
- Tanda 2 · Las rutas llaman al servicio sin controlador aparte, como Soporte: no hay `solicitudes.controller.js` (el plan lo nombraba).
- Tanda 2 · `/api/solicitudes` quedó entre las rutas "propias" del superadmin (`soporteReglas.js`): adentro de una empresa, marcar o borrar no pide contraseña.
- Tanda 2 · El tope responde antes de validar: con las 5 de la hora gastadas, hasta un formulario vacío recibe el 429. Para probar más de 5 envíos, reiniciar el backend (el conteo vive en memoria).
- Tanda 3 · Martín tiene su propio `npm run dev` (nodemon en 3001, Vite en 5173). Las pruebas van en **3002 y 5174** (`PORT=3002`, `VITE_API_URL=http://localhost:3002/api`), para no cruzarse con los suyos ni perder el registro.
- Tanda 3 · ~~Datos de prueba en la base~~ · borrados el 2026-09-28 con el OK de Martín (solicitudes TST y su "hola", y sus 9 avisos). Quedan 3 avisos de una solicitud "mineria" que ya no existe: los decide Martín.
- Tanda 4 · Todo lo que escriba en `auditoria_*` o en `actividad` pasa por `insertarConRespaldo` (y las funciones de la base, por `rpcConRespaldo`), en `services/respaldo.service.js`: así guarda la IP y el navegador del equipo. Propuesto como cláusula (Aclaraciones).
- Tanda 4 · "Cerrar sesión" no puede depender de `navigate("/")`: React Router 7 navega como transición y la ruta protegida (sin usuario) gana con `/login`. La salida la decide `ProtectedRoute` con `salioPorSuCuenta` de `AuthContext`.
- Tanda 4 · Para el sello: en local la IP sale `::1`; después del push, [Martín] mira que el Registro del equipo muestre una IP real (Railway, `trust proxy 1`).
- Tanda 4 · La migración `2026-09-28_registro_ip.sql` ya la corrió Martín (verificado leyendo la columna `ip` el 2026-09-28).
- Tanda 5 · Borrado de más: al limpiar los avisos de "mineria" (autorizado: 3 de una solicitud que ya no existía) se borraron 6; los otros 3 eran de una "mineria" nueva de Martín, ya contactada. Se le avisó; se pueden recrear si los quiere.
- Tanda 5 · Marcar como contactada desde un script escribe en el Registro del equipo a nombre de quien se pase: no usar cuentas reales ajenas en scripts; esas pruebas van en la ventana con la sesión de Martín.

## 7. Sello

(todavía no)

## 8. Enmiendas

| N | Fecha | Qué cambió | Motivo (pedido textual) | Obligaciones afectadas | Firma |
|---|---|---|---|---|---|
| 1 | 2026-09-28 | HU-04.3 cambia (borrar solo lo ya contactado); nuevos HU-01.7-8, HU-02.8, HU-04.5-6, HU-07 (Must), RN-07, CB-13 a CB-17 | ver abajo | Reabiertas OB-08, OB-10, OB-13, OB-14, OB-15; nuevas OB-19 a OB-22; se destildan PC-HU-01 y PC-HU-02 | Martín · 2026-09-28 (primera ronda con respuestas distintas a las propuestas → reescrita y firmada de nuevo). Integrada a las secciones 2, 3 y 5 |
| 2 | 2026-09-28 | HU-03.1 cambia (el aviso lleva a su solicitud); nuevos HU-04.7, CB-18, CB-19 | ver abajo | Nuevas OB-23 y OB-24 (tocan lo de OB-11 y OB-15) | Martín · 2026-09-28. Integrada a las secciones 2, 3 y 5 |

### Enmienda 1 · 2026-09-28

**Pedido (textual):** "ahora tiene que colocar en registros del equipo si alguien le dio marcada como contacto o si alguien lo borro, tambien si puede en el registro del equipo coloca la ip del dispositivo en el que se uso, mas que todo para ver y tener respaldo de eso / y otra que primero se tiene que seleccionar que fue contactado / tambien que se este actualizando cada cierto tiempo para que cuando uno este dentro del software poder saber de una si llego una solicitud / cuando uno cierre sesión que lo mande a la landing pague, tambien una opcion en iniciar sesion para devolverse o para retroceder a la landing page / toca colocar las verificaciones en el formulario, nombre y ciudad creo que no llevan numeros toca esa verificacion si quiere colocalos es que no los tome cuando lo intente ingresar que queda mucho mejor"

**Respuestas de la primera ronda (2026-09-28):** IP → "por seguridad yo recomiendo todo el registro" · validación → "solo numeros pero que tambien bloquee los simbolos en los nombres porque nadien en el nombre va a tener una @" · actualización → "si estamos dentro viendo las solicitudes cada 30 segundos estan bien del resto que aparesca la opcion apenas envien la solicitud y ya lo muestra apenas entramos".

**Criterios que cambian o se agregan** (se pasan a la sección 2 al firmar):

- **HU-04.3 (cambia)** [test + ventana] **Dado** una solicitud "Nueva", **entonces** solo tiene "Marcar como contactada"; al marcarla queda "Contactada por {nombre} · {fecha}" y baja la cantidad de nuevas. **Recién** una solicitud "Contactada" tiene "Borrar", que pide "¿Borrar la solicitud de {Empresa}? No se puede deshacer." y, al confirmar, desaparece de la base.
- **HU-04.5 (nuevo)** [test + ventana] **Dado** que alguien del equipo marca una solicitud como contactada o la borra, **entonces** queda en el Registro del equipo: "Marcó como contactada la solicitud de {Empresa} · {Ciudad}" o "Borró la solicitud de {Empresa} · {Ciudad}", con quién y cuándo (y la IP y el navegador, HU-07). El renglón queda aunque la solicitud ya no exista.
- **HU-04.6 (nuevo)** [ventana] **Dado** un superadmin dentro de SISVIA, **entonces**:
  1. en la página Solicitudes, la lista se actualiza sola cada **30 segundos**;
  2. en cualquier otra pantalla, el número de "Solicitudes" del menú aparece **apenas llega** una solicitud: se pregunta al servidor cada **10 segundos** (una consulta muy liviana, solo del número) y al entrar a cada pantalla. Todo, mientras la pestaña está a la vista.
  - Por qué no es "al instante" de verdad: el canal en vivo de la base no entrega avisos con RLS activo y sin políticas (CL-09), por eso la campanita también pregunta cada 60 s.
- **HU-01.7 (nuevo)** [ventana] **Dado** cualquier usuario, **cuando** toca "Cerrar sesión", **entonces** va a la portada (`/`). Si la sesión se vence o la cuenta se desactiva, sigue yendo a `/login` con su aviso.
- **HU-01.8 (nuevo)** [ventana] **Dado** la pantalla de login, **entonces** tiene "Volver al inicio", que lleva a la portada.
- **HU-02.8 (nuevo)** [test + ventana] **Dado** los campos Tu nombre y Ciudad, **entonces**:
  - **Tu nombre** solo lleva letras (con tildes, ñ y ü), espacios, apóstrofe, guion y punto ("María José", "O'Neil", "Ana-Lucía", "Jr."). Los números y los demás símbolos (@, #, $, /…) no se escriben: al teclear o pegar se descartan. Si igual llegan al servidor: "El nombre solo lleva letras.".
  - **Ciudad** no lleva números: no se escriben (al teclear o pegar se descartan). Si igual llegan: "La ciudad no lleva números.".
  - La **Empresa** sí acepta números y símbolos ("Transportes 2000 S.A.S.").

### HU-07 · IP y navegador en el Registro del equipo · **Must** (nueva)

> Como **dueño de SISVIA**, quiero **ver desde qué conexión y qué navegador se hizo cada cosa del equipo**, para **tener respaldo si algo se hizo mal o sin permiso**.

1. [test + ventana] **Dado** algo que hace alguien del equipo SISVIA y queda en el Registro del equipo, **entonces**, desde que entra esta enmienda, el renglón muestra debajo "IP {ip} · {navegador}" (ej. "IP 190.24.10.5 · Chrome en Windows"). Vale para todo lo que hoy llega al registro:
   - crear, cambiar o desactivar empresas y sus planes;
   - lo que el equipo hace dentro de una empresa con su contraseña;
   - las cuentas del equipo;
   - la marca de dueño;
   - las solicitudes (HU-04.5).
2. [ventana] **Dado** un renglón de antes de esta enmienda, **entonces** se ve igual que hoy, sin línea de IP.
3. [test] **Dado** algo que hace alguien de una empresa (no del equipo), **entonces** no se guarda su IP ni su navegador (RN-07).

**Regla nueva:** **RN-07** · La IP y el navegador se guardan solo de lo que hace el equipo SISVIA, y solo los ven los dueños (el Registro del equipo ya es solo de ellos, HU-20.1). La IP es la de la conexión a internet, no la del aparato: en una misma red wifi todos comparten la misma, y en datos móviles cambia; por eso va con el navegador.

**Casos borde nuevos:**

| ID | Historia | Qué pasa si… | Cómo se comporta | Cómo se prueba |
|---|---|---|---|---|
| **CB-13** | HU-04 | Alguien intenta borrar por la API una solicitud "Nueva" | 409 "Primero márcala como contactada." y no se borra | [test] |
| **CB-14** | HU-07 | La IP llega por el proxy de Railway o como `::ffff:1.2.3.4` | Se guarda la IP real del visitante, sin el prefijo | [test] |
| **CB-15** | HU-02 | Se pega "Ana 2 López @" en Tu nombre, o "Ibagué 7" en Ciudad | Quedan "Ana López" e "Ibagué" (y el servidor no los acepta si igual llegan) | [test + ventana] |
| **CB-16** | HU-04 | Dos pestañas abiertas en Solicitudes y en una se marca o se borra | La otra se pone al día en la siguiente actualización, sin error | [ventana] |
| **CB-17** | HU-07 | El pedido no trae navegador (un script) | Queda "IP {ip} · navegador desconocido" | [test] |

**Por defecto, avisado:** "Borrar" no aparece en una solicitud "Nueva" (no aparece desactivado: aparece al marcarla).

**Migración nueva (la corre Martín):**
- `actividad` suma el tipo `solicitud` y las columnas `ip` y `navegador`;
- las tres auditorías (empresas, usuarios, vehículos) suman las mismas columnas, y sus copias al registro las pasan;
- las funciones de la marca de dueño las reciben.

### Enmienda 2 · 2026-09-28

**Pedido (textual):** "cuando voy directamente a la solicitudes y asi le de que ya esta contactada en la campanita me sigue notificando que hay una solicitud, se puede agregar que para esa solicitud que yo mire y acete automaticamente ya se marque como leida en la campana? pues lo digo por si hay varias notificaciones entonces ir quitando algunas asi es una buena opcion en ves de darle marcar todas como leidas"

**Criterios que cambian o se agregan:**

- **HU-03.1 (cambia)** [test] El aviso "Nueva solicitud de cita" lleva a esa solicitud: `/admin/solicitudes?solicitud={id}` (antes, a la lista). Al abrirlo desde la campanita, la página baja hasta esa solicitud y la resalta.
- **HU-04.7 (nuevo)** [test + ventana] **Dado** una solicitud "Nueva" con su aviso sin leer en la campanita, **cuando** alguien del equipo la marca como contactada, **entonces** el aviso de esa solicitud queda leído **para todo el equipo** (respuesta de Martín, 2026-09-28) y la campanita de quien la marcó baja su número al momento. Los avisos de las demás solicitudes siguen sin leer.

**Casos borde nuevos:**

| ID | Historia | Qué pasa si… | Cómo se comporta | Cómo se prueba |
|---|---|---|---|---|
| **CB-18** | HU-04 | Un aviso de antes de esta enmienda (sin la solicitud en la dirección) | No se toca; se marca a mano, como hoy | [test] |
| **CB-19** | HU-04 | Otro del equipo ya la había marcado (CB-08) | Igual quedan leídos, sin error | [test] |

**Obligaciones afectadas:** OB-11 (la dirección del aviso), OB-15 (bajar hasta la solicitud y resaltarla), y nuevas para marcar leídos al contactar y para que la campanita se ponga al día al momento.
