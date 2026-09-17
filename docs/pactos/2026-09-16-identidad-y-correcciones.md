---
pacto: identidad-y-correcciones
nivel: 1          # 1 = ficha · 2 = SRS
estado: en tandas # borrador → firmado (al firmar) → en tandas (1.ª tanda) → sellado (al sellar)
creado: 2026-09-16
---

# Pacto · Identidad propia y correcciones de SISVIA

> **Dónde quedamos**
> 2026-09-16 · Última hecha: **tanda 2 cerrada** (OB-08, OB-09, OB-10, OB-26 y OB-27 nueva: naranja vivo con letra negra, paleta A, IBM Plex, logo nuevo y estados con sus propios colores); enmienda 1 firmada; tanda 1 y PC-HU-03 ✅ · Sigue: tanda 3 = OB-11, OB-14, OB-24, OB-25; tanda 4 = OB-12, OB-13, OB-15 y PC-HU-01 · Bloqueos: ninguno. Datos de prueba (`prueba.*@sisvia.test`, `TST-*`) siguen en la base mientras Martín recorre la ventana; se borran al terminar. Antes de OB-16 (HU-02) se responde la `[DUDA]` de HU-02.1. El pedido "para empresas" quedó separado: pacto propio después de este.

## 1. Qué y por qué

**Pedido (textual):** "bueno ahora si empezamos a corregir el proyecto y a empezar a personalizarlo a nuestro estado"

**Problema:** SISVIA quedó desplegado con la paleta azul provisional que le puse al separarlo del SENA: no tiene identidad propia. Además tiene dos fallas detectadas: un vehículo marcado como crítico o no operativo puede arrancar el chequeo igual, y el panel muestra los vehículos bloqueados en dos listas a la vez.

**Para quién:** coordinadores y administradores (panel, en escritorio) y conductores (celular, al aire libre).

**Fuera de este pacto:**
- Los 40 problemas de lint heredados de flota-sena. Van en un pacto aparte: mezclar el arreglo de los hooks con el rediseño no deja ver qué rompió qué.
- Mostrar deshabilitados en la lista del conductor los vehículos bloqueados. Hoy tampoco se hace con los de documentos vencidos: se rechazan al iniciar.
- Registrar en "Intentos bloqueados" los rechazos por estado. Necesita cambiar la base, y hoy tampoco se registran los rechazos por documento vencido.
- El tema Nieve y cualquier tema más allá de claro y oscuro.
- **SISVIA para empresas** (una sola app para muchas empresas, cada una con sus datos): va en su propio pacto, **después** de este, para que nazca con la identidad nueva. Ahí entran también el alta de empresas y el onboarding.
- Datos de demostración, correo de avisos y renombrar el producto.

## 2. Historias

### HU-01 · Identidad visual propia en tema claro · **Must**

> Como **coordinador o conductor**, quiero **que SISVIA tenga una identidad visual propia en todas sus pantallas** para **que se vea como un producto terminado y no como una copia provisional**.

**Criterios de aceptación**

1. [ventana] **Dado** el tema claro, **cuando** se abre cualquier pantalla (login, panel, vehículos, usuarios, geografía, catálogo, chequeos, notificaciones, ajustes, perfil y las cuatro del conductor), **entonces** usa la dirección A "Parte de inspección": IBM Plex Sans en la interfaz, IBM Plex Mono en placas y cifras, fondo blanco y acento **naranja vivo `#EA580C`** (provisional) en todo lo que hoy es azul, con **letra negra** encima de ese naranja (el botón desactivado conserva su aspecto aclarado); el logo lleva el fondo naranja con el mismo dibujo; y no queda ningún rastro del azul provisional `#1350D8`. *(Enmienda 1.)*
2. [ventana] **Dado** el tema claro, **cuando** se mide el contraste en login, panel, "No pueden salir", selección de vehículo y chequeo de ítems, **entonces** todo texto normal da **≥ 4.5:1** y todo texto grande da **≥ 3:1**.
3. [ventana] **Dado** las pantallas del conductor (selección de vehículo, aptitud, ítems y resultado), **cuando** se mide cada botón, pestaña y control que se toca, **entonces** mide al menos **44 × 44 px**.
4. [ventana] **Dado** un chequeo exportado a PDF y a Word, **cuando** se abre el archivo, **entonces** la cabecera usa el color primario de la nueva paleta y no el azul provisional.

