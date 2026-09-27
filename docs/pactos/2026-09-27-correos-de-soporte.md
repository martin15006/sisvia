---
pacto: correos-de-soporte
nivel: 1          # 1 = ficha · 2 = SRS
estado: en tandas # borrador → firmado (al firmar) → en tandas (1.ª tanda) → sellado (al sellar)
creado: 2026-09-27
---

# Pacto · Correos de Soporte: uno por conversación

<!-- "Dónde quedamos" se REEMPLAZA entero (no se acumula) al frenar esperando respuestas, al cerrar
     cada tanda y después de cada intento de sello. Hasta 3 líneas: la historia está en "Tandas",
     el detalle en el diario y las preguntas en "Aclaraciones". -->
> **Dónde quedamos**
> 2026-09-27 · Última: sello, intento 1: todo ✅ menos HU-01.6 (detalle en el diario)
> Sigue: el push de Martín (la migración ya está corrida) y su prueba en Gmail (HU-01.6) → intento 2 y sellar
> Bloqueos: HU-01.6 espera a Martín, después del push

## 1. Qué y por qué

**Pedido (textual):** "como lo podriamos ajustar para que en si al correo no llegue todos los mensajes que se envian entre empresa a sisvia, seria bueno que solo llegue es cuando hay un mensaje nuevo porque asi como esta llena el correo muy rapido y puede dejar correos importantes abajo que uno no se da cuenta, yo pienso algo como ejemplo que cuando una empresa le escribe a uno por primera vez entonces le llega al correo de tal empresa se te ha enviado un mensaje, y tambien algo de que si la empresa dura varios dias y vuelve y envia un mensaje que otra vez vuelva y aparezca pero que sea un solo mensaje no tantos porque le llenan el correo a uno, que otra opinion mejores tienes?"

**Problema:** Soporte ("Escribir a SISVIA", `para-empresas/HU-18`) manda por correo una copia de **cada** mensaje: el nuevo, cada respuesta y el resuelto. Al equipo SISVIA le llega a **todos**. Una conversación de 10 mensajes son 10 correos para cada uno, y los correos importantes quedan enterrados.

**Para quién:** el equipo SISVIA (Administrador general) y el Administrador de empresa que escribe.

**Decidido antes de la ficha (2026-09-27):** de tres reglas propuestas (esta, "primer mensaje + otro tras N días" y "resumen diario"), Martín eligió **"uno hasta que la abras"**. Sumó dos extras: **"el que responde se queda"** y un **interruptor en Mi perfil**.

**Fuera de este pacto:**
- Los demás correos de SISVIA (vencimientos, falla crítica, informe al superior, contraseñas) no cambian.
- La campanita no cambia: sigue avisando cada mensaje, a los mismos de hoy.
- Lo que se ve en Soporte (bandeja, hilo, estados) no cambia.
- El resumen diario por correo (la opción que no se eligió).

**Cambia lo pactado en `para-empresas/HU-18.3,5`**, que decían *"(y copia por correo)"* en cada aviso. Ese pacto está sellado: el cambio vive acá.

## 2. Historias

Cómo se prueba: `[test]` = `node --test` sobre la regla pura · `[api]` = script contra el backend local con empresas `TST` y cuentas `@sisvia.test` (con `CORREO_ACTIVO=0`: se comprueba **a quién se decidió mandarle** el correo, sin mandarlo) · `[ventana]` = `navegador-visible` · `[Martín]` = en su Gmail, después del push.

### HU-01 · Un correo por conversación hasta que la abras · **Must**

> Como **Administrador general o Administrador de empresa**, quiero **que el correo me avise una sola vez por conversación hasta que la abra**, para **que Soporte no me llene el correo y no se me pierdan los correos importantes**.

**Criterios de aceptación**

1. [test + api] **Dado** una empresa que le escribe a SISVIA (conversación nueva), **cuando** la envía, **entonces** a cada persona del equipo SISVIA le llega **1 correo**, como hoy (*"<Empresa> escribió a SISVIA · <tipo>"*). Al final dice: *"Mientras no abras esta conversación en SISVIA, no te llegan más correos de ella."*
2. [test + api] **Dado** una conversación de la que ya te llegó un correo y que no abriste desde entonces, **cuando** llegan más mensajes, **entonces** no te llega otro correo. La campanita avisa cada uno, como hoy.
3. [test + api] **Dado** una conversación que abriste después del último correo, **cuando** llega un mensaje nuevo (a la hora, o a los 5 días), **entonces** te llega **1 correo** otra vez.
4. [test + api] **Dado** que la estás mirando (la tuviste abierta en los últimos **10 minutos**; abierta en pantalla se refresca sola cada segundo), **cuando** llega un mensaje, **entonces** no te llega correo: ya lo ves en el chat.
5. [test + api] **Del lado de la empresa**, con la misma regla: a quien escribió (o a los Administradores activos de su empresa, si él ya no está) le llega 1 correo cuando SISVIA responde o lo marca resuelto, y no otro hasta que abra la conversación.
6. [Martín] **Después del push**, una conversación de prueba con 5 mensajes seguidos de la empresa deja **1 solo correo** en su Gmail.

### HU-02 · El que responde se queda con la conversación · **Must**

> Como **Administrador general**, quiero **que cuando alguien del equipo responde una conversación, sus correos le lleguen solo a él**, para **que los demás no reciban correos de lo que ya atiende otro**.

**Criterios de aceptación**

1. [test + api] **Dado** una conversación que nadie del equipo respondió, **cuando** la empresa escribe, **entonces** el correo (con la regla de HU-01) le llega a todo el equipo SISVIA.
2. [test + api] **Dado** una conversación que respondió alguien del equipo, **cuando** la empresa vuelve a escribir, **entonces** el correo le llega **solo a quien respondió por última vez**. La campanita avisa a todo el equipo, como hoy.
3. [test + api] **Dado** que quien se quedó con la conversación apagó sus correos (HU-03), **cuando** la empresa escribe, **entonces** el correo les llega a **los demás del equipo** que los tienen prendidos, cada uno con la regla de HU-01.

### HU-03 · Apagar los correos de Soporte desde Mi perfil · **Must**

> Como **Administrador general o Administrador de empresa**, quiero **apagar los correos de Soporte desde Mi perfil**, para **decidir si me llegan o si me alcanza con la campanita**.

**Criterios de aceptación**

1. [ventana] **Dado** Mi perfil de un Administrador general o de empresa, **cuando** lo abre, **entonces** ve la sección *"Correos de Soporte"* con el interruptor *"Recibir correos de Soporte"*, encendido de entrada, y la ayuda *"La campanita te sigue avisando de todo; esto solo apaga los correos."* Los demás roles no la ven.
2. [test + api + ventana] **Dado** el interruptor, **cuando** lo toca, **entonces** se guarda en ese momento, **sin contraseña** ni "Guardar cambios" (a diferencia de nombre, teléfono y foto), y ve *"Listo: ya no te llegan correos de Soporte."* o *"Listo: te vuelven a llegar los correos de Soporte."*
3. [test + api] **Dado** los correos apagados, **cuando** hay algo en Soporte, **entonces** no le llega correo; la campanita, sí.
4. [api] **Dado** la API, **cuando** alguien de otro rol intenta cambiarlo, **entonces** responde 403 *"Solo los Administradores reciben correos de Soporte."*

## 3. Reglas, casos borde y terminado

**Reglas de negocio**

| ID | Regla |
|---|---|
| **RN-01** | **Abrir una conversación** es entrar a su hilo en Soporte (ver la bandeja no cuenta); responder también cuenta. Cada persona cuenta por separado: que la abra otro no cuenta para ti. |
| **RN-02** | A nadie le llega correo de lo que escribió él mismo (como hoy). |
| **RN-03** | La campanita no cambia: cada mensaje le llega a los mismos de hoy. |
| **RN-04** | Con el correo apagado en el servidor (`CORREO_ACTIVO=0`) no sale ninguno, como hoy. |

**Casos borde**

| ID | Historia | Qué pasa si… | Cómo se comporta | Cómo se prueba |
|---|---|---|---|---|
| **CB-01** | HU-01 | Llegan dos mensajes casi al mismo tiempo | Sale **un** solo correo por persona | [test] en el PostgreSQL local + [api] con dos pedidos a la vez |
| **CB-02** | HU-01 | El correo falla al salir (Gmail caído) | No queda como "ya avisado": el mensaje siguiente lo vuelve a intentar | [test] |
| **CB-03** | HU-01 | Conversaciones que ya existían antes de este cambio | La primera novedad después del push manda 1 correo, como si nunca te hubiera llegado uno | [test] |
| **CB-04** | HU-02 | Quien se quedó con la conversación ya no está activo o ya no es Administrador general | Los correos vuelven a todo el equipo | [test + api] |
| **CB-05** | HU-02 | Responde otra persona del equipo | La conversación pasa a esa persona | [test + api] |
| **CB-06** | HU-01 | La tenías abierta, te fuiste, y la otra parte escribe **un solo** mensaje antes de que pasen los 10 minutos | No te llega correo (la campanita sí). Si vuelve a escribir pasados los 10 minutos, te llega 1 | [test] |