### HU-02 · Tema oscuro Medianoche · **Should**

> Como **conductor que sale de madrugada o coordinador que trabaja de noche**, quiero **un tema oscuro con la paleta Medianoche** para **leer la app sin encandilarme**.

**Criterios de aceptación**

1. [ventana] **Dado** Ajustes (o el interruptor del header del conductor), **cuando** se elige "Oscuro", **entonces** las pantallas de HU-01.1 usan fondo negro con el acento naranja de la marca (ya no cian ni violeta). *(Enmienda 1.)* [DUDA: en oscuro el acento naranja `#FB923C` y el color de "alerta" `#FF8A4C` no se distinguen (1.03:1) · propuesta: se decide antes de OB-16, en la primera tanda de HU-02]
2. [ventana] **Dado** el tema oscuro, **cuando** se mide el contraste en las pantallas de HU-01.2, **entonces** cumple los mismos mínimos: **≥ 4.5:1** y **≥ 3:1**.
3. [ventana] **Dado** un vehículo en cada uno de los cinco estados, **cuando** se ve en claro y en oscuro, **entonces** cada estado conserva su color (verde, ámbar, naranja, rojo, gris) y solo cambia su luminosidad.
4. [ventana] **Dado** que la app se abre por primera vez en un navegador, **cuando** carga, **entonces** arranca en tema claro.

### HU-03 · El estado del vehículo frena al conductor · **Must**

> Como **coordinador de sede**, quiero **que un vehículo en estado crítico o no operativo no pueda arrancar el chequeo preoperacional** para **que el sistema impida salir lo que yo ya marqué como no apto**.

**Criterios de aceptación**

1. [test + ventana] **Dado** un vehículo en estado **crítico**, **cuando** un conductor intenta iniciar su chequeo **preoperacional**, **entonces** se rechaza con el mensaje exacto: *"No puedes operar este vehículo: está en estado crítico. Avísale al Coordinador de sede para que lo revise."*
2. [test + ventana] **Dado** un vehículo **no operativo**, **cuando** un conductor intenta iniciar su chequeo **preoperacional**, **entonces** se rechaza con el mensaje exacto: *"No puedes operar este vehículo: está marcado como no operativo. Avísale al Coordinador de sede para que lo revise."*
3. [test] **Dado** un vehículo crítico o no operativo, **cuando** el conductor inicia el chequeo **postoperacional**, **entonces** se permite: el recorrido ya ocurrió y hay que registrar el cierre.
4. [test] **Dado** un vehículo en estado operativo, observación o alerta, **cuando** se inicia el preoperacional, **entonces** se permite igual que hoy.
5. [test] **Dado** un vehículo crítico, **cuando** el coordinador lo cambia a operativo, **entonces** el conductor puede iniciar el preoperacional en el siguiente intento, sin otro paso.
6. [ventana] **Dado** un vehículo crítico o no operativo en la lista "No pueden salir" del panel, **cuando** se abre el panel, **entonces** ya no lleva el aviso "no se le impide".

### HU-04 · Panel sin listas repetidas · **Could**

> Como **coordinador**, quiero **ver cada vehículo bloqueado una sola vez en el panel** para **no leer lo mismo dos veces**.

**Criterios de aceptación**

1. [ventana] **Dado** un vehículo no operativo o desactivado, **cuando** se abre el panel, **entonces** aparece solo en "No pueden salir", y "Necesita atención" ya no tiene el grupo "Vehículos no operativos o bloqueados".
2. [ventana] **Dado** que hay alertas, **cuando** se abre el panel, **entonces** la insignia de "Necesita atención" no cuenta los vehículos que ya están en "No pueden salir".

## 3. Reglas, casos borde y terminado

**Reglas de negocio**

| ID | Regla |
|---|---|
| **RN-01** | Bloquean el chequeo **preoperacional**, en este orden de gravedad: vehículo desactivado, documento vencido (SOAT, revisión técnico-mecánica, extintor), estado no operativo y estado crítico. El **postoperacional** no lo bloquea ninguno de ellos. |
| **RN-02** | La regla se evalúa al momento de iniciar el chequeo, no al cargar la lista de vehículos. |

**Casos borde**