**Criterios de terminado**

<!-- Se tildan recién en el intento de sello que sella, no antes. -->

- [ ] Todas las historias Must y los casos borde dan ✅ en el sello.
- [ ] La migración la corrió Martín en producción.
- [ ] Lo que ya funcionaba sigue igual: suite completa en verde, el script de Soporte (`pc-hu18`) en verde con sus avisos de campanita iguales, y recorrido en ventana de Soporte y Mi perfil.

## 4. Aclaraciones y firma

| Fecha | Duda | Propuesta | Respuesta |
|---|---|---|---|
| 2026-09-27 | ¿Qué regla para los correos de Soporte? | "Uno hasta que la abras" | **"Uno hasta que la abras"** |
| 2026-09-27 | ¿Qué extras? | — | **"El que responde se queda"** e **"Interruptor en Mi perfil"** |
| 2026-09-27 | Con los extras pedidos explícitamente, ¿qué prioridad? (CB-04 y CB-05 son de HU-02: como Should no podrían bloquear el terminado) | Las tres historias Must | **Las tres Must** (firma) |
| 2026-09-27 | HU-01.4 · ¿Cuántos minutos cuentan como "la estás mirando"? | 2 minutos. La conversación abierta se refresca cada segundo, así que 2 minutos es "la tengo delante" | **10 minutos** (no fue la recomendada: queda el caso CB-06) |
| 2026-09-27 | HU-02.3 · Si quien se quedó con la conversación apagó sus correos, ¿les llega a los demás? | No: a nadie por correo. Él eligió no recibirlos, y la campanita avisa a todo el equipo | **Sí, a los demás** que los tienen prendidos (no fue la recomendada) |
| 2026-09-27 | HU-03.2 · ¿El interruptor pide la contraseña, como el resto de Mi perfil? | No, y se guarda al tocarlo: no es un dato de la cuenta ni da acceso a nada, y lo que cambia se ve al instante en pantalla | **No, se guarda al tocarlo** |

**Firma:** Martín · 2026-09-27 (*"si ya me parece bien como esta ya lo firmo"*), con el hueco de CB-06 explicado antes de firmar.

---

## 5. Obligaciones

**Plan corto:**
- **Base de datos:** migración `database/migrations/2026-09-27_correos_soporte.sql`, **aditiva** (el código que hoy está en producción no la nota):
  - `usuarios.correos_soporte` (verdadero de entrada) para HU-03;
  - `buzon_mensajes.atiende_id` (quién del equipo respondió por última vez) para HU-02;
  - tabla `buzon_correo_estado` (por conversación y persona: cuándo le llegó el último correo y cuándo la vio), con RLS y borrado en cascada con la conversación;
  - función `reclamar_correo_buzon`, que decide y anota en **una sola operación** a quién le toca correo (así dos mensajes a la vez no mandan dos, CB-01).
  - Se refleja en `database.sql` e `INSTALAR_TODO.sql`, se prueba en el PostgreSQL local (55432) y **la corre Martín**.
- **Backend:**
  - regla pura `services/correosSoporteReglas.js` (cuándo toca correo y a quién del equipo) con sus tests;
  - `buzon.service.js`: el correo sale solo a quienes reclama la función, "visto" se anota al abrir (con un freno de 30 s: la conversación abierta se pide cada segundo), al responder y al escribir; si el envío falla, se libera;
  - `plantillaBuzon`: la línea del pie;
  - ruta `PATCH /api/auth/mi-perfil/correos-soporte`, y el campo en el login, `/me` y Mi perfil.
- **Frontend:** `pages/MiPerfil`, la sección "Correos de Soporte" con su interruptor.