| ID | Historia | Qué pasa si… | Cómo se comporta | Cómo se prueba |
|---|---|---|---|---|
| **CB-01** | HU-03 | Un vehículo está crítico y además tiene el SOAT vencido | Se rechaza con el mensaje del documento vencido: gana el más grave según RN-01 | [test] |
| **CB-02** | HU-03 | El coordinador lo pasa de crítico a operativo mientras el conductor tiene abierta la selección | Al iniciar, se permite: la lista vieja no importa (RN-02) | [test] |
| **CB-03** | HU-01 | Una placa o un nombre de sede largo en "No pueden salir", en una pantalla de 360 px | No se desborda ni tapa la sede; la fila baja de línea | [ventana] |
| **CB-04** | HU-02 | Un usuario ya tenía guardado el tema oscuro antes del cambio | Al abrir, ve Medianoche sin volver a elegirlo | [ventana] |
| **CB-05** | HU-02 | Un estado aclarado para el oscuro lleva texto encima (banda, botón "Cumple") | El texto va en tinta oscura y da ≥ 4.5:1 | [ventana] |

**Criterios de terminado**

- [ ] Todas las historias Must y sus casos borde dan ✅ en el sello.
- [ ] Lo que ya funcionaba sigue igual: suite completa en verde y recorrido en ventana de las pantallas tocadas.
- [ ] [Martín] Después de su push, `sisvia.pages.dev` muestra lo mismo que la prueba local y el backend de Railway responde.

**Suite completa (propuesta, se confirma en la firma):** el proyecto no tiene tests. Se propone:
`node --test` en `backend/` (el ejecutor de pruebas que trae Node 22, sin instalar nada) para las reglas de HU-03 · `npm run build` en `frontend/` · lint sin problemas nuevos respecto de la línea base de 40.

## 4. Aclaraciones y firma

| Fecha | Duda | Propuesta | Respuesta |
|---|---|---|---|
| 2026-09-16 | ¿Se aprueban las 12 cláusulas? | Aprobar | Aprobadas sin cambios |
| 2026-09-16 | HU-01.1 · Dirección de diseño | A "Parte de inspección" | A "Parte de inspección" |
| 2026-09-16 | HU-02 · Prioridad de Medianoche y HU-02.4 · tema por defecto | Should, arranca en claro | Should, arranca en claro |
| 2026-09-16 | HU-03 · Qué estados bloquean | Crítico y no operativo | Crítico y no operativo |
| 2026-09-16 | Pedido nuevo antes de la firma: "para empresas". ¿Se suma a este pacto? | Dos pactos, identidad primero | Dos pactos, identidad primero. Este no cambia. |
| 2026-09-16 | Modelo de "para empresas" (para el pacto siguiente) | Una sola app para muchas empresas | Una sola app para muchas empresas, con los mismos roles |
| 2026-09-16 | Enmienda 1 · ¿Dónde va el naranja? | Marca naranja, acciones en grafito | **Naranja en todo lo que hoy es azul**, incluido el fondo del logo. Referencia de Martín: captura del menú lateral (franja de arriba con el logo y el ítem activo), *"a todo eso que esta en azul me refiero es como cambiar el azul por un naranja, iria en todo incluido el fondo del logo tambien"*. Probado en la ventana (azul, naranja vivo, naranja legible, petróleo): Martín elige **naranja vivo `#EA580C`, provisional** — *"dejalo con el naranja vivo mientras"*. |
| 2026-09-16 | Enmienda 1 · Letra sobre el naranja vivo (choca con CL-07: blanca da 3.56:1) | Letra oscura `#1C1917` (4.91:1), mostrada en la ventana | Letra oscura, **más oscura**: casi negra `#0C0A09` (5.55:1), también mostrada en la ventana — *"la letra oscura pero que sea un negro oscuro o asi como esta pero mas oscuro para que se vea mejor"*. Después, viendo el login: *"la letra de inicio de sesion que sea mucho mas negra"* → **negro puro `#000000`** (5.90:1). El botón se veía gris porque estaba desactivado (opacidad 0.5); se le propuso otro aspecto para el desactivado y Martín prefirió dejarlo como está: *"si asi esta bien como lo dejo mientras esta desactivado para que se vea bien que esta desactivado"*. Son ajustes de la opción recomendada con más contraste: no cambian qué se construye, no piden otra firma. |
| 2026-09-16 | Enmienda 1 · En oscuro el acento `#FB923C` y alerta `#FF8A4C` no se distinguen (1.03:1) | Se decide al llegar a HU-02 (Should, todavía sin construir) | Al llegar al tema oscuro: queda como `[DUDA]` en HU-02.1 y se pregunta antes de OB-16. |
| 2026-09-16 | Enmienda 1 · ¿Se firma? | Sí | **Sí, firmada.** |
| 2026-09-16 | Enmienda 1 · Acento del tema oscuro | Sigue a la marca del claro | Sigue a la marca del claro (se va el cian y el violeta) |
| 2026-09-16 | Enmienda 1 · ¿Verlo antes de firmar? | Sí, en el lienzo | Sí. Como el pedido es "todo lo azul", la prueba se hace **sobre la app real** en la ventana, con los colores puestos solo en el navegador (sin tocar el código; al recargar vuelve el azul), en vez del lienzo. |

**Firma:** Martín · 2026-09-16
**Firma de la enmienda 1:** Martín · 2026-09-16

---

## 5. Obligaciones

**Plan corto:**
- **Backend:** `services/bloqueoVehiculo.js` (nuevo: reglas de bloqueo puras, sin tocar la base), `services/chequeos.service.js`, `controllers/dashboard.controller.js`, `services/export/branding.js`, `services/export/word/brandingWord.js`, `services/export/assets/logo.png`, `services/email.service.js`, `test/bloqueoVehiculo.test.js` (nuevo) y `package.json`.
- **Frontend:** `styles/variables.css` (tokens de claro y oscuro, fuentes, letra sobre la marca), `index.html` (carga de fuentes), `public/logo.png`, los 5 CSS con el azul provisional en `rgba()`, las pantallas del conductor que no lleguen a 44 px, `pages/Dashboard/Dashboard.jsx` y `Dashboard.css`, y para HU-02 los 169 colores sueltos repartidos en los `.css` de componentes y páginas.
- **Docs:** `docs/generar_manual.cjs` (color del manual).

**Cláusulas que aplican:**
- **CL-04** → todo color nuevo entra como token. Los 7 azules en `rgba()` se reemplazan por tokens, no por otro `rgba()` suelto. Los 169 colores sueltos se pasan a tokens en HU-02, porque sin eso el oscuro queda con huecos.
- **CL-05** → ningún tema toca el tono de `--veh-*`; el texto que va sobre un estado usa `--veh-tinta`.
- **CL-06** → las fuentes se cargan con `<link>` en `index.html`. Los 2 `display: none` de `ChequeoItems.jsx` pasan a clase solo si OB-13 toca ese archivo.
- **CL-07** y **CL-08** → el contraste y los tamaños se **miden** en la ventana con un script; no se estiman a ojo.
- **CL-01** → cada tanda cierra con un commit propuesto; git lo corre Martín.

**Base**

- [x] OB-01 · base · Script `"test": "node --test"` en `backend/package.json` y carpeta `backend/test/`.
- [x] OB-02 · base · Medir y anotar la línea base de lint del frontend (40 problemas) para comparar en cada punto de control.
- [x] OB-03 · base · Corregir `COLORES.verde` → `COLORES.primario` en `backend/src/services/email.service.js`. Bug del renombre del SENA: la cabecera y el botón del correo salían con `background:undefined`.

**HU-03 · Must**

- [x] OB-04 · HU-03.1-4 · RN-01 · Crear `backend/src/services/bloqueoVehiculo.js` con una función pura que recibe el vehículo, el tipo de chequeo y la fecha, y devuelve `{ razon, mensaje }` o `null`, en el orden de RN-01. Mover ahí `primerDocumentoVencido`. Sin importar `config/supabase.js`, para poder probarla sin base.
- [x] OB-05 · HU-03.1-5 · CB-01 · CB-02 · Tests en `backend/test/bloqueoVehiculo.test.js`: los dos mensajes exactos, postoperacional permitido, operativo/observación/alerta permitidos, el paso de crítico a operativo, y crítico con SOAT vencido.
- [x] OB-06 · HU-03.1,2 · RN-02 · En `iniciarChequeo` de `chequeos.service.js`, reemplazar la verificación de documentos por la función de OB-04, evaluada al iniciar con el vehículo recién leído de la base.
- [x] OB-07 · HU-03.6 · En `dashboard.controller.js`, clasificar "No pueden salir" con la misma función (una sola fuente de verdad) y quitar el bloqueo "blando"; quitar el aviso "no se le impide" de `Dashboard.jsx` y su estilo de `Dashboard.css`.
- [x] **PC-HU-03** · suite completa + HU-03.1-6 + CB-01, CB-02 + CL-04, CL-06