**Cláusulas que aplican:**
- **CL-09** → la tabla nueva nace con RLS activo y sin políticas; la función no la pueden llamar `anon` ni `authenticated`, solo `service_role`.
- **CL-13** → la conversación se sigue abriendo con `mensajeVisible` (que ya filtra por empresa); los Administradores de la empresa, con `deLaEmpresa`.
- **CL-04 · CL-06 · CL-07** → el interruptor usa tokens, su `.css` al lado y el medidor de contraste en claro y oscuro.
- **CL-02** → el pie del correo no escribe "SISVIA" a mano: sale de `marca.js`.

- [x] OB-01 · base · CB-01 · Migración `2026-09-27_correos_soporte.sql` + su reflejo en `database.sql` e `INSTALAR_TODO.sql`, probada en el PostgreSQL local: instalación desde cero, dos corridas seguidas, y dos reclamos a la vez sobre la misma persona (uno gana).
- [x] OB-02 · HU-01.2-4 · CB-02 · CB-03 · CB-06 · Regla pura `correosSoporteReglas.js` (`tocaCorreo`: nunca avisado o visto después del último correo, y no visto en los últimos 10 minutos) con tests en el límite (10 min justos y un instante antes).
- [x] OB-03 · HU-01.1-5 · RN-01 · RN-02 · RN-04 · CB-02 · `buzon.service.js`: "visto" al abrir, responder y escribir; el correo de cada aviso sale solo a los que reclama la función; si `enviarCorreo` vuelve con error, se libera el reclamo; el pie de HU-01.1 en `plantillaBuzon`. La campanita no cambia (RN-03).
- [x] OB-04 · HU-01 · CB-01 · CB-03 · CB-06 · Script `scratchpad/pc/pc-correos.cjs` [api] (con `CORREO_ACTIVO=0` se mira a quién se le reclamó el correo en `buzon_correo_estado`), y `pc-hu18` sigue en verde.
- [x] **PC-HU-01** · suite completa + HU-01.1-5 + CB-01, CB-02, CB-03, CB-06 + RN-01 a RN-04 + CL-09, CL-13 · HU-01.6 queda para después del push ([Martín])
- [x] OB-05 · HU-02.1-3 · CB-04 · CB-05 · Al responder desde SISVIA, `atiende_id` = quien respondió; los destinatarios del correo del equipo salen de `correosSoporteReglas` (quien atiende, si sigue activo como Administrador general y con correos; si los apagó, los demás con correos; si ya no está, todo el equipo), con tests y su parte en `pc-correos.cjs`.
- [x] **PC-HU-02** · suite completa + HU-02.1-3 + CB-04 + CB-05
- [x] OB-06 · HU-03.2-4 · `PATCH /api/auth/mi-perfil/correos-soporte` (solo Administrador general y de empresa; 403 con el texto de HU-03.4), sin contraseña, con los textos de HU-03.2; `correos_soporte` en login, `/me` y la respuesta de Mi perfil; los correos de Soporte saltan a quien lo tiene apagado (HU-03.3). Tests y su parte en `pc-correos.cjs`.
- [x] OB-07 · HU-03.1-2 · Mi perfil: la sección "Correos de Soporte" con el interruptor, su ayuda y el aviso al guardar; solo para esos dos roles.
- [x] **PC-HU-03** · suite completa + HU-03.1-4 + CL-04, CL-06, CL-07 · ventana: el Administrador de TST A (sesión cargada) y el lado del Administrador general con Martín logueado

**Revisión antes de construir:** pasó.
- Las tres historias Must tienen obligaciones, y cada caso borde tiene al menos una que lo cita.
- Las RN citadas existen; no quedan dudas abiertas.
- Ninguna obligación choca con una cláusula.
- **Orden:** con OB-01 hecha, Martín corre la migración **antes** de las pruebas por API (el backend de pruebas usa el Supabase real). Es aditiva: se puede correr ya, antes del push.
- **Pensado de más:** con el correo apagado en el servidor (`CORREO_ACTIVO=0`) el reclamo igual se anota, porque la decisión se toma igual (así se prueba sin mandar correos). Una conversación que se abre y se deja abierta en otra pestaña cuenta como "vista" solo mientras la pestaña está a la vista, porque la app deja de pedirla cuando se oculta.

## 6. Tandas