**HU-01 · Must**

- [x] OB-08 · HU-01.1 · Tokens de tema claro en `styles/variables.css` con la paleta A: neutros de croma casi cero (fondo `#F6F7F8`, superficie `#FFFFFF`, borde `#DDE2E6`, texto `#14181B`, texto suave `#5A646E`) y acento **naranja vivo** los mismos valores que Martín vio en la ventana (`--color-primario #EA580C`, `-oscuro #C2410C`, `-muy-oscuro #9A3412`, `-claro #FFEDD5`); `--fuente-principal` y `--fuente-monospace` con IBM Plex Sans y IBM Plex Mono, cargadas en `frontend/index.html`. *Reescrita por la enmienda 1: antes decía petróleo.*
- [x] OB-09 · HU-01.1 · Reemplazar por tokens los 7 `rgba()` del azul provisional en `Login.css`, `CambiarPassword.css`, `Campanita.css`, `ModalVehiculo.css` y `animations.css`. *Enmienda 1: no cambia; los tokens nuevos salen del primario naranja.*
- [x] OB-10 · HU-01.1 · Regenerar `frontend/public/logo.png` con fondo naranja vivo y el mismo dibujo (el dibujo claro sobre `#EA580C` da 3.25:1; un gráfico pide ≥ 3:1). *Reescrita por la enmienda 1: antes decía petróleo.*
- [x] OB-26 · HU-01.1,2 · Letra negra sobre el naranja: token `--texto-sobre-marca: #000000` (5.90:1) en las reglas que hoy pintan blanco sobre el primario (68 con blanco explícito, más las que lo heredan o usan `--texto-inverso`). Los fondos de *hover* de la marca **aclaran** en vez de oscurecer: la letra negra sobre `#C2410C` da 4.06:1 y no pasa CL-07; sobre `#F97316` da 7.49:1. Los botones desactivados conservan su opacidad actual (decisión de Martín). *Nueva por la enmienda 1.*
- [x] OB-27 · HU-01.1 · CL-05 · El primario hacía de "operativo / cumple / éxito" en 14 lugares (herencia del verde del SENA): con naranja, un vehículo operativo se vería del color de alerta. Los grupos de estado del vehículo donde estaba (tarjeta de selección del conductor, resultado en Chequeos y en el detalle, insignias de Vehículos y del detalle del vehículo, ícono del resultado del conductor, regla de criticidad) pasan **enteros** a `--veh-*` con `--veh-tinta`; "Cumple" pasa a `--veh-operativo`; el éxito genérico (toast, campanita, notificaciones, aptitud apta, usuario activo) pasa a `--color-exito` y `--estado-exito-*`. *Apareció en la tanda 2.*
- [ ] OB-11 · HU-01.1 · Monoespaciada en placas, kilometraje y fechas en las pantallas de HU-01.1 que hoy los muestran en la fuente de interfaz.
- [ ] OB-12 · HU-01.2 · Medir el contraste en tema claro en las 5 pantallas del criterio y corregir los tokens que no lleguen.
- [ ] OB-13 · HU-01.3 · Medir los controles de las 4 pantallas del conductor y llevar a ≥ 44 px los que no lleguen.
- [ ] OB-14 · HU-01.4 · Naranja vivo en `export/branding.js` y `export/word/brandingWord.js`, logo nuevo en `export/assets/logo.png`, y el mismo color en `docs/generar_manual.cjs`. La cabecera del PDF hoy lleva letra blanca (`documentoBase.js`): pasa a negra. *Reescrita por la enmienda 1: antes decía petróleo.*
- [ ] OB-15 · CB-03 · Probar a 360 px una placa y una sede largas en "No pueden salir"; corregir si se desborda.
- [ ] OB-24 · HU-01.1 · El header del conductor dice "Gestión de Flota" escrito a mano en `components/ConductorLayout/ConductorLayout.jsx`: leerlo de `lib/marca.js` (incumple CL-02). *Apareció en PC-HU-03.*
- [ ] OB-25 · HU-01.1 · Las tarjetas de `pages/Conductor/SeleccionVehiculo.jsx` muestran el estado crudo en mayúsculas ("NO_OPERATIVO", "CRITICO", sin tilde): mostrar la etiqueta legible ("No operativo", "Crítico"). *Apareció en PC-HU-03.*
- [ ] **PC-HU-01** · suite completa + HU-01.1-4 + CB-03 + CL-04, CL-06, CL-07, CL-08

**HU-02 · Should**

- [ ] OB-16 · HU-02.1 · Paleta Medianoche en el bloque `[data-tema="oscuro"]` de `variables.css`: fondo negro y el acento naranja de la marca para acción primaria, navegación activa, insignia de cargo y enlaces (se van el cian y el violeta). **Antes de construirla se responde la `[DUDA]` de HU-02.1** (naranja contra alerta en oscuro). *Reescrita por la enmienda 1.*
- [ ] OB-17 · HU-02.1 · Pasar a tokens los colores sueltos de los `.css` del panel (`components/AdminLayout`, `pages/` de administración), con valor de claro y de oscuro.
- [ ] OB-18 · HU-02.1 · Lo mismo en los `.css` del conductor, login, perfil y el resto de `components/`.
- [ ] OB-19 · HU-02.2 · CB-05 · Medir el contraste en oscuro en las pantallas de HU-01.2 y corregir; verificar que todo texto sobre un estado use `--veh-tinta`.
- [ ] OB-20 · HU-02.3 · Recorrido en ventana con un vehículo en cada estado, en claro y en oscuro.
- [ ] OB-21 · CB-04 · Probar en ventana con `sisvia-tema=oscuro` ya guardado de antes.
- [ ] OB-22 · HU-02.4 · Probar en ventana, con el almacenamiento vacío, que arranca en claro (ya es lo que hace `lib/tema.js`).
- [ ] **PC-HU-02** · suite completa + HU-02.1-4 + CB-04, CB-05 + CL-04, CL-05, CL-07

**HU-04 · Could**

- [ ] OB-23 · HU-04.1,2 · Quitar el grupo "Vehículos no operativos o bloqueados" de `Dashboard.jsx` y de la suma de la insignia; quitar la consulta `vehiculos_no_operativos` de `dashboard.controller.js`.
- [ ] **PC-HU-04** · suite completa + HU-04.1,2 + CL-06

**Revisión antes de construir:** pasó, con hallazgos.

- Cada historia Must tiene obligaciones; cada caso borde tiene la suya (CB-01 y CB-02 en OB-05, CB-03 en OB-15, CB-04 en OB-21, CB-05 en OB-19). No quedan dudas abiertas. Las RN citadas existen. Ninguna obligación choca con una cláusula.
- **Cómo se abren los `[ventana]`:** backend con `npm run dev` en `backend/` (puerto 3001, usa el `.env` local con la Supabase real); frontend con `npm run dev` en `frontend/` (puerto 5173). Login con un usuario temporal creado para la prueba. Vehículos de prueba `TST-*` en cada estado. **La base es la de producción:** mientras dura la prueba, `sisvia.pages.dev` también ve los `TST-*`. Usuario y vehículos se borran al cerrar cada punto de control.
- **Hallazgo · bug:** `COLORES.verde` en `email.service.js` es `undefined` desde el renombre (verificado importando el módulo). No lo cubre ningún criterio: va como OB-03, `base`.
- **Hallazgo · la lógica de bloqueo estaba duplicada:** `dashboard.controller.js` tiene su propia copia de `primerDocumentoVencido`. Si se agrega el bloqueo por estado solo en `chequeos.service.js`, "No pueden salir" y el bloqueo real se desincronizan. Por eso OB-04 y OB-07 usan una sola función.
- **Hallazgo · el test tiene que evitar la base:** importar `chequeos.service.js` carga `config/supabase.js`, que corta el proceso si faltan las variables. Por eso las reglas van a un módulo puro (OB-04).
- **Riesgo:** IBM Plex Sans es más ancha que la fuente del sistema; puede desbordar tablas. CB-03 cubre "No pueden salir" y el recorrido del criterio de terminado cubre el resto.
- **Propuestas aparte (no se construyen en este pacto):** los PDF usan colores de estado propios (`#3B6D11`, `#BA7517`, `#A32D2D`) que no coinciden con los `--veh-*` de la app. Los 2 `marginLeft: "auto"` en línea de `ChequeoDetalle.jsx` y `ChequeosAdmin.jsx` incumplen CL-06 y ninguna obligación toca esas líneas.