| # | Fecha | Obligaciones | Punto de control | Commit sugerido |
|---|---|---|---|---|
| 1 | 2026-09-27 | OB-01 a OB-04 | PC-HU-01 ✅ (41 de 41 por API, `pc-hu18` 51 de 51; HU-01.6 queda para después del push) | `Correos de Soporte: uno por conversación hasta que la abras` |
| 2 | 2026-09-27 | OB-05 | PC-HU-02 ✅ | `El que responde en Soporte se queda con los correos de esa conversación` |
| 3 | 2026-09-27 | OB-06, OB-07 | PC-HU-03 ✅ (ventana con la empresa, el Coordinador y Martín logueado) | `Mi perfil: interruptor "Recibir correos de Soporte"` |

**Hallazgos**

- Tanda 1 · **La decisión "¿le toca correo?" vive solo en la base** (`reclamar_correo_buzon`), sin copia en JS. HU-01.2-4, CB-03 y CB-06, con el límite (10 min justos manda, 9 min 59 s no), se prueban en `scratchpad/pgcorreos/pruebas.sql` y en `pc-correos.cjs`. La regla JS cubre a quién se le pregunta (HU-02, HU-03) y CB-02. Cambia el cómo de OB-02, no el qué.
- Tanda 1 · **Orden de despliegue:** la migración va **antes** del push. El código nuevo lee `atiende_id` y llama las funciones nuevas: al revés, Soporte deja de responder.
- Tanda 1 · **CL-02, corregida de paso** (OB-03 tocaba ese código): los títulos de los avisos de Soporte escribían "SISVIA" a mano; ahora salen de `MARCA.nombre`, con el mismo texto.

## 7. Sello

<!-- "Cómo se probó" en una línea; el detalle va al diario (2026-09-27-correos-de-soporte.diario.md). -->

### Intento 1 · 2026-09-27

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 161 de 161 · lint 34 (= base) · build | ✅ |
| HU-01.1 | API: 1 correo a cada uno del equipo, un solo envío · test del pie · plantilla con el pie | ✅ |
| HU-01.2 | API: dos respuestas sin abrirla, 0 envíos · PostgreSQL local | ✅ |
| HU-01.3 | API: la abrió hace rato → 1 correo; al que no la abrió, no · PostgreSQL local | ✅ |
| HU-01.4 | API: abierta hace un momento → nada · PostgreSQL local con el límite (10 min justos sí, 9 min 59 s no) | ✅ |
| HU-01.5 | API: la respuesta de SISVIA y el resuelto, 1 correo a quien escribió | ✅ |
| HU-01.6 | la prueba en Gmail, después del push | ⏳ esperando a Martín |
| HU-02.1-3 | API: todo el equipo, solo quien respondió, a los demás si él apagó los suyos · tests | ✅ |
| HU-03.1 | ventana: la Administradora de TST A y Martín la ven; el Coordinador no | ✅ |
| HU-03.2 | ventana y API: se guarda al tocarlo, sin contraseña, con los dos textos exactos; sigue igual al recargar · tests | ✅ |
| HU-03.3 | API: apagado, sin correo y con campanita | ✅ |
| HU-03.4 | API: 403 con el texto exacto; un valor inválido, 400 · test | ✅ |
| RN-01 a RN-04 | API: abrir, responder y escribir cuentan como verla; nadie recibe lo suyo; campanita igual; con el correo apagado no sale nada | ✅ |
| CB-01 | PostgreSQL local con dos sesiones a la vez (la segunda esperó y reclamó 0) · API: un solo envío | ✅ |
| CB-02 | test · PostgreSQL local: liberar deja volver a reclamar | ✅ |
| CB-03 | PostgreSQL local · API: la primera novedad manda 1 | ✅ |
| CB-04 · CB-05 | API · tests | ✅ |
| CB-06 | PostgreSQL local · API | ✅ |
| La migración en producción | la corrió Martín (2026-09-27); la llave pública no puede llamar las funciones | ✅ |
| Lo que ya funcionaba | `pc-hu18` 51 de 51 · ventana: Soporte (escribir, abrir, responder: un solo correo) y Mi perfil | ✅ |
| Cláusulas | CL-09 (RLS y permisos, comprobados en Supabase) · CL-13 · CL-04, CL-06 (tokens y su .css) · CL-07 (0 fallas en claro y oscuro) · CL-02 (y los títulos de Soporte corregidos) | ✅ |

**Estado:** sin sellar: falta HU-01.6, la prueba de Martín en su Gmail después del push.

## 8. Enmiendas

| N | Fecha | Qué cambió | Motivo (pedido textual) | Obligaciones afectadas | Firma |
|---|---|---|---|---|---|