**Revisión de la enmienda 1 (2026-09-16):** pasó, con hallazgos.

- HU-01 (Must) sigue con obligaciones para cada criterio; la enmienda reescribe OB-08, OB-10, OB-14 y OB-16, deja OB-09 igual y agrega OB-26. No quedan dudas abiertas en historias Must: la única `[DUDA]` nueva está en HU-02.1 (Should) y se responde antes de OB-16.
- **CL-07:** la letra blanca sobre el naranja vivo (3.56:1) no pasa → OB-26 la cambia por negra (5.90:1). El *hover* que hoy oscurece a `#C2410C` tampoco pasa con letra negra (4.06:1) → aclara a `#F97316` (7.49:1). El texto naranja oscuro `#C2410C` sobre el tinte `#FFEDD5` (ítem activo del menú) queda justo en 4.52:1: se mide en OB-12.
- **CL-04:** la letra sobre la marca entra como token (`--texto-sobre-marca`), no como `#000` suelto en cada componente.
- **CL-05:** la enmienda no toca ningún `--veh-*`. Riesgo visual, no incumplimiento: en claro, naranja vivo y alerta quedan a 1.45:1 entre sí y el tono oscuro de la marca es el mismo `#C2410C` de alerta; se mira en la ventana en PC-HU-01.
- **PDF y Word:** la cabecera del PDF lleva letra blanca sobre el primario (`documentoBase.js`) → entra en OB-14.
- **La prueba sobre la app real** (colores puestos solo en el navegador) sirvió para decidir y encontró las 68 reglas con letra blanca sobre la marca; no dejó nada en el código.

## 6. Tandas

| # | Fecha | Obligaciones | Punto de control | Commit sugerido |
|---|---|---|---|---|
| 1 | 2026-09-16 | OB-01 a OB-07 | PC-HU-03 ✅ | `Bloqueo por estado del vehículo con reglas compartidas` |
| 2 | 2026-09-16 | OB-08, OB-09, OB-10, OB-26, OB-27 | Sin punto de control propio (PC-HU-01 cierra en la tanda 4). Suite: 11 de 11 tests · build OK · lint 40 = línea base. Ventana: login y panel reales en claro | `Identidad naranja: paleta A, IBM Plex, logo nuevo y estados con sus colores` |

**PC-HU-03 · 2026-09-16**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` en backend (11 de 11) · los 61 módulos del backend importan · `npm run build` · lint 40 problemas = línea base | ✅ |
| HU-03.1 | test `HU-03.1`, leído contra el criterio: compara el mensaje entero con `assert.equal` · ventana: TST-CRI se rechazó con el texto exacto y el conductor quedó en la selección | ✅ |
| HU-03.2 | test `HU-03.2`, mismo control · ventana: TST-NOP con el texto exacto, distinto del anterior | ✅ |
| HU-03.3 | test `HU-03.3`: los dos estados, en postoperacional | ✅ |
| HU-03.4 | test `HU-03.4`: los tres estados que no bloquean. Con los dos de HU-03.1,2 cubre el límite: de 5 estados bloquean exactamente 2 | ✅ |
| HU-03.5 | test `HU-03.5`: el mismo vehículo pasa de crítico a operativo | ✅ |
| HU-03.6 | ventana: "No pueden salir" muestra TST-NOP y TST-CRI, sin "no se le impide" (0 elementos del aviso) | ✅ |
| CB-01 | test `CB-01`: crítico + SOAT vencido → mensaje del documento | ✅ |
| CB-02 | test `CB-02`: objeto de la lista vieja contra el recién leído | ✅ |
| Cláusulas | CL-04: no se agregó ningún color · CL-06: no se agregó ningún estilo en línea · CL-01: sin git | ✅ |

**Hallazgos de la tanda 1**

- **Los tests tienen dientes:** se rompió la regla a propósito tres veces (alerta también bloquea, una letra distinta en el mensaje, postoperacional bloqueado) y cada vez falló exactamente el test que corresponde.
- **El bloqueo es real, no solo un mensaje:** al limpiar, había **0 chequeos** creados sobre los vehículos de prueba.
- **Cambio de texto menor en el panel:** con una sola regla, la línea de un RTM vencido pasa a decir "revisión técnico-mecánica (RTM) vencido hace N días" (antes sin "(RTM)"). El SOAT y el extintor no cambian.
- **Dos obligaciones nuevas en HU-01** (OB-24 y OB-25), vistas en la ventana del conductor.
- **Propuesta aparte, anterior a este pacto:** `new Date("AAAA-MM-DD")` se interpreta en UTC. En una máquina con hora de Bogotá, un documento se da por vencido **un día antes**; en Railway (UTC) está bien. No se tocó: el pacto no cubre fechas.
- **Proceso:** en un paso encadenado de la prueba se activó sin querer el modo oscuro del navegador de prueba; se devolvió a claro antes de seguir. No afecta al código.

**Hallazgos de la tanda 2**

- **Estados pintados con el color de marca (OB-27):** al buscar dónde iba la letra negra aparecieron 14 reglas que usaban el primario para decir "operativo", "cumple" o "éxito". Se agregó OB-27 dentro de HU-01; se pasaron a los tokens de estado para cumplir CL-05. Los grupos donde estaba se pasaron enteros, porque dejar "operativo" en `--veh-operativo` y "observación" en el azul genérico mezclaba dos sistemas en la misma fila.
- **Cómo se verificó en la ventana:** la prueba de color quedó en "Azul actual" (nada inyectado) y se leyeron los estilos calculados de la app real: primario `#EA580C`, letra del botón `rgb(0,0,0)`, IBM Plex Sans cargada, degradado del login y logo nuevo. La sesión de la cuenta de prueba se abrió con la llave de administrador (enlace mágico verificado por script), **sin escribir contraseñas**.
- **Martín recorrió la app en la ventana** durante la verificación (usuarios, vehículos, tema oscuro).
- **El tema oscuro todavía mezcla azul y naranja:** `--acento-luz #4C8DFF` y `--acento-suave` azul siguen en el bloque oscuro a propósito; cambiarlos es OB-16, que espera la `[DUDA]` de HU-02.1.
- **Para medir en OB-12:** `--veh-observacion #A66A00` con letra blanca da 4.48:1 (le falta un poco para 4.5); el naranja oscuro `#C2410C` sobre el tinte `#FFEDD5` da 4.52:1, justo; los campos del login siguen con fondo gris fuerte.
- **`color-mix()`** se usa en los tokens de velo para que salgan del primario. Requiere Chrome 111, Safari 16.2 o Firefox 113 (2023 en adelante).

## 7. Sello

*Todavía no hay intentos.*

## 8. Enmiendas

| N | Fecha | Qué cambió | Motivo (pedido textual) | Obligaciones afectadas | Firma |
|---|---|---|---|---|---|
| 1 | 2026-09-16 | Acento de la marca: de petróleo a **naranja vivo `#EA580C`** (provisional) en todo lo que hoy es azul, logo incluido, con **letra negra `#000000`** encima; el tema oscuro sigue a la marca (se van cian y violeta). Choques al cruzarla con lo firmado: (a) letra blanca sobre el naranja vivo da 3.56:1 y CL-07 pide 4.5:1 → se resolvió con letra negra (5.90:1); (b) en oscuro el acento naranja y alerta quedan a 1.03:1 → `[DUDA]` en HU-02.1, se decide antes de OB-16; (c) en claro, naranja vivo y alerta quedan a 1.45:1 y el tono oscuro de la marca `#C2410C` es el mismo de alerta → se revisa en la ventana en PC-HU-01. Probado sobre la app real en la ventana antes de firmar. | *"mmm ok pero antes de ingresar a la tanda 2 puedes cambiar el azul por un naranja? o bueno pues el logo tambien"* · *"dejalo con el naranja vivo mientras"* | OB-08, OB-10, OB-14, OB-16 (reescritas) · OB-09 (sin cambios) · OB-26 (nueva) · criterios HU-01.1 y HU-02.1 | Martín · 2026-09-16 |
