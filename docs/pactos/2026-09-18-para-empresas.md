---
pacto: para-empresas
nivel: 2          # 1 = ficha · 2 = SRS
estado: sellado   # borrador → firmado (al firmar) → en tandas (1.ª tanda) → sellado (al sellar)
creado: 2026-09-18
---

# Pacto · SISVIA para empresas

> **Dónde quedamos**
> 2026-09-25 · Última: **Pacto sellado** (intento 2 · 17 pruebas por API y 405 comprobaciones, suite 151 de 151, la ventana de los dos lados; detalle en el diario)
> Sigue: el push de Martín (commit sugerido en la tanda 19) y después borrar `ORG_NOMBRE` y `VITE_ORG_NOMBRE` de Railway y Cloudflare
> Bloqueos: ninguno

## 1. Qué y por qué

**Pedido (textual):** "vamos a separarlos ahora y es lo siguiente se sigue dejando los mismos roles pero ahora todo cambiara, se empezara a dejar para empresas entonces tambien toca ajustarlo para que quede para empresas" · y para arrancar: "inicie".

Todo lo demás: ver **SRS §1** (problema, objetivo, objetivos medibles y alcance) y **SRS 3.N** (lo que queda afuera).

## 2. Qué entra y cómo se prueba

**Entran:** HU-01 a HU-20, CB-01 a CB-25 y RNF-01 a RNF-11 de `docs/SRS.md` (versión 2.6, con las enmiendas del 2026-09-19, 2026-09-21 y 2026-09-22).

**Cómo se prueba:**
- `[test]` = `node --test` en `backend/` sobre las reglas puras (filtro de empresa, límites, roles según sedes, catálogo efectivo).
- `[api]` = script contra la API local con **dos empresas de prueba** (`TST A`, `TST B`) y sus usuarios `@sisvia.test`, que se borran al terminar. Es un `[test]` que necesita el backend corriendo.
- `[ventana]` = en la ventana real, con `navegador-visible`.
- `[Martín]` = lo hace Martín: correr la migración en producción y probar después del push.

| Criterio | Cómo se prueba |
|---|---|
| HU-01.1 | [ventana] |
| HU-01.2 | [api + ventana] |
| HU-01.3 | [api] · correo y cédula repetidos |
| HU-01.4 | [api] |
| HU-01.5 | [ventana] |
| HU-02.1 | [ventana] |
| HU-02.2 | [test + api] · límite 3, con 2 (se permite) y con 3 (se rechaza, texto exacto) |
| HU-02.3 | [test + api] · límite de vehículos, texto exacto |
| HU-02.4 | [test] · N−1 se permite, N se rechaza |
| HU-02.5 | [ventana] |
| HU-03.1-2 | [api + ventana] · texto exacto en el login |
| HU-03.3 | [ventana] |
| HU-03.4 | [api] |
| HU-04.1-3 | [api] · abrir el `.zip` y contar archivos y filas |
| HU-05.1-4 | [api + ventana] · textos exactos; después de borrar, 0 filas de esa empresa en cada tabla |
| HU-06.1-2 | [api] · todas las rutas de listado y detalle con usuarios de A pidiendo cosas de B (RNF-04) |
| HU-06.3 | [api] |
| HU-06.4 | [api] |
| HU-06.5 | [test] · a quién se le arma el aviso |
| HU-06.6 | [ventana] · se cumple con HU-16 |
| HU-07.1-5 | [test] sobre una copia local de la base (conteos antes y después) + [Martín] en producción |
| HU-08.1,4 | [ventana] |
| HU-08.2 | [ventana] · PDF abierto en la ventana; Word revisado por dentro |
| HU-08.3 | [test] · el correo armado lleva el nombre de la empresa |
| HU-09.1 | [ventana] |
| HU-09.2 | [ventana] |
| HU-09.3 | [api] |
| HU-09.4 | [api + ventana] |
| HU-10.1-3 | [test + ventana] |
| HU-11.1-2 | [ventana] |
| HU-12.1 | [api] |
| HU-12.2 | [ventana] |
| HU-12.3 | [api] |
| HU-13.1-2 | [api] · A crea, B no lo ve |
| HU-13.3-4 | [api] |
| HU-13.5 | [ventana] |
| HU-14.1-3 | [test + api] |
| HU-15.1-3 | [test] sobre RN-07 + [ventana] con un chequeo de A |
| HU-16.1,4 | [ventana] · texto exacto de la franja |
| HU-16.2-3 | [api + ventana + Martín] · con contraseña buena y mala; la acción aparece en el registro. Claude llega hasta el pedido y lo cancela; la contraseña la escribe Martín (enmienda 4) |
| HU-16.5 | [api + ventana] · 5 contraseñas malas por API; en la ventana, el modal con el bloqueo y "Confirmar" deshabilitado |
| HU-17.1 | [api] · texto exacto, sin nombre de la otra empresa |
| HU-17.2-4 | [api + ventana] |
| HU-18.1-3 | [test + api + ventana] · rol que escribe, adjunto de 5 MB y de 5 MB + 1 byte, textos exactos, los datos que se llenan solos |
| HU-18.4-7 | [ventana] · con los dos lados: el Administrador de TST A escribe y el superadmin responde |
| HU-18.8 | [api] · A no ve los mensajes de B |
| HU-18.9 | [ventana] · el aviso de límite y el de la placa |
| HU-18.10 | [api + ventana] · con una empresa de prueba sin Administrador |
| HU-19.1-3 | [test + api + ventana] · el texto de cada acción; lo de la empresa y lo del equipo SISVIA; lo ya registrado desde antes |
| HU-19.4 | [ventana] · cada filtro y "Ver más" |
| HU-19.5-6 | [api] · otros roles y otra empresa; no hay ruta para editar ni borrar |
| HU-20.1-3 | [api + ventana] · con la cuenta de prueba marcada como dueña; otro Administrador general no lo ve |
| HU-20.4 | [test + api + ventana] · desactivar, eliminar y cambiar el rol del dueño, también él mismo |
| HU-20.5 | [api + ventana + Martín] · dar la marca: Claude llega hasta el pedido de contraseña; la escribe Martín (enmienda 4) |
| HU-20.6 | [api] · pasarle la mía |
| HU-20.7 | [test + api] · quitarse la propia; el último no puede (también en el PostgreSQL local, con varios a la vez) |
| HU-20.8 | [api] · los avisos de la campanita (enmienda 8) |
| HU-20.9 | [Martín] · corre la instrucción de su marca |
| CB-01 · HU-04 | [api] · cortar la descarga a la mitad |
| CB-02 · HU-02 | [test] |
| CB-03 · HU-13 | [api + ventana] |
| CB-04 · HU-14 | [api] |
| CB-05 · HU-12 | [api] |
| CB-06 · HU-07 | [test] sobre la copia local |
| CB-07 · HU-05 | [api] |
| CB-08 · HU-13 | [api] · texto exacto |
| CB-09 · HU-01 | [api] · y comprobar que no quedó nada a medias |
| CB-10 · HU-02 | [test] · 0, −1, 2.5 y 1 |
| CB-11 · HU-03 | [ventana] |
| CB-12 · HU-10 | [api] |
| CB-13 · HU-09 | [api] |
| CB-14 · HU-01 | [api] · dos pedidos a la vez |
| CB-15 · HU-06 | [test] |
| CB-16 · HU-08 | [ventana] a 360 px |
| CB-17 · HU-09 | [test + api] · eliminar, desactivar y cambiar de rol al último; con dos, sí |
| CB-18 · HU-18 | [test] · la subida falla y no queda mensaje |
| CB-19 · HU-18 | [api] · se desactiva al autor y la respuesta les llega a los otros Administradores |
| CB-20 · HU-18 | [api] · la empresa se desactiva y sus mensajes siguen en la bandeja |
| CB-21 · HU-18 | [api] · el `.zip` los trae y, tras eliminar la empresa, quedan 0 mensajes y 0 adjuntos suyos |
| CB-22 · HU-20 | [test + api] · cuenta desactivada y cuenta que no es Administrador general |
| CB-23 · HU-20 | [api] · dos traspasos a la vez |
| CB-24 · HU-19 | [api] · se elimina a una persona que tenía actividad |
| CB-25 · HU-19 | [api] · tras eliminar la empresa, 0 registros de su gente en la actividad; lo del equipo SISVIA en ella sigue en el registro del equipo con su nombre, junto con su eliminación |
| RNF-01 | [api] con 150 vehículos de prueba |
| RNF-02 | [api] con 150 vehículos y 1.000 chequeos de prueba |
| RNF-03 | revisión del código + [test] del filtro |
| RNF-04 | [api] (el mismo script de HU-06.1-2) |
| RNF-05 | [api] · la acción aparece en el registro |
| RNF-06 | revisión del esquema |
| RNF-07 | [ventana] · medidor de contraste y tamaños en las pantallas nuevas |
| RNF-08 | [ventana] |
| RNF-09 | [test] sobre la copia local, midiendo el tiempo |
| RNF-10 | [api] · otra empresa → 404; sin sesión → 401 |
| RNF-11 | [api] con 10.000 registros de prueba |

## 3. Criterios de terminado

Ver **SRS Anexo A**. Se tildan recién en el intento de sello que sella.

## 4. Aclaraciones y firma

| Fecha | Duda | Propuesta | Respuesta |
|---|---|---|---|
| 2026-09-18 | Enmendar CL-02 y agregar CL-13 | Aprobar las dos | Aprobadas |
| 2026-09-18 | ¿El superadmin ve los datos de las empresas? | Sí, todo, con un selector de empresa | Sí, **entrando a cada empresa** y viendo sus módulos, *"tanto por seguridad como por seguimiento y posibles ajustes o actualizaciones"*. Se suma verificación y registro de lo que haga adentro → HU-16, RN-11 |
| 2026-09-18 | Placa única | Dentro de la empresa | **En todo SISVIA.** Si un vehículo se vende, el nuevo dueño se comunica con SISVIA, que investiga y lo resuelve con verificación de quién lo hizo → HU-17, RN-10 |
| 2026-09-18 | ¿Quién crea sedes? | Superadmin y Administrador de empresa | La cantidad la pone el superadmin al registrar la empresa (editable); las sedes las crean los administradores de la empresa dentro del límite; el superadmin también, pero con verificación |
| 2026-09-18 | ¿Baja por traspaso o borrado? | Baja por traspaso | **Baja**. *"ya poray despues de un año o dos ya se podrian eliminar"*, con confirmación de la empresa anterior, y compartir el historial con la empresa nueva: queda para un pacto futuro con política de datos (SRS 3.N) |
| 2026-09-18 | Datos de la empresa · respaldo de 30 días · nombre de categoría repetido · varios Administradores de empresa | Las cuatro propuestas | Aceptadas las cuatro |
| 2026-09-18 | Nombre de la empresa inicial | "Empresa de prueba SISVIA" o "Mi organización" | **"SISVIA"**: *"que se llame sisvia al final ese nombre me gusto y podemos usarlo si no hay ya ninguna ya ocupando ese nombre para cuando se haga la empresa oficial"* |
| 2026-09-18 | Cuándo se sube a producción (después de firmar) | Push por tanda | **Todo junto al final del pacto**: *"el push no lo vamos a hacer hasta que ya finalizemos todo ... mientras en produccion quedara lo anterior"*. La migración ya corrida es compatible con lo que está en producción. |
| 2026-09-19 | Enmienda 1 · ¿bajar un límite por debajo de lo activo? | No dejarlo | **No dejarlo**, con el texto de CB-02 |
| 2026-09-19 | Enmienda 2 · ¿qué se bloquea sobre el último Administrador de empresa? | Eliminar, desactivar y cambiar el rol | **Las tres** |
| 2026-09-19 | ¿Desde dónde se bloquea lo base a una empresa (HU-14.1 dice "la ficha")? | — | Desde el **catálogo, entrando a la empresa**: *"si adentro se pueden desactivar a las empresas solo dentro de la empresa se desactivaria o activaria"*. La ficha es la puerta ("Entrar a la empresa") y su historial muestra cada bloqueo. No cambia el qué. |
| 2026-09-19 | Enmienda 5 · ¿quién le escribe a SISVIA? · ¿SISVIA responde en la app? · ¿cuándo? | Solo el Administrador de empresa · sí, con estados · pacto propio después del sello | **Solo el Administrador de empresa** · **sí, con estados y respuesta** · **ahora, en este pacto**: *"que todo quede ahora no importa si el push se demora eso es lo de menos"* |
| 2026-09-19 | Enmienda 5 · ¿dónde va el botón? · ¿hilo o una sola respuesta? | Barra de arriba · hilo | **Barra de arriba** · **hilo** |
| 2026-09-21 | Enmienda 6 · ¿rol nuevo para el dueño? · ¿la empresa ve lo que hizo SISVIA? · ¿quién ve la Actividad? | Marca en la cuenta · sí · solo el Administrador de empresa | **Marca "Dueño" en la cuenta** (Martín preguntó cómo se identifica y qué pasa si cambia de dueño: marca única en la base, visible en su perfil, y traspaso) · **sí** · **solo el Administrador de empresa** |
| 2026-09-22 | CB-25 · al eliminar una empresa, ¿se borra también lo que hizo el equipo SISVIA en ella? | Queda en el registro del equipo (para que nadie borre sus rastros eliminándola) | **Queda en el Registro** (OK de Martín; historia Should: sin volver a firmar; SRS 2.4) |
| 2026-09-21 | Enmienda 6 · ¿cómo se cambia de dueño? · ¿chequeos en la Actividad? · ¿lo ya registrado? | Desde la app, solo el dueño · no · sí | **Desde la app, solo el dueño** · **no** · **sí** |
| 2026-09-19 | Prueba de HU-16 por Martín | — | *"si funciona pero seria bueno que despues de los 5 fallos pues igual se bloquee como esta ahorita y a la vez el boton de confrmar se desabilite"* → HU-16.5 |
| 2026-09-25 | Sello · seis textos en voseo (tres de este pacto, tres de la suplencia), ¿pasan al tuteo? | Los seis | **Los seis** (texto, sin cambio de criterios ni de comportamiento) |
| 2026-09-25 | Este pacto es de antes del diario (pacto-skill 1.1): ¿se muda al diario la evidencia de las tandas 1 a 18 (tablas PC-HU y hallazgos de la sección 6)? | Sí, en un chat aparte, sin tocar lo pactado | *pendiente · no frena nada: el pacto ya está sellado* |

**Firma:** Martín · 2026-09-18 (SRS 2.0) · enmiendas 1 a 4: Martín · 2026-09-19 (SRS 2.1) · enmienda 5: Martín · 2026-09-19 (SRS 2.2) · enmienda 6: Martín · 2026-09-21 (SRS 2.3)

---

## 5. Obligaciones

**Plan corto:**
- **Base de datos:** migración nueva `database/migrations/2026-09-18_empresas.sql` (tabla `empresas`, `empresa_id` donde corresponde, rol `admin_empresa`, catálogo base/propio, bloqueos, baja de vehículos, registro de acciones, empresa inicial "SISVIA") y su reflejo en `database.sql` e `INSTALAR_TODO.sql`. Se prueba en un PostgreSQL local desechable (puerto 55432) antes de dársela a Martín.
- **Backend:** `services/scope.service.js` (la empresa como primer nivel del filtro), `services/jerarquia.service.js` (rol nuevo), el middleware de auth (empresa desactivada, superadmin dentro de una empresa), rutas nuevas `routes/empresas.routes.js`, y cambios en vehículos, usuarios, sedes, catálogo, chequeos, dashboard, notificaciones, vencimientos y exportaciones. Reglas puras nuevas en `services/` con sus tests.
- **Frontend:** módulo Empresas (lista, formulario, ficha), franja "Estás viendo…", nombre de la empresa en menú y pie, catálogo con base/propio, roles según sedes, y los mensajes nuevos.

**Cláusulas que aplican:**
- **CL-13** → el filtro de empresa vive en un solo lugar (`scope.service.js`); ninguna ruta filtra `empresa_id` a mano. Las rutas nuevas también lo usan.
- **CL-02** (enmendada) → el nombre de la organización sale de la empresa del usuario; `ORG_NOMBRE` deja de leerse.
- **CL-09** → las tablas nuevas nacen con RLS activo, sin políticas.
- **CL-10** → la confirmación con contraseña del superadmin (HU-16) usa `crearClienteAuth()`.
- **CL-01** → la migración y todo el git los hace Martín. Orden: migración en producción → push del código.
- **CL-04, CL-06, CL-07, CL-08** → las pantallas nuevas con tokens, CSS por componente, contraste y toques medidos.

**Base**

- [x] OB-01 · base · RNF-06 · Migración `2026-09-18_empresas.sql`: tabla `empresas` (nombre único, NIT, ciudad, teléfono, correo, límites, activa, último respaldo), `empresa_id` en sedes, usuarios, vehículos, chequeos, intentos bloqueados, notificaciones y suplencias; rol `admin_empresa`; `empresa_id` opcional en categorías, ítems y preguntas (vacío = base); tabla de bloqueos; baja de vehículos (fecha, motivo, quién); tabla de registro de acciones sobre empresas; placa única entre vehículos no dados de baja; RLS activo en lo nuevo. Mismo cambio en `database.sql` e `INSTALAR_TODO.sql`.
- [x] OB-02 · HU-07.1-5 · CB-06 · RNF-09 · En la misma migración: empresa inicial "SISVIA", todo lo existente a ella, límites iguales a lo activo, superadmin sin empresa. Probarla en un PostgreSQL local desechable con una copia de los datos: conteos antes = después y tiempo.
- [x] OB-03 · RNF-03 · CL-13 · `scope.service.js`: la empresa como primer nivel (`obtenerScope` y `aplicarScope`), superadmin fuera (global de SISVIA) o dentro de una empresa; tests puros del filtro.
- [x] OB-04 · RNF-04 · Script `[api]` de aislamiento con dos empresas de prueba que recorre todas las rutas de listado y detalle, y limpia al terminar. Se usa en cada punto de control. *(`backend/scripts/probar-aislamiento.mjs`; además prueba la suplencia y los avisos entre empresas.)*

**HU-06 · Must**

- [x] OB-05 · HU-06.1-3 · Aplicar el filtro de empresa en todas las rutas: vehículos, usuarios, sedes, chequeos, intentos, notificaciones, dashboard y exportaciones; pedir algo de otra empresa responde "No encontrado".
- [x] OB-06 · HU-06.4-5 · CB-15 · Suplencias solo con sedes de la misma empresa; avisos de la campanita y correos de vencimientos solo a usuarios de la empresa. Regla pura de destinatarios con test.
- [x] **PC-HU-06** · suite completa + HU-06.1-5 + CB-15 + RNF-03, RNF-04 + CL-13

**HU-07 · Must**

- [x] OB-07 · HU-07.1-5 · Entregar a Martín la migración probada, con los pasos y la consulta de conteos para comparar en producción.
- [x] **PC-HU-07** · HU-07.1-5 + CB-06 + RNF-09 (local) · [Martín] corre la migración en producción

**HU-09 · Must**

- [x] OB-08 · HU-09.1-3 · CB-13 · Rol `admin_empresa` en `jerarquia.service.js` (entre superadmin y Director Regional), etiqueta "Administrador de empresa", qué roles puede crear, y su menú.
- [x] OB-09 · HU-09.4 · Sedes: las crea el Administrador de empresa (y el superadmin dentro de la empresa) con la geografía compartida.
- [x] OB-27 · CB-17 · La empresa nunca queda sin Administrador de empresa activo: eliminar, desactivar o cambiarle el rol al último se rechaza con el texto exacto (regla pura con test). *Nueva por la enmienda 2.*
- [x] **PC-HU-09** · suite completa + HU-09.1-4 + CB-13 + CB-17 · *destildado por la enmienda 2 y vuelto a pasar el 2026-09-19*

**HU-01, HU-02, HU-03 · Must**

- [x] OB-10 · HU-01.1-5 · CB-09 · CB-14 · Rutas `/api/empresas`: listar y crear la empresa con su Administrador en una sola operación (si algo falla, no queda nada a medias); nombre, correo y cédula repetidos con sus textos exactos.
- [x] OB-11 · HU-02.1-4 · CB-02 · CB-10 · Regla pura de límites (con tests N−1, N, 0, −1, 2.5) y su uso al crear y reactivar sedes y vehículos, con los textos exactos. **Reabierta por la enmienda 1 (2026-09-19):** CB-02 ya no deja bajar el límite por debajo de lo activo; Hecho el 2026-09-19: `limiteBajoUso` con su test.
- [x] OB-12 · HU-02.5 · El panel del Administrador de empresa muestra el uso de sus límites.
- [x] OB-13 · HU-03.1-4 · CB-11 · Desactivar y reactivar; el login y cada pedido rechazan a usuarios de una empresa desactivada con el texto exacto.
- [x] OB-14 · HU-01.1-2 · HU-02.1 · RNF-05 · RNF-07 · RNF-08 · Frontend del módulo Empresas (lista, formulario, ficha) y registro de las acciones del superadmin.
- [x] **PC-HU-01**, **PC-HU-03** · suite completa + sus criterios + CB-09, CB-11, CB-14 + RNF-05, RNF-07, RNF-08
- [x] **PC-HU-02** · suite completa + HU-02.1-5 + CB-02 (texto nuevo) + CB-10 · *destildado por la enmienda 1 y vuelto a pasar el 2026-09-19*

**HU-16 · Must**

- [x] OB-15 · HU-16.1,4 · "Entrar a la empresa": el superadmin elige una empresa, el backend la usa en el filtro y el frontend muestra la franja con el texto exacto.
- [x] OB-16 · HU-16.2-3 · RN-11 · Confirmar con contraseña (con `crearClienteAuth()`) todo lo que el superadmin cambia dentro de una empresa, y registrarlo.
- [x] OB-28 · HU-16.5 · Tras 5 contraseñas malas, la confirmación responde el bloqueo con su propio código y el modal muestra el texto y deshabilita "Confirmar". *Nueva por el pedido de Martín en la ronda del 2026-09-19.*
- [x] **PC-HU-16** · suite completa + HU-16.1-5 + RN-11 + CL-10 · HU-16.2-3 con la parte de Martín ✅ (2026-09-19: *"si funciona"*)

**HU-08 · Must**

- [x] OB-17 · HU-08.1-4 · CB-16 · CL-02 · El nombre de la empresa en la cabecera del menú, el pie, los PDF, los Word y los correos; "SISVIA" para el superadmin; `ORG_NOMBRE` deja de usarse.
- [x] **PC-HU-08** · suite completa + HU-08.1-4 + CB-16 + CL-02

**HU-12, HU-13, HU-15 · Must**

- [x] OB-18 · HU-12.1,3 · HU-13.1-4 · CB-03 · CB-05 · CB-08 · Rutas del catálogo con base y propio: lo base solo lo cambia el superadmin (texto exacto); lo propio, el Administrador de empresa; lo usado se apaga, lo no usado se puede borrar; nombre de categoría repetido con su texto exacto.
- [x] OB-19 · HU-15.1-3 · CB-04 · RN-07 · Regla pura del catálogo efectivo (base − bloqueos + propio, por tipo de vehículo y excepciones) con tests, usada al iniciar el chequeo y la aptitud.
- [x] OB-20 · HU-12.2 · HU-13.5 · Frontend del catálogo: "Base" sin edición, lo propio editable por el Administrador de empresa, solo lectura para Director Regional y Coordinador.
- [x] **PC-HU-12**, **PC-HU-13**, **PC-HU-15** · suite completa + sus criterios + CB-03, CB-04, CB-05, CB-08

**Should**

- [x] OB-21 · HU-10.1-3 · CB-12 · Regla pura de roles según sedes (con tests) y su uso al crear usuarios.
- [x] **PC-HU-10** · suite completa + HU-10.1-3 + CB-12
- [x] OB-22 · HU-11.1-2 · "Usuarios" del superadmin muestra solo al equipo SISVIA; los de cada empresa, desde su ficha o entrando a ella.
- [x] **PC-HU-11** · suite completa + HU-11.1-2
- [x] OB-23 · HU-14.1-3 · Bloqueos de elementos base por empresa (rutas y ficha de la empresa).
- [x] **PC-HU-14** · suite completa + HU-14.1-3 + CB-04
- [x] OB-24 · HU-17.1-4 · RN-10 · Placa única en todo SISVIA con el texto exacto (sin nombrar a la otra empresa) y baja por traspaso con contraseña, motivo y registro.
- [x] **PC-HU-17** · suite completa + HU-17.1-4
- [x] OB-25 · HU-04.1-3 · CB-01 · RNF-02 · "Exportar todo" en `.zip` (CSV + PDF de cada chequeo) y "Último respaldo".
- [x] **PC-HU-04** · suite completa + HU-04.1-3 + CB-01 + RNF-02
- [x] OB-26 · HU-05.1-4 · CB-07 · Eliminar empresa: solo desactivada, con respaldo de 30 días o menos y el nombre exacto; borra todo lo suyo, sus accesos y sus fotos.
- [x] **PC-HU-05** · suite completa + HU-05.1-4 + CB-07

**HU-18 · Should** · *nueva por la enmienda 5*

- [x] OB-29 · HU-18.3 · RN-13 · RNF-06 · Migración `2026-09-19_buzon.sql`: el mensaje (empresa, autor, tipo, estado, pantalla, navegador, adjunto) y sus respuestas, con RLS activo y borrado en cascada con la empresa; su reflejo en `database.sql` e `INSTALAR_TODO.sql`. Se prueba en el PostgreSQL local; la corre Martín.
- [x] OB-30 · HU-18.1-3,5,6,8 · RN-12 · RN-13 · CB-18 · CB-19 · CB-20 · Regla pura del buzón (quién escribe, adjunto válido con 5 MB y 5 MB + 1 byte, estados, a quién se avisa) con tests, y rutas `/api/buzon` (escribir, listar, ver, responder, resolver) con avisos a la campanita y copia por correo.
- [x] OB-31 · RNF-10 · CB-18 · Adjuntos privados en Cloudinary, que se abren por una ruta con sesión que comprueba que el usuario ve ese mensaje.
- [x] OB-32 · HU-18.1,3-9 · RNF-07 · Frontend: "Escribir a SISVIA" en la barra de arriba (Administrador de empresa); página "Soporte" para los dos lados, con hilo, estados, filtro y el número de nuevos en el menú; "Ver en la empresa"; el atajo desde el aviso de límite y el de la placa.
- [x] OB-33 · HU-18.10 · El informe que cae en el equipo SISVIA no ofrece ni arma el resumen del área.
- [x] OB-34 · CB-21 · Los mensajes y sus adjuntos van en "Exportar todo" (OB-25) y se borran al eliminar la empresa (OB-26).
- [x] **PC-HU-18** · suite completa + HU-18.1-10 + CB-18-21 + RNF-10 + RNF-07

**HU-19 y HU-20 · Should** · *nuevas por la enmienda 6*

- [x] OB-35 · HU-19.2 · HU-20.6 · RN-14 · RN-15 · CB-23 · Migración `2026-09-21_actividad_y_dueno.sql`: la tabla de actividad (empresa, quién con su nombre y cargo, si es del equipo SISVIA, tipo, acción, sobre qué, detalles, cuándo; índices por empresa y fecha), la copia de lo ya registrado (vehículos, usuarios y equipo SISVIA), la marca `es_dueno` (una sola posible; con la enmienda 7 pasan a ser varias) y la función de traspaso en una sola operación, sin permiso para las llaves públicas; su reflejo en `database.sql` e `INSTALAR_TODO.sql`. Se prueba en el PostgreSQL local; la corre Martín, y después la instrucción de su marca.
- [x] OB-36 · HU-19.1-3,6 · HU-20.1 · CB-24 · Regla pura de la actividad (cada acción en palabras, qué se refleja de lo del equipo SISVIA sin repetir, filtros) con tests, y un solo `registrarActividad` que escriben vehículos, usuarios, sedes, catálogo propio y el equipo SISVIA, sin dejar de escribir los registros que ya existen.
- [x] OB-37 · HU-19.4-5 · HU-20.1-2 · RNF-11 · Rutas de la Actividad de la empresa y del Registro del equipo, con filtros y de a 50.
- [x] OB-38 · HU-20.3-5 · RN-15 · CB-22 · CB-23 · El dueño: la marca en el perfil, la protección de su cuenta (texto exacto) y el traspaso con contraseña y nombre (regla pura con tests).
- [x] OB-39 · HU-19.1,4 · HU-20.1,3,5 · RNF-07 · Frontend: "Actividad" (menú del Administrador de empresa y del equipo SISVIA adentro), "Registro del equipo" (menú del dueño), la marca en el perfil y en Usuarios, sin acciones sobre la cuenta del dueño, y el traspaso.
- [x] OB-40 · CB-25 · Eliminar empresa (HU-05) borra también la actividad de su gente; lo del equipo SISVIA queda en el registro del equipo con su nombre (ajuste del 2026-09-22).
- [x] **PC-HU-19** · suite completa + HU-19.1-6 + CB-24 + CB-25 + RNF-11
- [x] OB-41 · HU-20.5-7 · RN-15 · CB-23 · Migración `2026-09-22_varios_duenos.sql`: se puede tener más de un dueño (se va la regla de "uno solo"), y en vez del traspaso van tres operaciones de la base, cada una en un solo paso y anotada en el registro: dar la marca, pasarla y quitarse la propia (la última bloquea a los demás dueños mientras decide, para que nunca quede ninguno). Su reflejo en `database.sql` e `INSTALAR_TODO.sql`. Se prueba en el PostgreSQL local; la corre Martín.
- [x] OB-42 · HU-20.5-7 · CB-22 · RN-15 · Reglas puras del dueño reescritas (dar, pasar, quitarse; nadie le quita la marca a otro; textos exactos) con tests, y sus rutas.
- [x] OB-43 · HU-20.3,5-7 · Frontend: en "Mi perfil", quiénes son los dueños y los tres botones ("Dar la marca…", "Pasarle la mía…", "Quitarme la marca"), cada uno con contraseña y nombre exacto.
- [x] OB-44 · HU-19.1 · En la Actividad y el Registro del equipo, quién lo hizo va primero y en negrita, y debajo qué hizo.
- [x] OB-45 · HU-20.8 · La campanita avisa cuando la marca cambia (a quien la recibe y a los demás dueños), sin frenar la respuesta si el aviso falla.
- [x] OB-46 · HU-20.3 · base · Guardar el perfil ya no borra de la pantalla lo que no se edita ahí (la marca de dueño, el pool y la suplencia): la respuesta los trae y el frontend completa en vez de reemplazar.
- [x] OB-47 · base · Mi perfil (fuera de las historias, pedido de Martín el 2026-09-23): sin cambios de verdad "Guardar cambios" queda apagado y el servidor lo rechaza (*"No hay cambios para guardar."*); con cambios aparece "Tu contraseña, para confirmar los cambios" y el servidor la verifica con el mismo contador que el login (*"Escribe tu contraseña para guardar los cambios."*). Solo se escriben los campos que cambiaron. Regla pura `perfilReglas.js` con tests.
- [x] **PC-HU-20** · suite completa + HU-20.1-9 + CB-22 + CB-23 · 2026-09-24: 39 de 39 por API (varios dueños), 16 de 16 (avisos y el bug del perfil), pantallas en la ventana, y la prueba de Martín con su contraseña: el 2026-09-23 03:27 le dio la marca a «segundo al mando» desde Mi perfil (queda en el registro del equipo). HU-20.9: Martín corrió su marca el 2026-09-22
- [x] OB-48 · incumple RNF-03 (sello, intento 1) · Doce consultas armaban el filtro de empresa a mano (`.eq('empresa_id', …)` en usuarios, empresas, catálogo, bloqueos, eliminar empresa, alcance y la Actividad) y el catálogo tenía la regla "base o de la empresa" copiada en dos archivos. Ninguna filtraba de más, pero la regla es que todas pasen por el filtro único. Ahora todas usan `deLaEmpresa` o `baseODeLaEmpresa` (nueva, en `scopeReglas.js`, con el id validado antes de entrar al filtro de texto), con tests.

**Revisión antes de construir:** pasó, con hallazgos.

- Cada historia Must tiene obligaciones y punto de control. Los 16 casos borde y los 9 RNF tienen al menos una obligación que los cita. No quedan dudas abiertas. Las RN citadas existen.
- **Cómo se abren los `[ventana]`:** backend `npm run dev` en `backend/` (3001) y frontend `npm run dev` en `frontend/` (5173), con las empresas de prueba del script de OB-04 y sesiones abiertas por enlace mágico (sin escribir contraseñas).
- **Hallazgo · orden de despliegue:** el código nuevo necesita las columnas nuevas. Si se sube antes de la migración, producción se cae. Orden: Martín corre la migración → recién después hace push.
- **Hallazgo · el superadmin cambia de comportamiento:** hoy ve todo mezclado (su alcance es "global"). Con HU-16, fuera de una empresa ve Empresas, Usuarios del equipo, catálogo base y geografía; los módulos operativos, solo entrando a una empresa.
- **Hallazgo · el catálogo hoy lo edita el Coordinador de sede** (`Sidebar.jsx` lo muestra a `admin` y `admin_sede`, y el backend lo deja a cualquier admin). Con HU-12 y HU-13 eso cambia; el Coordinador pasa a solo lectura.
- **Hallazgo · pruebas con la base real:** las `[api]` crean empresas `TST A` y `TST B`; mientras duran, el superadmin de producción las ve en su lista. Se borran al terminar cada punto de control.
- **Riesgo:** es el cambio más grande del proyecto. Por eso las tandas van de a una historia y cada punto de control corre el script de aislamiento completo, no solo lo nuevo.

**Revisión de la enmienda 5 (2026-09-19):** pasó, con hallazgos.

- HU-18 tiene obligaciones y punto de control; CB-18 a CB-21 y RNF-10 tienen cada uno una obligación que los cita; RN-12 y RN-13 están en el SRS. Sin dudas abiertas. Los `[ventana]` se abren igual que el resto.
- **Hallazgo · nombre:** "soporte" ya lo usa HU-16 en el código (`soporteReglas.js`, `soporte.service.js`, `FranjaSoporte`: el superadmin dentro de una empresa). El módulo nuevo se llama **buzón** en el código (`buzonReglas.js`, `/api/buzon`); en pantalla sigue siendo "Soporte" y "Escribir a SISVIA".
- **Hallazgo · avisos:** `notificaciones.tipo` no tiene lista cerrada en la base, así que los avisos nuevos no necesitan migración.
- **Hallazgo · adjuntos:** las fotos del chequeo se suben con `multer` en memoria y Cloudinary en modo público. RNF-10 pide el modo privado (`authenticated`) y una ruta propia que los sirva con sesión.
- **Hallazgo · HU-18.10:** una empresa nueva siempre nace con su Administrador y CB-17 no deja quitar el último. Para probar la empresa sin Administrador, el script lo borra directo en la base (solo en `TST A`).
- **Orden:** la migración de OB-29 la corre Martín antes de que se pruebe cualquier cosa de HU-18, igual que las anteriores.

## 6. Tandas

| # | Fecha | Obligaciones | Punto de control | Commit sugerido |
|---|---|---|---|---|
| 1 | 2026-09-18 | OB-01, OB-02, OB-03 (OB-04 escrito, sin correr) | Sin punto de control propio. Suite: 33 de 33 tests. Migración probada en un PostgreSQL local con una copia de producción | `Empresas: migración compatible y filtro de empresa en el scope` |
| 2 | 2026-09-18 | OB-04 (primera corrida), OB-05, OB-06, OB-07 | PC-HU-06 ✅ · PC-HU-07 ✅ | `Cada empresa ve solo lo suyo: detalles, avisos, suplencias y altas por empresa` |
| 3 | 2026-09-18 | OB-08, OB-09 | PC-HU-09 ✅ | `Administrador de empresa: rol, menú, sedes y geografía compartida` |
| 4 | 2026-09-19 | OB-10, OB-11, OB-12, OB-13, OB-14 | PC-HU-01 ✅ · PC-HU-02 ✅ · PC-HU-03 ✅ | `Módulo Empresas: alta con su administrador, límites del plan y desactivar` |
| 5 | 2026-09-19 | OB-15, OB-16 | PC-HU-16 ⏳ (todo probado salvo escribir la contraseña en la ventana: lo hace Martín) | `El superadmin entra a una empresa: franja, contraseña en cada cambio y registro` |
| 6 | 2026-09-19 | OB-11 (reabierta), OB-27, OB-28 + avisos al entrar + municipios | PC-HU-02 ✅ · PC-HU-09 ✅ · PC-HU-16 ✅ | `Enmiendas: el plan no baja de lo que se usa, la empresa no queda sin dueño, bloqueo de la contraseña y los 1.122 municipios` |
| 7 | 2026-09-19 | OB-18, OB-19, OB-20, OB-23 (adelantada: Martín pidió el catálogo) | PC-HU-12 ✅ · PC-HU-13 ✅ · PC-HU-15 ✅ · PC-HU-14 ✅ | `Catálogo por empresa: base del superadmin, propio de cada empresa, bloqueos y el chequeo con su foto de ítems` |
| 8 | 2026-09-19 | OB-17 | PC-HU-08 ✅ | `El nombre de cada empresa en la app, los PDF, los Word y los correos; cabecera común en las pantallas de detalle` |
| 9 | 2026-09-19 | OB-21 | PC-HU-10 ✅ | `Roles según la cantidad de sedes: con una sola, solo Conductores` |
| 10 | 2026-09-19 | OB-22 | PC-HU-11 ✅ | `Usuarios del superadmin: afuera, el equipo SISVIA; la gente de cada empresa, desde su ficha` |
| 11 | 2026-09-19 | OB-24 | PC-HU-17 ✅ | `Placa única en todo SISVIA y baja por traspaso con motivo, contraseña y registro` |
| 12 | 2026-09-21 | OB-25 | PC-HU-04 ✅ | `Exportar todo: .zip con los CSV y un PDF por chequeo, en varios hilos, y el último respaldo en la ficha` |
| 13 | 2026-09-21 | OB-26 | PC-HU-05 ✅ | `Eliminar una empresa: desactivada, con respaldo de 30 días y su nombre; se va todo lo suyo, sus accesos y sus fotos` |
| 14 | 2026-09-21 | OB-29 a OB-34 | PC-HU-18 ✅ | `Escribir a SISVIA: buzón con hilo, estados y adjuntos privados; el informe al equipo SISVIA sin resumen` |
| 15 | 2026-09-22 | OB-35 a OB-40 | PC-HU-19 ✅ (82 de 82 por API, ventana en claro/oscuro/390 px) | `Actividad de la empresa, Registro del equipo y la marca Dueño de SISVIA con su traspaso` |
| 16 | 2026-09-22 | OB-41 a OB-44 (enmienda 7) | PC-HU-20 ✅ el 2026-09-24 (39 de 39 por API, las pantallas en la ventana y la prueba de Martín con su contraseña) | `Varios dueños de SISVIA: dar, pasar y quitarse la marca; en la Actividad, quién lo hizo primero` |
| 18 | 2026-09-23 | OB-47 (pedido de Martín sobre Mi perfil) | 12 de 12 por API y comprobado en la ventana | `Mi perfil: sin cambios no se guarda, y cada cambio pide la contraseña` |
| 17 | 2026-09-22 | OB-45, OB-46 (enmienda 8 + bug del perfil) | 16 de 16 por API y comprobado en la ventana: guardar el perfil ya no tumba la marca | `Avisos de la campanita al cambiar la marca de dueño, y el perfil ya no borra la marca al guardar` |
| 19 | 2026-09-24 | OB-48 (incumple RNF-03, sello intento 1) + textos en voseo al tuteo (2026-09-25, OK de Martín) | RNF-03 ✅ · sello intento 2 ✅ (detalle en el diario) | `Un solo filtro de empresa en todo el backend; textos en tuteo; sello del pacto para empresas` |

**Hallazgos de la tanda 1**

- **La migración es de expansión: se puede correr ya.** Las columnas nuevas traen como valor por defecto la empresa "SISVIA", así el código que está hoy en producción sigue creando sedes, usuarios y vehículos sin conocer las empresas. Probado: el código viejo inserta sin `empresa_id` y todo cae en "SISVIA". Cambia el orden de despliegue: **primero la migración (cuando Martín quiera), después el push**. Al revés sigue siendo un error: el filtro nuevo pide la columna `empresa_id`.
- **Probada sobre una copia de producción** en un PostgreSQL local desechable (puerto 55432): 400 ms, conteos iguales antes y después (5 sedes, 6 usuarios, 1 vehículo, 2 chequeos, 5 categorías, 39 ítems, 5 preguntas), los 2 superadmin quedaron sin empresa, y 22 pruebas de reglas en verde (placa única y su baja, categorías por catálogo, límite ≥ 1, RLS, rol nuevo, superadmin sin empresa). Correrla dos veces no rompe nada.
- **Instalación desde cero:** el bloque de empresas se sumó a `database.sql` y a `INSTALAR_TODO.sql`; se probó una instalación completa en una base vacía (1 empresa, 5 sedes en ella, catálogo y geografía completos) y dos corridas seguidas del instalador.
- **Seed de categorías:** usaba `ON CONFLICT (nombre)`, que dependía de "nombre único en todo el sistema". Pasa a `ON CONFLICT DO NOTHING`.
- **Avisos sin `empresa_id`:** cada aviso tiene un destinatario, y un usuario solo ve los suyos. Filtrarlos por empresa sería repetir lo mismo, así que no se agregó la columna (OB-01 la nombraba).
- **Arreglo de seguridad en el filtro:** el alias viejo `admin` sin sede veía todo el sistema; con varias empresas eso dejaría ver todas. Ahora ve solo su empresa.
- **Proceso:** al armar el instalador, un `replace` de JavaScript convirtió los `$$` de los bloques `DO` en `$`; la prueba de instalación lo detectó y se corrigió.

**PC-HU-06 · 2026-09-18**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 39 de 39 (9 del filtro de empresa, 5 de destinatarios) · `npm run build` · lint 40 = línea base | ✅ |
| HU-06.1 | script de aislamiento: 14 listados con los 4 roles de A; ninguna respuesta contiene nada de B (ids, nombres, placa) | ✅ |
| HU-06.2 | el mismo script: 7 detalles de B (vehículo, usuario, perfil, chequeo y sus 3 exportaciones) responden 404 | ✅ |
| HU-06.3 | las dos empresas en la misma ciudad: el Director Regional de A no ve la sede de B · test `HU-06.3` | ✅ |
| HU-06.4 | el Director Regional de A intenta una suplencia del pool de A en la sede de B → *"Esa sede no esta dentro de tu area."* | ✅ |
| HU-06.5 · CB-15 | aviso real en la sede de B → les llegó a 3 usuarios, todos de B · tests `HU-06.5` y `CB-15` | ✅ |
| RNF-03 · CL-13 | el filtro vive en `scopeReglas.js` (`aplicarScope`, `filtroEmpresa`, `deLaEmpresa`); ningún otro archivo filtra `empresa_id` a mano | ✅ |
| RNF-04 | script de aislamiento en verde | ✅ |

**Hallazgos de la tanda 2**

- **Primera corrida del script:** ningún listado mostraba datos de la otra empresa (el filtro de la tanda 1 ya alcanzaba), pero los detalles respondían 403. No mostraban nada, pero confirmaban que eso existía. Ahora la primera búsqueda por id de 23 funciones filtra por la empresa y lo ajeno da 404.
- **Error viejo que salió a la luz:** `obtenerVehiculoCompleto` usaba `.single()`, que tira error si no encuentra nada, así que un vehículo inexistente daba 500. Pasó a `.maybeSingle()`.
- **Filtración real en los avisos:** todo admin sin sede (Director Regional, superadmin y ahora el Administrador de empresa) recibía los avisos de todas las sedes. Ahora los recibe solo la gente de la empresa del evento. **Cambio visible en producción:** el superadmin (equipo SISVIA) deja de recibir los avisos del día a día de las empresas, incluida "SISVIA"; los reciben los usuarios de cada empresa.
- **Informe al superior:** subía al Director Regional del departamento sin mirar la empresa. Ahora sube dentro de la empresa hasta su Administrador; si la empresa todavía no tiene uno (como "SISVIA" recién migrada), va al equipo SISVIA.
- **Suplencias por departamento:** cubrían las sedes de todas las empresas de ese departamento; ahora solo las de la empresa de la suplencia.
- **Las altas ponen la empresa:** con el valor por defecto de la migración, todo lo creado sin empresa caía en "SISVIA". Ahora usuarios, vehículos, sedes, chequeos, intentos y suplencias la ponen explícita. **Transitorio:** el superadmin fuera de una empresa todavía no tiene dónde elegirla, así que lo que crea queda en "SISVIA" hasta HU-16.
- **Nombre de sede repetido:** se revisaba en todas las empresas; ahora dentro de la empresa.
- **Pendiente para OB-08:** el Administrador de empresa pasa el script sin dificultad porque las rutas de administrador todavía no reconocen su rol (le dan 403 a todo). Al habilitarlo, se vuelve a correr el script.
- **Proceso:** el mismo error de `replace` de la tanda 1, con otro síntoma: el texto de un hallazgo tenía un `$` seguido de una comilla invertida, que en JavaScript significa "pegá acá todo lo anterior", y duplicó medio pacto. Se reconstruyó desde el punto exacto (la copia pegada era una foto vieja del mismo archivo). Desde ahora los reemplazos van con función, que no interpreta los `$`.


**PC-HU-07 · 2026-09-18**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| HU-07.1 | producción, después de la migración de Martín: existe la empresa "SISVIA" y tiene las 5 sedes, el vehículo, los 2 chequeos y los 4 usuarios de empresa | ✅ |
| HU-07.2 | conteos iguales antes y después, en la copia local y en producción | ✅ |
| HU-07.3 | los 2 superadmin quedaron sin empresa | ✅ |
| HU-07.4 | límites de "SISVIA" = lo activo: 5 sedes, 1 vehículo | ✅ |
| HU-07.5 | los 39 ítems, 5 categorías y 5 preguntas quedaron como catálogo base | ✅ |
| CB-06 | en la copia local, los usuarios sin sede quedaron en la empresa como los demás | ✅ |
| RNF-09 | 400 ms en la copia local; en producción la app no se cortó | ✅ |
| [Martín] | corrió la migración en Supabase (2026-09-18) | ✅ |

**PC-HU-09 · 2026-09-18**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 45 de 45 (5 de jerarquía y 1 de área nuevos) · `npm run build` · lint 40 = línea base · script de aislamiento en verde, ahora exigiendo que el Administrador de empresa abra lo suyo | ✅ |
| HU-09.1 | ventana, como Administrador de "TST A": el menú tiene panel, vehículos, usuarios, geografía, catálogo, chequeos, intentos y notificaciones; las 8 pantallas cargan sin error; el cargo dice "Administrador de empresa" | ✅ |
| HU-09.2 | ventana: el formulario de alta ofrece Director Regional, Coordinador de sede y Conductor; nunca superadmin ni Administrador de empresa · test `HU-09.2` | ✅ |
| HU-09.3 · CB-13 | API: crear un superadmin o un Administrador de empresa → 403 *"No tienes permiso para crear ese rol"* · test `HU-09.3 · CB-13` | ✅ |
| HU-09.4 | ventana: ve los 33 departamentos y la pestaña "Sedes" (no "Ciudades"); creó "TST Sede A Norte" en Espinal, Tolima → quedó en su empresa (comprobado en la base) · API: editar la sede de "TST B" → 404 *"Sede no encontrada"* | ✅ |
| Cláusulas | CL-13: la validación de área pasa por `areaFueraDeScope` y el listado de usuarios por `filtroEmpresa` · CL-01: sin git | ✅ |

**Hallazgos de la tanda 3**

- **Los detalles de usuarios negaban al Administrador de empresa:** las consultas que alimentan `usuarioEnScope` no traían `empresa_id`, y sin ese dato la regla niega. Se agregó en las 5 consultas. Lo detectó el control nuevo del script (antes el Administrador pasaba sin dificultad porque todo le daba 403).
- **La geografía era invisible para el Administrador de empresa:** regiones, departamentos y ciudades se filtraban por el territorio del usuario, y él no tiene territorio. Ahora las ve completas (RN-02). Las sedes se siguen filtrando por empresa.
- **La validación de área al crear o editar usuarios** le habría impedido crear un Director Regional (el departamento "no era suyo"). Pasó a una regla pura con test: la sede tiene que ser de su empresa; el departamento, la ciudad y la región, libres.
- **Cambios de permisos según la matriz firmada:** las ciudades las crea solo el superadmin; las sedes, el Administrador de empresa (y el superadmin). **El Director Regional ya no crea ni ciudades ni sedes**, cosa que hoy sí podía.
- **Listado de usuarios:** traía a los usuarios de todas las empresas y filtraba en memoria (sin filtrar hacia afuera, pero pesado). Ahora filtra por empresa en la consulta.
- **Mensaje exacto de HU-09.3:** el anterior decía *"No tienes permiso para crear usuarios con el rol …"*; quedó el texto del criterio. El de editar el rol (*"No puedes asignar el rol …"*) es otra acción y no cambió.
- **Rangos:** superadmin 4, Administrador de empresa 3, Director Regional 2, Coordinador 1, Conductor 0 (backend y frontend).

**PC-HU-01 · PC-HU-02 · PC-HU-03 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 57 de 57 (5 de límites y 7 de empresas nuevos) · `npm run build` · lint 40 = línea base · script de aislamiento en verde (el middleware nuevo corre en cada pedido) · script de la tanda: 34 de 34 | ✅ |
| HU-01.1 | ventana: la lista muestra nombre, Activa / Desactivada, "Sedes: 2 de 3" y "Vehículos: 1 de 2" con su barra; filtros por estado y búsqueda | ✅ |
| HU-01.2 | ventana: "Nueva empresa" con empresa, plan y administrador → aparece la contraseña temporal · API: el administrador queda con rol Administrador de empresa, en su empresa y con cambio de contraseña pendiente | ✅ |
| HU-01.3 · CB-09 | ventana: *"Ese correo ya está registrado en SISVIA"* · API: correo y cédula repetidos con su texto exacto, y en los dos casos no queda ni la empresa, ni el perfil, ni la cuenta de acceso | ✅ |
| HU-01.4 | ventana y API: "tst ventana" y "tst ALFA" (otras mayúsculas) → *"Ya existe una empresa con ese nombre"* · test `HU-01.4` (sin comodines) | ✅ |
| HU-01.5 | ventana: el administrador nuevo va a "Cambia tu contraseña" antes de cualquier módulo; después de cambiarla (por API, sin escribir contraseñas en la ventana) llega al panel vacío: "Sedes: 0 de 2 · Vehículos: 0 de 8" | ✅ |
| CB-14 | API: dos altas a la vez con el mismo nombre → una 201 y otra 409 con el texto; queda una sola empresa y la cuenta del que perdió se borra | ✅ |
| HU-02.1 · CB-10 | ventana: 0 y 2.5 en el alta, y 0 al editar → *"El límite debe ser un número entero de 1 en adelante."*; con 8 se guarda y se ve en la ficha · API: 0, −1 y 2.5 · test `CB-10` (0, −1, 2.5, vacío, texto; 1 vale) | ✅ |
| HU-02.2 | ventana: con 2 de 2, la tercera sede → *"Tu empresa llegó al límite de 2 sedes de su plan. Para ampliarlo, comunícate con SISVIA."* · API: también al reactivar una sede · test `HU-02.2` | ✅ |
| HU-02.3 | API: con 1 de 1, crear o reactivar un vehículo → *"… límite de 1 vehículo de su plan …"* (singular) · test `HU-02.3` (120 y 1) | ✅ |
| HU-02.4 | API: con 1 de 2 sedes y 0 de 1 vehículos, crea · test `HU-02.4` (N−1 sí, N no) | ✅ |
| HU-02.5 | ventana: el panel del Administrador muestra "Sedes: 0 de 2" y "Vehículos: 0 de 8" · API: el superadmin no recibe plan propio | ✅ |
| CB-02 | API: bajar el límite de sedes a 1 con 2 activas → no se desactiva ninguna y la siguiente se rechaza · test `CB-02` | ✅ |
| HU-03.1 | ventana: confirmación → "Desactivada"; API: sedes y vehículos iguales antes y después | ✅ |
| HU-03.2 | API (en la ventana no se escriben contraseñas): entrar con correo o con cédula → 403 *"Tu empresa está desactivada. Comunícate con SISVIA."* | ✅ |
| HU-03.3 · CB-11 | ventana: con la sesión abierta del administrador, se desactivó su empresa y al hacer clic salió al login con el mensaje | ✅ |
| HU-03.4 | ventana: "Reactivar" con su confirmación · API: vuelve a entrar y su sesión vuelve a responder | ✅ |
| RNF-05 | API: `auditoria_empresas` guarda creada, límites, desactivada y reactivada con quién · ventana: la ficha las muestra ("Cambió el plan · vehículos 5 → 8") | ✅ |
| RNF-07 | medidor en la lista, la ficha y el formulario con errores: 0 fallas de contraste en claro y en oscuro; todos los botones y campos del módulo miden 44 px (lo más chico es el menú y la cabecera que ya existían); sin colores sueltos | ✅ |
| RNF-08 | los textos de HU-01, HU-02 y HU-03 salen de un solo lugar (`empresasReglas.js`, `limitesReglas.js`) y los tests los comparan letra por letra | ✅ |
| Cláusulas | CL-04 y CL-06: tokens, CSS al lado de cada componente, un solo estilo en línea (el ancho calculado de la barra) · CL-13: los conteos del plan filtran por la empresa que se consulta · CL-01: sin git | ✅ |

**Hallazgos de la tanda 4**

- **"SISVIA" quedó llena:** la migración le puso de límite lo que tenía activo (5 sedes, 1 vehículo). Con el código nuevo, nadie de "SISVIA" puede crear otra sede u otro vehículo hasta que el superadmin le suba el plan desde Empresas. En producción no pasa nada hasta el push, porque el código de hoy no mira límites.
- **El límite vale también para el superadmin** (RN-03 dice "no se puede"): si hace falta, se sube el plan. **Transitorio:** una sede que el superadmin crea fuera de una empresa cae en "SISVIA" sin mirar el límite, hasta HU-16.
- **Hueco cerrado al editar vehículos:** la edición guardaba cualquier campo que llegara, así que se podía mandar `empresa_id` (pasar el vehículo a otra empresa) o `activo: true` (reactivarlo sin mirar el límite). Ahora esos campos y los de baja (HU-17) se ignoran; lo comprobó el script.
- **La contraseña temporal solo se exigía en el login:** quien ya tenía sesión o recargaba la página entraba a los módulos sin cambiarla. Ahora la ruta protegida lo manda a "Cambia tu contraseña" hasta que la cambie. Vale para todos los usuarios, no solo los de empresas.
- **"Informar a mi superior"** aparecía al Administrador de empresa, que no tiene superior (fallaba al usarlo). Ahora se oculta, igual que al superadmin.
- **Diseño:** la lista se acomoda al ancho real que le deja el menú (no al de la pantalla); con la ventana angosta los botones se salían de la tarjeta.
- **Sin cuenta suelta:** si el alta falla después de crear la cuenta de acceso (nombre ocupado por otro en ese instante, cédula repetida), la cuenta se borra. Así un correo no queda "registrado" sin empresa.
- **Límites y carreras:** dos altas simultáneas podrían pasar el límite por uno (cada una cuenta antes de guardar). No es un caso del pacto; si llega a importar, se resuelve con un trigger en la base.

**PC-HU-16 · 2026-09-19 · ⏳ falta la parte de Martín**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 64 de 64 (7 de `soporteReglas` nuevos) · `npm run build` · lint 36 (bajó de 40: la reescritura de `api.js` sacó 2 avisos viejos; los archivos nuevos no suman ninguno) · script de aislamiento sin filtraciones · script de la tanda 4 en verde · script de HU-16: 22 de 22 | ✅ |
| HU-16.1 | ventana: ficha de TST A → "Entrar a la empresa" → su panel con la franja *"Estás viendo TST A como SISVIA · Salir"*, el menú de la empresa (panel, vehículos, usuarios, geografía, catálogo, chequeos, intentos, avisos), su nombre en la cabecera y su plan · al crear un vehículo solo ofrece las 2 sedes de A (la de B está en la misma ciudad) · API: adentro, sedes, usuarios y panel son solo de A; un usuario de B da 404 | ✅ |
| HU-16.2 | API: sin contraseña no se hace nada y responde qué y dónde ("crear una sede" en "TST A"); con la contraseña (lleva ñ y %) se hace y queda en A · ventana: al guardar un vehículo aparece *"Vas a crear un vehículo en TST A, como SISVIA. Queda registrado con tu nombre."*; Cancelar o Esc → *"Cancelaste el cambio: no se guardó nada."* y 0 vehículos en la base | ✅ API · ⏳ **Martín**: escribir la contraseña en la ventana |
| HU-16.3 | API: contraseña mala → *"Contraseña incorrecta"* y no se crea nada · test `HU-16.3` | ✅ API · ⏳ **Martín**: verlo en la ventana |
| HU-16.4 | ventana: "Salir" → vuelve a Empresas, sin franja y con el menú de afuera | ✅ |
| RN-11 | API: `auditoria_empresas` guarda "Creó una sede", "Creó un vehículo" y "Editó un vehículo" con quién y en qué empresa; un cambio que falla (placa inválida) no se registra; entrar también queda · ventana: la ficha muestra ese historial · tests `RN-11` | ✅ |
| HU-06.6 | API: afuera, crear un vehículo, una sede o un usuario de empresa, o desactivar a uno, responde *"Entra a la empresa para hacer cambios en sus datos."*; crear alguien del equipo SISVIA sí pasa · ventana: afuera el menú es Empresas, usuarios, geografía, avisos, ajustes y perfil, y el panel lleva a Empresas · tests `HU-06.6` | ✅ |
| CL-10 | la contraseña se verifica con `crearClienteAuth()` y esa sesión suelta se cierra con `signOut({ scope: 'local' })` | ✅ |
| RNF-07 | medidor: franja y pedido de contraseña con 0 fallas en claro y oscuro; sus botones miden 44 px | ✅ |

**Hallazgos de la tanda 5**

- **Cambio de comportamiento del superadmin** (ya anotado en la revisión del plan): afuera de una empresa ya no ve el panel ni vehículos mezclados, y no cambia datos de empresas. Para crear o arreglar algo en "SISVIA" hay que entrar a ella, con contraseña. Así desaparece el caso transitorio de las tandas 2 y 4 (lo que creaba afuera caía en "SISVIA" sin mirar el límite).
- **La contraseña se reusa 20 segundos**, solo en memoria del navegador: un "Guardar" de vehículo son hasta 3 pedidos (datos, fotos, RUNT) y pedirla 3 veces no tiene sentido. El servidor la verifica y registra cada pedido por separado. Si Martín prefiere que se pida siempre, es un número.
- **Fuerza bruta:** las confirmaciones fallidas cuentan en el mismo contador del login: 5 seguidas bloquean la cuenta 15 minutos.
- **Modales uno sobre otro:** el componente `Modal` no los soportaba. El pedido de contraseña quedaba debajo del formulario del vehículo (invisible), Esc cerraba los dos y al cerrar uno se destrababa el scroll. Ahora hay una pila: Esc cierra solo el de arriba y el scroll se libera al cerrar el último.
- **Subidas de fotos y RUNT** usaban `fetch` directo y no habrían mandado la empresa ni la contraseña. Pasan por `apiArchivo()`, con los mismos encabezados que `api()`; las descargas también.
- **Contraste viejo corregido:** en el formulario de vehículos, "Máximo 20 MB · solo PDF" y "Máximo 5 MB c/u" daban 3.47:1 en claro. Pasaron a `--color-gris-700`.
- **Lo que no pide contraseña adentro:** mirar, su cuenta y sus avisos, el módulo Empresas y la subida de una imagen suelta (la foto queda en la nube, pero el dato se guarda después, en un pedido que sí la pide).
- **Proceso:** el script de aislamiento falló al primer intento porque las empresas de prueba de la tanda ya se llamaban "TST A". No era una filtración; con la base limpia pasó.

**Enmiendas 1, 2 y 4 · HU-16.5 · 2026-09-19 · PC-HU-02, PC-HU-09 y PC-HU-16 ✅**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 67 de 67 (CB-02, CB-17 y HU-16.5 nuevos) · build · lint 36 · aislamiento sin filtraciones · scripts de la tanda 4 (ajustado a la enmienda 1), de HU-16 y de las enmiendas (21 de 21) en verde | ✅ |
| CB-02 (enmienda 1) | ventana: TST A con 2 sedes, bajar a 1 → *"La empresa tiene 2 sedes activas: el límite no puede ser menor. Primero desactiva las que sobran."* · API: no se guarda; bajar a 2 (lo que usa) sí; test con N y N−1 y el texto de vehículos | ✅ |
| CB-17 (enmienda 2) | API: eliminar, desactivar o cambiarle el rol al único dueño → *"La empresa no puede quedar sin Administrador de empresa. Crea otro antes de hacer este cambio."* y queda igual en la base; con dos, desactivar a uno sí y al que queda ya no · test `CB-17` | ✅ |
| HU-16.2-3 (enmienda 4) | Martín, en su navegador: contraseña mala y buena, *"si funciona"* | ✅ |
| HU-16.5 | API: 4 malas → *"Contraseña incorrecta"*; la 5.ª → *"Demasiados intentos fallidos. Intenta de nuevo en 15 minutos."*; bloqueada, ni la buena pasa y no se crea nada; el login de esa cuenta también queda bloqueado · ventana: con la cuenta bloqueada, al crear una sede el modal abre directo con el aviso y el campo y "Confirmar" deshabilitados; al cancelar, el aviso queda en pantalla y no se crea nada · test `HU-16.5` | ✅ |

**Hallazgos de las enmiendas**

- **"Aviso de otra empresa" (lo vio Martín):** no era una filtración. Era un aviso suyo de antes de la tanda 2 (cuando los superadmin recibían los de todas las sedes), que el módulo Notificaciones mostraba estando dentro de TST A. Ahora, dentro de una empresa, la página muestra los avisos **de esa empresa** con a quién le llegó cada uno, sin marcarlos como leídos; la campanita sigue con los propios. Probado por API y en la ventana.
- **Municipios:** la base tenía solo las 34 capitales. Migración `2026-09-19_municipios.sql` con los 1.122 de la DIVIPOLA del DANE (nombre popular donde el oficial confunde: Cúcuta, Cali, Cartagena, Tumaco, Mompox, Mariquita, Tolú, Buga, Ubaté, Bogotá). Probada dos veces en un PostgreSQL local: 34 → 1.122 y la segunda corrida no duplica. También quedó en `INSTALAR_TODO.sql` y en `seeds/07_municipios.sql`. **La corre Martín.**
- **1.000 filas por consulta:** Supabase corta en 1.000; con 1.122 municipios, el listado de ciudades habría perdido 122. Ahora pide por páginas.
- **El bloqueo se revisa antes de pedir la contraseña:** con la cuenta bloqueada, el modal abre directo con el aviso en vez de pedirla para después rechazarla.
- **Proceso:** un `node -e` con comillas invertidas dentro de comillas dobles hizo que Bash las ejecutara como comandos y se comiera tres fragmentos de la tabla de enmiendas; se corrigieron con el editor.

**PC-HU-12 · PC-HU-13 · PC-HU-15 · PC-HU-14 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 81 de 81 (13 de `catalogoReglas` nuevos) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-16, enmiendas y catálogo (39 de 39) en verde | ✅ |
| HU-12.1 | API: el superadmin afuera crea categoría, ítem y pregunta base; A y B los ven · test `CB-05 · HU-12.1` (lo base apagado no lo ve nadie) | ✅ |
| HU-12.2 | ventana: el Administrador de TST A ve lo base con la etiqueta "Base" y sin editar ni apagar | ✅ |
| HU-12.3 | API: la empresa cambiando o borrando algo base → *"No tienes permiso para cambiar el catálogo base"* · el superadmin adentro de una empresa tampoco (*"Para cambiar el catálogo base, sal de la empresa."*) · test `HU-12.3` | ✅ |
| HU-13.1-2 | API: A crea categoría, ítem (en una base y en la suya) y pregunta propios; B no ve nada ni puede usar la categoría de A; tocar un ítem de A desde B → 404 · tests `HU-15.2 · HU-13.1-2` | ✅ |
| HU-13.3 · CB-03 | API: un ítem propio usado en un chequeo solo se apaga · ventana: el chequeo viejo de TST A sigue mostrando "TST Extintor extra · Cumple" | ✅ |
| HU-13.4 | API: lo propio sin usar se borra de verdad | ✅ |
| HU-13.5 | ventana: el Coordinador ve las 41 filas, *"Solo lectura: los cambios los hace el Administrador de empresa."* y ningún botón · API: crear o editar → *"No tienes permiso para cambiar el catálogo"* · test `HU-13.5` | ✅ |
| CB-08 | API: "niveles" (una base) y "tst propia a" (una propia, otras mayúsculas) → *"Ya existe una categoría con ese nombre"* | ✅ |
| HU-14.1 | API: el superadmin adentro de A bloquea un ítem y una pregunta base (con contraseña): A deja de verlos en su catálogo y en su chequeo; B no cambia · ventana: el superadmin adentro ve *"Bloqueado para esta empresa"* con "Desbloquear", y "Bloquear" pide la contraseña · afuera, o la empresa misma, no bloquea | ✅ |
| HU-14.2 | API: categoría base bloqueada → salen sus ítems base y queda el propio que A puso en ella · test `HU-14.2` | ✅ |
| HU-14.3 | API: al desbloquear vuelve a aparecer · test | ✅ |
| RNF-05 | API: cada bloqueo queda en el registro de la empresa con el elemento ("Bloqueó un elemento del catálogo base · Ítem: …") | ✅ |
| HU-15.1 | API: la aptitud pide las 6 preguntas de A (5 base + 1 propia) y rechaza si falta una · ventana: el conductor de TST A contestó "1 de 6", incluida la propia | ✅ |
| HU-15.2 | API: al catálogo de B no llega nada propio de A · test | ✅ |
| HU-15.3 | API: al camión le tocan 41 ítems, sin el de motos · ventana: la categoría propia "TST GRÚA" trae solo el gancho (ni el casco de motos ni el extintor apagado) y NIVELES no trae el ítem bloqueado · test `HU-15.3` | ✅ |
| CB-04 | API: se bloquea un ítem a mitad del chequeo y el chequeo en curso sigue con sus 41; las respuestas de ítems ajenos se rechazan; el cierre espera las de su chequeo (ya no 39 fijas) | ✅ |
| RNF-07 | medidor en las tres pestañas del catálogo, claro y oscuro: 0 fallas (ver hallazgo de la fila apagada) | ✅ |

**Hallazgos de la tanda 7**

- **El chequeo ahora guarda sus ítems al iniciar** (columna `catalogo_items`, migración `2026-09-19_catalogo_chequeo.sql`, ya corrida por Martín). Sin eso no había forma de cumplir CB-04 ni de saber cuántas respuestas esperar: el cierre contaba **39 fijas**, que con catálogo propio o bloqueado no sirve. Los chequeos anteriores siguen con la regla vieja.
- **El catálogo nunca filtró por tipo de vehículo:** el conductor veía todos los ítems activos y `aplica_a_tipos` estaba vacío en los 39. Además, el formulario del panel lo usaba como "pre/postoperacional" (y el alta guardaba eso por defecto), cosa que al filtrar habría escondido esos ítems. Ahora son tipos de vehículo, como dice el esquema y pide HU-15.3; vacío = todos.
- **La aptitud exigía exactamente 5 respuestas.** Ahora pide todas las preguntas de la empresa (base, menos las bloqueadas, más las propias) y rechaza si falta o sobra una.
- **Borrar una categoría base** apagaba todos sus ítems, también los propios de las empresas. Ahora solo toca los del mismo catálogo, y si hay ítems de empresas adentro la categoría se apaga en vez de borrarse.
- **Fila apagada con poco contraste:** el catálogo marcaba lo apagado con `opacity: 0.55`, que dejaba el texto y los botones de esa fila entre 2.2 y 3.7:1. Ahora es fondo sutil y borde punteado (la etiqueta "INACTIVO" ya dice el estado).
- **Menú:** el catálogo lo ven todos los admins (antes, solo Coordinador y Administrador de empresa): el superadmin afuera maneja el base (pedido de Martín) y el Director Regional lo mira (HU-13.5).
- **Para HU-08:** el detalle del chequeo tiene su propia cabecera, con "Gestión de Flota" (resto de flota-sena) y el rol en crudo ("admin_empresa").
- **Proceso:** las comillas invertidas dentro de `node -e` volvieron a comerse un template literal (la llamada del checklist quedó `api()`); se arregló con el editor y quedó anotado en la memoria para no repetirlo.

**PC-HU-08 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 87 de 87 (4 de `organizacionReglas` y 2 del informe nuevos) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-16, enmiendas y catálogo en verde (el middleware cambió cómo detecta la empresa desactivada) · script de HU-08: 12 de 12 | ✅ |
| HU-08.1 | ventana: el Administrador de TST A ve su empresa en la cabecera del menú y en el pie; el conductor, debajo de "SISVIA" y en el pie · API: `/auth/me` trae `empresa_nombre` · test `HU-08.1` | ✅ |
| HU-08.2 | API: el PDF (texto leído con pypdf) y el Word (XML por dentro) del chequeo de A dicen *"TST Transportes y Logística Integral del Sur de Colombia SAS · Regional Amazonas · TST Sede A"*, y ya no "Mi organización"; la hoja de vida del vehículo también · test `HU-08.2` | ✅ |
| HU-08.3 | API: la falla crítica, el informe y el aviso de vencimientos llevan a A en el pie (y la falla crítica, la línea empresa · Regional · Sede) · test `HU-08.3` | ✅ |
| HU-08.4 | ventana: el superadmin afuera ve "SISVIA" en el menú y el pie; adentro de A, el nombre de A · test `HU-08.4` | ✅ |
| CB-16 | ventana a 360 px con un nombre de 60 caracteres: el menú y la cabecera del detalle lo cortan con "…" (completo al pasar el mouse) y la página no se desborda | ✅ |
| CL-02 | `ORG_NOMBRE` y `VITE_ORG_NOMBRE` ya no se leen en ningún lado; el pie de los correos toma el producto de `marca.js` (tenía "SISVIA" escrito a mano); `.env.example`, README, mapa del código y guía de despliegue actualizados | ✅ |
| RNF-07 | medidor: cabecera del detalle (superadmin adentro) y pantalla del conductor, 0 fallas en claro y oscuro (ver hallazgo del texto "Sin foto registrada") | ✅ |

**Hallazgos de la tanda 8**

- **Tres pantallas tenían su propia cabecera** (detalle del chequeo, del vehículo y perfil de un usuario), con "Gestión de Flota" (resto de flota-sena) y el rol en crudo ("admin_empresa"). Además, al no usar el layout del panel, **no mostraban la franja de HU-16** cuando el superadmin estaba dentro de una empresa. Ahora las tres usan un componente común (`CabeceraDetalle`) con la marca, la empresa, el cargo legible y la franja (`FranjaSoporte`, que salió del layout para usarse en los dos lados).
- **La empresa desactivada** se detecta ahora en la misma consulta del perfil (una consulta menos por pedido).
- **Contraste viejo corregido:** "Sin foto registrada" en el detalle del vehículo daba 3.47:1 en claro (`--color-gris-500`); pasó a `--color-gris-700`. Hay 73 usos de `--color-gris-500` en los estilos: los que sean texto probablemente fallan igual; queda como revisión aparte.
- **Para después del push (Martín):** borrar `ORG_NOMBRE` en Railway y `VITE_ORG_NOMBRE` en Cloudflare. Si quedan, no pasa nada: ya no se leen.
- **Fuera del pacto, pedido de Martín (2026-09-19):** el informe al superior llevaba el mensaje y el resumen **solo por correo**; en la campanita, solo el asunto. Sin correo configurado, el superior nunca los veía. Ahora la notificación lleva el asunto, el mensaje y el resumen (`informeReglas.js`, con test), y el correo es una copia. También se corrigió "Informe enviado a el Director…" → "al Director…".

**PC-HU-10 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 90 de 90 (3 de HU-10 nuevos) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-16 y enmiendas en verde · script de HU-10: 12 de 12 | ✅ |
| HU-10.1 | ventana: con 1 sede activa, el Cargo del alta ofrece solo "Conductor" · API: Coordinador y Director Regional → *"Con una sola sede activa solo se pueden crear Conductores. Crea la segunda sede para habilitar Director Regional y Coordinador de sede."*; convertir a un conductor en Coordinador, tampoco · tests `HU-10.1` (con 0 y 1 sede) | ✅ |
| HU-10.2 | ventana: con la segunda sede, el Cargo ofrece Director Regional, Coordinador de sede y Conductor · API: se crean los dos · test `HU-10.2` | ✅ |
| HU-10.3 · CB-12 | API: la empresa vuelve a 1 sede; el Coordinador que ya existía sigue usando el panel y los vehículos y se lo puede editar, pero no se crea otro | ✅ |
| RN-04 | API: el superadmin dentro de una empresa con 1 sede sí crea un Coordinador (*"además de lo que haga el superadmin"*) | ✅ |

**Hallazgos de la tanda 9**

- **La regla vale también al cambiar el rol**, no solo al crear: convertir a un conductor en Coordinador es crear un Coordinador nuevo.
- **En pantalla solo se filtra para el Administrador de empresa**, que ve todas las sedes de su empresa. Un Director Regional ve solo las de su departamento, así que contarlas daría un número equivocado; para él manda el backend, con el mensaje.
- **Error propio corregido en la tanda:** el control preguntaba "¿se permite con 2 sedes?" para saber si un rol estaba limitado, y con 2 siempre se permite; la regla no se activaba. La prueba por API lo agarró en la primera corrida.
- **Fuera del pacto (2026-09-19):** Martín configuró el correo (contraseña de aplicación de Gmail en `backend/.env`); Gmail aceptó las credenciales (verificación sin enviar). El remitente de los correos tenía "SISVIA" escrito a mano; ahora sale de `marca.js` (CL-02). En producción conviene poner las mismas variables en Railway recién con el push: con el código viejo empezarían a salir correos reales.

**PC-HU-11 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 90 de 90 · build · lint 35 · aislamiento sin filtraciones · scripts de HU-10, HU-16 y enmiendas en verde · script de HU-11: 6 de 6 | ✅ |
| HU-11.1 | ventana: afuera de las empresas, "Gestión de usuarios" dice *"Equipo SISVIA · la gente de cada empresa se ve entrando a ella, desde Empresas"* y lista solo a los 3 superadmins; el Cargo del alta ofrece solo "Administrador general" · API: el listado trae solo superadmins, ni filtrando por Conductores aparece gente de A o B, y crear un Conductor desde afuera da 403 *"Entra a la empresa para hacer cambios en sus datos."* | ✅ |
| HU-11.2 | ventana: Empresas → ficha de TST A → **"Ver sus usuarios"** entra a A (queda registrado, como al entrar) y abre sus usuarios con la franja *"Estás viendo TST A como SISVIA"*; se ve solo su Administrador, y el Cargo ofrece Administrador de empresa, Director Regional, Coordinador de sede y Conductor, sin "Administrador general" · API: adentro de A, ni el equipo SISVIA ni la gente de B | ✅ |

**Hallazgos de la tanda 10**

- **"Desde la ficha" es entrar a la empresa.** El botón "Ver sus usuarios" de la ficha hace lo mismo que "Entrar" (registro, franja, contraseña en cada cambio) y abre Usuarios en vez del panel. Así no hubo que armar una segunda pantalla de usuarios, y el superadmin sigue sin cambiar nada de una empresa desde afuera (HU-16).
- **El alta arrancaba en "Conductor"**, que el superadmin afuera ya no puede crear: el formulario ahora toma siempre un cargo de los permitidos (afuera, "Administrador general").
- **El filtro "Conductores" sigue visible afuera** y da una lista vacía. No molesta; se deja así.

**PC-HU-17 · 2026-09-19**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 97 de 97 (7 de `vehiculosReglas` nuevos) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-10, HU-11, HU-16 y enmiendas en verde · script de HU-17: 24 de 24 | ✅ |
| HU-17.1 | API: A registra `TSX171`; B no puede, ni con el vehículo de A desactivado, ni cambiándole la placa a uno suyo: *"Esa placa ya está registrada en SISVIA. Si el vehículo ahora es de tu empresa, comunícate con SISVIA."*, sin nombrar a A · A tampoco la repite (*"Ya existe un vehículo con esa placa en tu empresa."*) · ventana: el formulario de A muestra el texto exacto y no crea nada · tests `HU-17.1` | ✅ |
| HU-17.2 | API: el Administrador de A no da de baja (*"Solo el equipo SISVIA puede dar de baja un vehículo por traspaso."*); el superadmin afuera, tampoco; adentro pide la contraseña diciendo *"dar de baja por traspaso un vehículo"*; sin motivo, *"Escribe el motivo de la baja."*; con motivo y contraseña se da de baja, A conserva su chequeo viejo y B registra la placa · ventana: "Dar de baja" solo para el superadmin adentro, el aviso de lo que pasa, el motivo obligatorio y el pedido de contraseña (Claude llega hasta ahí y lo cancela; el formulario conserva el motivo) · tests `HU-17.2` (500 caracteres pasa, 501 no) | ✅ |
| HU-17.3 | API: el vehículo guarda quién, cuándo y el motivo; el historial de la empresa dice *"Dio de baja por traspaso un vehículo · TSX171 · Motivo: …"* con el superadmin y la hora · ventana: lo mismo en la ficha de TST A y en el detalle del vehículo · test `HU-17.3` | ✅ |
| HU-17.4 | API: A lo encuentra buscando la placa, marcado dado de baja (y no ve el de B); reactivar, editar, eliminar y darlo de baja otra vez responden *"Este vehículo fue dado de baja por traspaso: no se puede reactivar ni modificar."*; el panel ya no lo cuenta (flota, límite ni "No pueden salir") · ventana: tarjeta "Dado de baja por traspaso" con solo Detalle y exportar · test `HU-17.4` | ✅ |
| RNF-07 | medidor en el formulario de la baja y en el detalle: 0 fallas en claro y oscuro, también a 390 px | ✅ |

**Hallazgos de la tanda 11**

- **El control de placa viejo se habría roto con la primera baja:** buscaba la placa con `maybeSingle()`, que con dos filas (la dada de baja de A y la vigente de B) da error y la trataba como libre. Ahora busca solo entre las vigentes; si dos altas llegan a la vez, el índice único frena la segunda y responde el mismo texto.
- **Cambiar la placa a una ocupada daba error 500** (lo frenaba la base). Ahora responde el texto de HU-17.1.
- **Un vehículo dado de baja tampoco se edita, se elimina ni cambia sus fotos o su RUNT:** eliminarlo borraría el historial que A conserva, y eliminarlos del todo quedó para otro pacto (SRS 3.N).
- **"No pueden salir" mostraba los vehículos desactivados:** uno dado de baja habría quedado ahí para siempre. Ahora queda afuera del panel.
- **La API devuelve `codigo: placa_en_sisvia`** con el texto de HU-17.1, para el atajo "Escribir a SISVIA" de HU-18.9.
- **Contraste:** el detalle de un vehículo inactivo tiene opacidad 0.7, y eso hacía fallar el aviso de la baja (3.24:1). Uno dado de baja ya no la lleva y no muestra el estado ("Operativo · 0%"), que no aplica. Los inactivos comunes siguen con esa opacidad (fallan "Sin foto registrada", el estado y los botones PDF y Word), y "Sin foto" de las tarjetas da 3.47:1 (`--color-gris-500`): van con la revisión aparte del gris.
- **Durante la ventana hubo un intento de contraseña fallido** en la cuenta de prueba: lo escribió Martín en la ventana (lo confirmó). Quedó 1 de 5 y se borró al limpiar.

**PC-HU-04 · 2026-09-21**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 104 de 104 (7 del respaldo nuevos: `.zip`, CSV, nombres y encabezados) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-10, HU-11, HU-16, HU-17 y enmiendas en verde · script de HU-04: 20 de 20 | ✅ |
| HU-04.1 | API: el superadmin baja `respaldo-tst-a-2026-09-21.zip`; el `zipfile` de Python (otro lector, no el mismo código) lo abre sano y trae `LEEME.txt`, `sedes`, `usuarios` (con correo y cargo), `vehiculos`, `chequeos`, `respuestas_chequeo`, `respuestas_aptitud` e `intentos_bloqueados` en CSV, y un PDF por chequeo (3); nada de B; el Administrador de A no puede exportar (403) · ventana: "Exportar todo" en la ficha, con permiso de Martín para la descarga; el `.zip` llegó sano (11 archivos) y se borró · el PDF de un chequeo trae empresa, sede, resultado, vehículo, conductor e ítems · tests `HU-04.1` | ✅ |
| HU-04.2 | API: la ficha trae la fecha y hora, y queda el registro con quién exportó (RNF-05) · ventana: "Último respaldo: Nunca" pasa a la fecha y hora al terminar, y el historial dice *"Exportó todo (respaldo)"* | ✅ |
| HU-04.3 | API: TST B, sin chequeos, sale igual: sin PDF y con los CSV de chequeos vacíos y sus encabezados · tests `HU-04.3` | ✅ |
| CB-01 | API: la descarga se corta al llegar el primer pedazo: no se marca "Último respaldo" ni se registra; después se vuelve a exportar entero | ✅ |
| RNF-02 | API: 150 vehículos, 1.000 chequeos y 44.000 respuestas de prueba: el `.zip` (18 MB, 1.000 PDF sanos) sale en **43,7 s** (tope 120 s); durante la exportación la API respondió en 0,6 s | ✅ |
| RNF-07 | medidor en la ficha: 0 fallas en claro y oscuro, también a 390 px | ✅ |

**Hallazgos de la tanda 12**

- **El `.zip` es propio, sin dependencias nuevas** (`services/export/zip.js`, con `zlib.crc32`). Sale en flujo mientras se arma: con 1.000 chequeos no se junta entero en memoria. `zlib.crc32` existe desde Node 22.2, así que `engines` pasó de `>=22.0.0` a `>=22.2.0` (sigue siendo "Node 22 o superior", CL-11).
- **Los CSV abren bien en Excel en español:** separador `;` (la coma es el decimal en Colombia) y BOM UTF-8 (sin él, Excel muestra mal las tildes). Una celda que empieza con `=`, `+`, `-` o `@` va con `'` adelante: una observación escrita por un conductor no se ejecuta como fórmula al abrir el archivo.
- **RNF-02 no se cumplía con la primera versión:** 105 s, casi todo armando PDF (~100 ms cada uno, trabajo de CPU que además frenaba la API). Ahora los PDF se reparten entre hilos (`worker_threads`, uno por núcleo libre y hasta 4) y las respuestas se traen en consultas paralelas y más livianas: 43,7 s. **En Railway el tiempo depende de cuántos núcleos tenga el servicio:** con uno solo arma los PDF en un hilo (~100 s, todavía dentro del tope). Conviene medirlo después del push con una empresa real grande.
- **"Último respaldo" se marca con el `.zip` entero escrito, justo antes de cerrar la respuesta**, para que la ficha que el navegador recarga ya traiga la fecha. Si la descarga se corta mientras se arma, no se marca (CB-01).
- **Chequeos e intentos bloqueados no tienen clave foránea hacia `sedes`:** el nombre de la sede sale de la lista de sedes de la empresa.
- **El reloj de este PC va ~1,6 minutos atrás del de Supabase:** en la ventana, el "Último respaldo" (hora del backend local) quedó 2 minutos antes que el registro (hora de la base). En Railway los relojes están sincronizados.
- **El CORS del backend expone `Content-Disposition`**, para que el navegador use el nombre del `.zip` que manda el servidor.

**PC-HU-05 · 2026-09-21**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 108 de 108 (4 de `motivoNoEliminar` nuevos) · build · lint 35 · aislamiento sin filtraciones · scripts de la tanda 4, HU-10, HU-11, HU-16, HU-17, HU-04 y enmiendas en verde · script de HU-05: 21 de 21 | ✅ |
| HU-05.1 | API: activa responde *"Primero desactiva la empresa."* y la ficha trae el mismo motivo · ventana: la sección "Eliminar la empresa" lo dice y el botón está deshabilitado · test `HU-05.1` | ✅ |
| HU-05.2 | API: desactivada sin respaldo, y con uno de hace 31 días, responde *"Antes de eliminar, genera el respaldo con «Exportar todo» y envíaselo a la empresa."*; con el respaldo recién hecho, la ficha ya deja · ventana: el mismo texto tras desactivarla · test `HU-05.2` (30 días justos vale; 30 días y un instante, no) | ✅ |
| HU-05.3 | API: con el nombre exacto se borra y quedan **0 filas de A en 19 tablas** (empresa, sedes, usuarios, vehículos, chequeos con respuestas y fotos, intentos, suplencias, avisos, catálogo propio, bloqueos, historiales e intentos de login); sus usuarios ya no tienen cuenta en Supabase Auth; la foto real subida a Cloudinary se borró; TST B y el ítem base bloqueado siguen · ventana, con permiso de Martín: "Eliminar para siempre" → aviso *"Empresa "TST A" eliminada"*, la lista queda con SISVIA y TST B, y en la base no queda nada de A · test `HU-05.3` | ✅ |
| HU-05.4 | API: `tst a`, `TST A ` (con un espacio) y vacío responden *"El nombre no coincide: no se borró nada."* y la empresa sigue entera · ventana: con el nombre mal escrito, "Eliminar para siempre" queda deshabilitado · test `HU-05.4` | ✅ |
| CB-07 | API: la suplencia activa del conductor del pool se borró con la empresa | ✅ |
| RNF-05 | API: queda el registro *eliminada* con quién, cuándo y cuánto se borró, con el nombre de la empresa; su historial anterior se conserva con el nombre | ✅ |
| RNF-07 | medidor en la ficha y en el pedido de confirmación: 0 fallas en claro y oscuro, también a 390 px | ✅ |

**Hallazgos de la tanda 13**

- **Una sola instrucción borra todo:** toda tabla de una empresa tiene `empresa_id` con `ON DELETE CASCADE`, así que `DELETE` de la empresa arrastra lo suyo y se hace entero o no se hace. Se probó antes en la base con TST A: las claves `RESTRICT` (chequeo → vehículo y conductor, vehículo → sede) no molestan porque todo cae en la misma instrucción.
- **`auditoria_chequeos` frenaba el borrado entero:** su `accion_por_id` apunta a usuarios sin regla de borrado (el experimento dio el error 23503 y no borró nada). Se limpia antes, junto con los historiales de vehículos y usuarios, que si no quedaban huérfanos con los ids en blanco.
- **El orden:** primero se juntan sus accesos y sus archivos (después ya no se sabe cuáles eran), luego se limpian los historiales, se borra la empresa y recién ahí se borran las cuentas de Auth, los intentos de login y las fotos de Cloudinary (de a 100). Si algo falla antes del borrado, la empresa sigue y se puede reintentar. Lo que no se pudo borrar afuera queda contado en el resultado y en el registro (`accesos_no_borrados`, `archivos_no_borrados`).
- **El texto del nombre distinto no estaba en el SRS:** se usó *"El nombre no coincide: no se borró nada."* En pantalla casi no aparece: el botón no se habilita hasta que el nombre coincide.
- **La ficha trae `no_se_elimina`,** calculado con la misma regla del servidor: la pantalla no repite la cuenta de los 30 días.
- **A revisar aparte (de antes del pacto):** al borrar un vehículo suelto, el RUNT en PDF se borra de Cloudinary quitándole la extensión al `public_id`; en los archivos *raw* la extensión es parte del id, así que puede quedar el PDF. Al eliminar una empresa se hace bien (`eliminarEmpresa.service.js`).

**PC-HU-18 · 2026-09-21**

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 124 de 124 (15 de `buzonReglas`, 1 de `correoReglas` y 1 de `informeReglas` nuevos) · build · lint 34 · aislamiento sin filtraciones · los 8 scripts anteriores en verde · script de HU-18: 51 de 51 · migración `2026-09-19_buzon.sql` probada en un PostgreSQL local (instalación desde cero, dos corridas sobre la base de hoy, límites y cascadas) y corrida por Martín | ✅ |
| HU-18.1 | API: el Coordinador de sede y el equipo SISVIA no escriben (*"Solo el Administrador de empresa puede escribirle a SISVIA."*); tipo desconocido, mensaje vacío y 2.001 caracteres no; 2.000 sí · ventana: el botón en la barra de arriba del Administrador (y "Soporte" en su menú), los 5 tipos y el contador; el Coordinador no ve ni el botón ni el menú, y por la URL vuelve al panel · tests `HU-18.1` | ✅ |
| HU-18.2 | API: un PDF de 5 MB justos pasa; 5 MB + 1 byte, un GIF y un archivo que dice ser PDF sin serlo, no (*"El archivo debe ser una imagen JPG o PNG, o un PDF, de hasta 5 MB."*) · ventana: captura adjunta y enviada · tests `HU-18.2` | ✅ |
| HU-18.3 | API: queda Nuevo con la empresa, quién, su cargo, la pantalla, *"Chrome 140 · Windows"* y la fecha; una "pantalla" que no es de la app no se guarda; al equipo SISVIA le llega a la campanita con el enlace · ventana: *"Mensaje enviado a SISVIA. Te avisamos en la campanita cuando respondan."* y "Ver en Soporte" · tests `HU-18.3` | ✅ |
| HU-18.4 | API: SISVIA ve todas, los nuevos primero, con filtro; al abrirlo pasa a En revisión y baja el número (2 → 1); si lo abre la empresa, no cambia · ventana: "Soporte 1" en el menú, la bandeja con la empresa, y al abrirlo "En revisión" y el número se va · tests `HU-18.4` | ✅ |
| HU-18.5 | API: SISVIA responde sin contraseña aun adentro de la empresa; a quien escribió le llega; la empresa contesta con adjunto y le llega a SISVIA; el hilo en orden · ventana: la respuesta de SISVIA en el hilo · tests `HU-18.5` | ✅ |
| HU-18.6 | API: la empresa no lo marca resuelto (*"Solo el equipo SISVIA marca un mensaje como resuelto."*); resuelto, nadie responde más · ventana: SISVIA confirma (*"¿Marcarlo resuelto? Ya nadie podrá responder en este hilo."*) y la empresa ve *"Resuelto. ¿Sigue pasando? Escribe un mensaje nuevo."* con "Escribir un mensaje nuevo" · tests `HU-18.6` | ✅ |
| HU-18.7 | ventana: "Ver en la empresa" entra a TST A (franja *"Estás viendo TST A como SISVIA"*) y abre `/admin/vehiculos`, desde donde se escribió | ✅ |
| HU-18.8 | API: B no ve, no abre ni responde los mensajes de A (404); la otra Administradora de A sí los ve · ventana: la empresa ve su bandeja y su hilo, sin los datos internos (pantalla y navegador) | ✅ |
| HU-18.9 | ventana: el aviso de placa (*"Esa placa ya está registrada en SISVIA…"*) y el de límite de vehículos y de sedes (*"Tu empresa llegó al límite de 1 vehículo de su plan…"*) traen "Escribir a SISVIA", que abre el formulario encima con "Traspaso de un vehículo" y la placa, o con "Necesito más cupo del plan" | ✅ |
| HU-18.10 | API: con Administrador, el informe va a él y ofrece el resumen; sin él, cae en el equipo SISVIA, no lo ofrece y, aunque lo pidan, llega sin resumen · ventana: *"Se enviará al equipo SISVIA"* y sin la casilla del resumen · test `HU-18.10` | ✅ |
| CB-18 | API: Cloudinary rechaza la imagen: *"No se pudo subir el archivo. Intenta de nuevo o envía el mensaje sin él."* y no queda el mensaje | ✅ |
| CB-19 | API: el autor desactivado no recibe la respuesta; le llega a la otra Administradora de A, que ve el hilo | ✅ |
| CB-20 | API: la empresa desactivada ya no escribe (`empresa_desactivada`) y sus mensajes siguen en la bandeja de SISVIA | ✅ |
| CB-21 | API: "Exportar todo" trae `mensajes_a_sisvia.csv` y `respuestas_a_mensajes.csv`; al eliminar la empresa se van sus mensajes, respuestas y los 3 adjuntos privados | ✅ |
| RNF-10 | API: la empresa abre su PDF de 5 MB entero y SISVIA la captura de una respuesta; otra empresa → 404; sin sesión → 401; en Cloudinary no hay enlace público ni sin firma | ✅ |
| RNF-07 | medidor en Soporte (los dos lados) y en el formulario: 0 fallas en claro y oscuro, también a 390 px | ✅ |

**Hallazgos de la tanda 14**

- **Los avisos del buzón van a todo el equipo SISVIA, también a las cuentas reales de superadmin.** En las primeras corridas les llegaron a Juan Sebastián y a sandra beltran unos 10 avisos de prueba a la campanita (se borraron) y **sus copias por correo, que no se pueden borrar**. Desde ahí el backend de pruebas corre sin credenciales de correo y el script borra al final esos avisos. Además, el servidor ya no le manda correo a dominios reservados para pruebas (`.test`, `.example`, `.invalid`, `.localhost`): los de `@sisvia.test` rebotaban en el Gmail de Martín.
- **La copia por correo hacía esperar a quien escribía** (1 a 2 s por la conexión con Gmail): ahora sale en segundo plano. En la ventana eso llevó a mandar dos veces la misma respuesta.
- **busboy (lo usa multer) da por cortado un archivo apenas llega al tope**, sin saber si vienen más bytes: con el tope en 5 MB, un archivo de 5 MB justos se rechazaba. El tope de multer va 1 byte arriba y los 5 MB los controla `validarAdjunto`, que además mira los primeros bytes del archivo.
- **El formulario quedaba detrás de otro modal:** el botón vive en la barra de arriba (sticky, `z-index: 50`) y el modal adentro no podía quedar encima. Ahora se abre en un portal sobre `document.body`.
- **"Ver en la empresa" terminaba en el panel:** la página Soporte redirigía al superadmin apenas entraba a la empresa, antes de la navegación a la pantalla del mensaje. La protección ahora mira solo el rol.
- **Adjuntos privados:** van a Cloudinary en modo `authenticated` y el servidor los pide con una URL firmada que nunca sale de él. El navegador no recibe el id interno del archivo. Una corrida cortada dejó 2 imágenes sueltas: se borraron, y el script ahora limpia la carpeta de las empresas de prueba aunque se corte.
- **Abrir un mensaje no lo sube en la bandeja:** solo las respuestas y el resuelto cambian su lugar.
- **Arreglos chicos de antes del pacto:** *"notificaciónes"* → *"notificaciones"* en la campanita, y *"Se enviará a el…"* → *"al…"* en el informe. La plantilla del correo de informes escapa solo el mensaje (no el asunto ni el nombre): la nueva del buzón escapa todo; la vieja queda como revisión aparte.
- **Los adjuntos no van en "Exportar todo":** el `.zip` trae los mensajes y las respuestas (con el nombre del adjunto), no los archivos. Son capturas que la empresa le mandó a SISVIA.
- **Ajuste pedido por Martín (2026-09-21), sin cambio de criterios:** el hilo se ve como un chat, según quién mira. Lo de su lado (la empresa, o el equipo SISVIA) va a la derecha y en amarillo; lo del otro lado, a la izquierda y en blanco. El primer mensaje ahora lleva también quién y cuándo. Probado en la ventana desde los dos lados; medidor: 0 fallas en claro y oscuro, a 390, 930 y 1.920 px.
- **Más ajustes pedidos por Martín (2026-09-21), sin cambio de criterios:**
  - **Se actualiza solo:** Martín escribió el reloj (el hilo y la bandeja se vuelven a pedir cada 1 s, solo con la pestaña a la vista). Medido: una respuesta de SISVIA aparece sola del lado de la empresa en 1,2 s. Queda en 1 s por decisión suya (la recomendación fue 3 s el hilo y 10 s la bandeja; lo instantáneo de verdad es Supabase Realtime, ver "Pendientes para escalar").
  - **El hilo se desliza por dentro:** ya no alarga la página. Arranca abajo, en lo último; si llega algo nuevo y estás abajo, baja solo; si subiste a leer, no te arrastra; al responder, siempre baja. Su alto sale de la pantalla (`clamp(260px, 100vh − 600px, 620px)`; en el celular, `clamp(200px, 100dvh − 620px, 60vh)`) para que la caja de responder quede a la vista. Probado en la ventana con 22 mensajes; medidor: 0 fallas en claro y oscuro.
  - **Interruptor del correo:** `CORREO_ACTIVO=0` lo apaga aunque haya credenciales; `1` o sin la variable, encendido (Railway no cambia). Apagado, la campanita sigue igual. Regla pura `estadoDelCorreo` con test, y `.env.example` documentado.
- **Soporte se veía apretado con el menú abierto en una pantalla chica** (a 930 px el hilo quedaba de ~250 px): el paso a una columna ahora mira el espacio de la página (*container query*), no el de la pantalla. Y el botón "Escribir a SISVIA" queda solo con su icono por debajo de 1.100 px, porque el título de la barra se cortaba ("So…").

**Hallazgos de la tanda 15**

- **La copia a la actividad la hace la base, no cada pantalla** (cambia el *cómo* de OB-36, no el *qué*). Cada registro nuevo de vehículos, usuarios y empresas se copia solo a `actividad` (un disparador), con la misma función que copia lo viejo. Así no queda hueco entre que Martín corre la migración y el push (el código de hoy ya alimenta la Actividad), nada nuevo se puede olvidar de registrarse, y correr la migración otra vez no duplica (cada fila guarda de qué registro salió). Si la copia falla, el registro de siempre se guarda igual. `registrarActividad` queda para lo que antes no se registraba: sedes y catálogo propio.
- **Lo que hace el equipo SISVIA dentro de una empresa no se escribe dos veces:** ya queda en su registro de soporte (con contraseña, RN-11). Sedes y catálogo le suman el nombre de lo que tocaron (*"Editó una sede · Sede Norte"*). Sus cambios en vehículos y usuarios se cuentan con su propio detalle y el registro de soporte no se repite.
- **El cambio de rol ahora guarda el rol anterior** en el registro de usuarios: sin eso, la Actividad no podía decir *"Cambió el rol de Ana: Conductor → Coordinador de sede"*. Lo viejo (sin rol anterior) se cuenta como *"Editó a …"*: no se inventa un cambio.
- **Lo que ya estaba registrado y apuntaba a algo eliminado** (un vehículo o una persona borrados antes de hoy) no se puede asignar a ninguna empresa: queda afuera de la copia. Probado en local: de 13 registros de prueba se copiaron los 10 que tenían dueño.
- **La marca también la cuida la base:** a lo sumo una, solo en un Administrador general activo (desactivarla o cambiarle el rol falla), y su cuenta no se borra ni desde el panel de Supabase. El traspaso y su anotación en el registro van en la misma operación. Probado en local: dos traspasos a la vez → uno pasa y el otro recibe `ya_cambio`; nunca quedaron dos dueños ni ninguno. Las llaves públicas no pueden llamar a las funciones nuevas.
- **La contraseña del traspaso no usa el pedido de contraseña de soporte (HU-16):** su error lleva códigos propios, porque los de soporte hacen que el navegador abra el otro modal. `/api/equipo` es "propio" del equipo SISVIA: no pide la contraseña de soporte aunque el dueño esté dentro de una empresa.
- **A quién se le pasa la marca** sale de `GET /api/equipo/candidatos` (Administradores generales activos, menos uno mismo), así la lista no depende de si el dueño está dentro de una empresa.
- **La página de a 50 sigue por la última fila vista** (fecha con microsegundos + id), no por número de página: si llega algo nuevo mientras se lee, "Ver más" no repite ni salta filas. La fecha no pasa por `Date`, que la cortaría a milisegundos.
- **Fechas en hora de Colombia:** "desde" y "hasta" cuentan días enteros de Colombia (00:00 a 00:00 del día siguiente), y la pantalla agrupa por día con la misma zona.
- **La Actividad no va en "Exportar todo"** (acordado en la ronda): el respaldo no se tocó.

**Hallazgos de la tanda 18**

- **Pedido de Martín sobre Mi perfil** (no cambia ninguna historia del pacto): *"si no se ve cambios que el boton de guardar cambios este desactivados y al hacer un cambio tambien toque ingresar la contraseña de uno"*. El campo de la contraseña aparece solo cuando hay algo cambiado; si se deshace el cambio, desaparece. Lo decide el servidor, no solo la pantalla: saltarse el formulario no sirve.
- **Sin cambios no se gasta un intento:** primero se mira si hay algo distinto (con espacios de más o el teléfono escrito de otra forma, no cuenta) y recién después se pide la contraseña. Un fallo cuenta como en el login (5 seguidos bloquean 15 min) y un acierto limpia el contador.
- **Si la contraseña falla, la foto nueva no se vuelve a subir** al reintentar: se reusa la que ya subió.
- **`agent-browser` sigue colgándose:** esta vez la ventana visible se abrió directo con Chrome y un perfil aparte en el scratchpad (`--remote-debugging-port=9333`), manejada con `ventana.cjs`. No toca el Chrome ni el perfil de Martín.

**Hallazgos de la tanda 17**

- **Bug encontrado por Martín, ya corregido:** guardar "Mi perfil" (aunque no se cambiara nada) borraba la marca de dueño de la pantalla hasta recargar. La respuesta de `PATCH /api/auth/mi-perfil` no traía `es_dueno` y el frontend **reemplazaba** el usuario del contexto con esa respuesta. Le pasaba lo mismo, sin que nadie lo notara, al conductor del pool y a su suplencia. Ahora la respuesta trae esos datos y el frontend completa sobre el usuario que ya estaba. La base nunca se tocó: el `PATCH` solo escribe nombre, teléfono y foto.
- **Lo que sí borró la marca en la base fue el botón "Quitarme la marca"**, usado desde la cuenta a la que Martín se la acababa de dar: funcionó como está pactado (pide contraseña y el nombre exacto), pero estaba pegado a los otros dos. Ahora se ve aparte, en rojo, y la contraseña de confirmación ya no se autocompleta sola (`autocomplete="off"`), que era el otro camino para hacerlo sin querer.
- **Los avisos no frenan el cambio de marca:** si la campanita falla, la marca ya cambió igual y queda el aviso en el log.

**Hallazgos de la tanda 16**

- **Varios dueños cambian la forma de mover la marca.** Con uno solo alcanzaba un traspaso; ahora son tres operaciones separadas (dar, pasar, quitarse la propia) y la que hay que cuidar es la última: la base bloquea a todos los dueños mientras uno decide, así que dos (o tres) renunciando al mismo tiempo nunca dejan la app sin dueño. Probado en el PostgreSQL local con tres a la vez: dos salen y el tercero recibe *"ultimo_dueno"*.
- **Nadie le quita la marca a otro desde la app** (decisión de la ronda, recomendación de Claude): sacar a otro dueño desde la app permitiría que alguien con acceso a una cuenta de dueño dejara afuera al fundador. Agregar es reversible; sacar, no. Para sacar a alguien queda la base, a la que solo entra Martín.
- **El aviso de la cuenta protegida cambió** ("Para dejar de ser dueño, quítate la marca"), porque ya no siempre se pasa.
- **La marca de arranque de una cuenta de prueba se pone por SQL**, igual que la primera de HU-20.8: así el punto de control por API corre entero entre cuentas de prueba, sin tocar la de Martín (al final esas cuentas se quitan la marca solas).
- **Cambiar la contraseña de una cuenta invalida sus sesiones abiertas** (Supabase): el script de prueba sacaba la sesión y después cambiaba la contraseña, y todo daba *"Token invalido o expirado"*. Ahora la contraseña se pone al crear la cuenta, antes de pedir la sesión.
- **El nombre de quien hizo cada cosa va primero y en negrita** (pedido de Martín: "solo sale el nombre de la empresa y ya pero no dice quien lo hizo"). El dato ya estaba en las tres pantallas, pero iba debajo, chico y en gris. De paso se le sacó el "·" al cargo: cuando bajaba de línea quedaba colgando al principio.
- **El programa `agent-browser` se colgó toda la sesión** ("Could not configure browser: Invalid response: EOF…", y `open` no devuelve nunca). La ventana de Chrome sí queda abierta y viva, así que las pruebas de pantalla se hicieron manejándola por su puerto de depuración (`scratchpad/pc/ventana.cjs`: ir, js, texto, foto, tamaño, frente). Sirve como plan B mientras Martín revisa la skill.

## 7. Sello

<!-- "Cómo se probó" en una línea; el detalle va al diario (2026-09-18-para-empresas.diario.md), bajo "## Sello · intento N". -->

### Intento 1 · 2026-09-24

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 149 de 149 · lint 34 · build · las 17 pruebas por API en verde (la 1.ª corrida tuvo 2 fallas de los scripts, no del código) | ✅ |
| RNF-03 | revisión del código: doce consultas armaban el filtro de empresa a mano | ❌ → OB-48 |
| RNF-06 | revisión del esquema: 28 de 28 tablas con RLS y 0 políticas | ✅ |

El intento se cortó ahí: se hizo OB-48 y se repitió todo en el intento 2.

### Intento 2 · 2026-09-24 a 2026-09-25

| Qué | Cómo se probó | Resultado |
|---|---|---|
| Suite completa | `npm test` 151 de 151 · lint 34 (= base) · build · 17 pruebas por API contra el código final: 405 comprobaciones, 0 fallas | ✅ |
| HU-01.1 | ventana (SISVIA): lista con estado, uso del plan, filtros y búsqueda · API | ✅ |
| HU-01.2 | ventana: "Nueva empresa" creó TST Ventana y mostró la contraseña temporal · API · tests | ✅ |
| HU-01.3-4 · CB-09 · CB-14 | API (textos exactos, nada a medias, dos pedidos a la vez) · tests | ✅ |
| HU-01.5 | ventana: el Administrador nuevo cae en "Cambia tu contraseña" y después en su panel vacío | ✅ |
| HU-02.1 · CB-10 | ventana: 0 y 2.5 → texto exacto y no se guarda · API · tests | ✅ |
| HU-02.2-4 · CB-02 | tests con N y N+1 · API · ventana: el aviso de límite de 1 vehículo | ✅ |
| HU-02.5 | ventana: "Sedes: 1 de 3 · Vehículos: 1 de 5" en el panel de TST A | ✅ |
| HU-03.1, HU-03.4 | ventana: desactivar y reactivar TST Ventana con sus confirmaciones · API | ✅ |
| HU-03.2 | API: correo y cédula → 403 con el texto exacto · tests | ✅ |
| HU-03.3 · CB-11 · RNF-08 | ventana: con la sesión abierta, la empresa se desactiva y el clic lleva al login con el texto | ✅ |
| HU-04.1-3 · CB-01 | API: el `.zip` abierto y contado, empresa sin chequeos, corte a la mitad · tests | ✅ |
| HU-05.1-2 | ventana: activa → "Primero desactiva la empresa."; desactivada sin respaldo → el texto del respaldo · API | ✅ |
| HU-05.3-4 · CB-07 | API: se borra todo lo suyo; nombre distinto → nada · tests · ventana de PC-HU-05 | ✅ |
| HU-06.1-2 · RNF-04 | script de aislamiento: sin filtraciones | ✅ |
| HU-06.3-5 · CB-15 | API · tests | ✅ |
| HU-06.6 | ventana: el menú de afuera · API | ✅ |
| HU-07.1-5 · CB-06 · RNF-09 | PC-HU-07: migración corrida por Martín en producción (2026-09-18), conteos iguales | ✅ |
| HU-08.1,4 · CB-16 | ventana: el nombre de TST A en menú y pie, "SISVIA" afuera, 360 px con "…" · tests | ✅ |
| HU-08.2 | ventana: el PDF abierto dice "TST A · Regional Amazonas · TST Sede A"; el Word, lo mismo por dentro | ✅ |
| HU-08.3 | test `HU-08.3` · API | ✅ |
| HU-09.1-2,4 | ventana: menú de TST A, cargos del alta, 33 departamentos y solo sus sedes | ✅ |
| HU-09.3 · CB-13 · CB-17 | API · tests | ✅ |
| HU-10.1-3 · CB-12 | ventana: con 1 sede solo Conductor, con 2 los tres · API · tests | ✅ |
| HU-11.1-2 | ventana: afuera solo el equipo SISVIA; "Ver sus usuarios" entra con la franja · API | ✅ |
| HU-12.1,3 · CB-05 | API · tests | ✅ |
| HU-12.2 | ventana: lo base con "Base" y sin botones | ✅ |
| HU-13.1-2,4 · CB-08 | API · tests | ✅ |
| HU-13.3 · CB-03 | ventana: el chequeo viejo muestra el ítem ya apagado · API | ✅ |
| HU-13.5 | ventana: el Coordinador ve *"Solo lectura…"* · API · test | ✅ |
| HU-14.1-3 · CB-04 | ventana: "Bloqueado para esta empresa" con "Desbloquear" · API · tests | ✅ |
| HU-15.1-3 | ventana: la aptitud "1 DE 6" y TST GRÚA solo con el gancho · tests RN-07 | ✅ |
| HU-16.1,4 | ventana: la franja, su menú, solo sus sedes y "Salir" | ✅ |
| HU-16.2-3 | ventana: el pedido de contraseña y el cancelar · API · Martín con su contraseña (2026-09-19) | ✅ |
| HU-16.5 | API: 5 malas bloquean · test · ventana de las enmiendas (2026-09-19) | ✅ |
| HU-17.1-4 | API · tests · ventana de PC-HU-17 | ✅ |
| HU-18.1-3,9 | ventana: el formulario, los atajos de placa y de límite, el envío con adjunto · API · tests | ✅ |
| HU-18.4-8 | ventana, los dos lados: En revisión, respuesta, Resuelto, "Ver en la empresa" · API · tests | ✅ |
| HU-18.10 | API · test · ventana de PC-HU-18 | ✅ |
| CB-18 a CB-21 · RNF-10 | API · test `CB-18` | ✅ |
| HU-19.1-3 | ventana: la Actividad y el Registro del equipo con el nombre primero · API · tests | ✅ |
| HU-19.4 | ventana: cada filtro, persona, fechas y "Ver más" | ✅ |
| HU-19.5-6 · CB-24 · CB-25 · RNF-11 | API (10.000 registros: ~300 ms por página) · tests | ✅ |
| HU-20.1-4 | ventana: Registro del equipo, "Dueño de SISVIA" sin Desactivar ni Eliminar · API · tests | ✅ |
| HU-20.5 | ventana: "Dar la marca…" hasta la contraseña · API · Martín con su contraseña (2026-09-23) | ✅ |
| HU-20.6-8 · CB-22 · CB-23 | API · tests | ✅ |
| HU-20.9 | Martín corrió su marca por la cédula (2026-09-22) | ✅ |
| RNF-01 · RNF-02 | API: panel con 150 vehículos, peor 1.619 ms; "Exportar todo" con 1.000 chequeos, 36,2 s | ✅ |
| RNF-03 | revisión: 0 filtros de empresa armados a mano fuera de `scopeReglas.js` · 8 tests | ✅ |
| RNF-05 | API: cada acción queda en el registro · test | ✅ |
| RNF-06 | el esquema no cambió desde la revisión del intento 1 | ✅ |
| RNF-07 | medidor: 0 fallas de contraste en 20 mediciones, claro y oscuro | ✅ |
| Lo que ya funcionaba | suite · chequeo del conductor, panel y exportaciones probados hoy (el código no distingue a la empresa inicial) | ✅ |
| Cláusulas | CL-13 (RNF-03) · CL-02 (HU-08) · CL-07 (RNF-07) · CL-09 (RNF-06) · CL-10 (la contraseña con un cliente aparte) · CL-12 (textos en español: el voseo pasó al tuteo) | ✅ |

**Pacto sellado · 2026-09-25**

- **Qué se entregó:** SISVIA pasó a ser una sola app para muchas empresas. Cada una ve solo lo suyo y tiene su plan (sedes y vehículos), su Administrador, su catálogo propio y su nombre en la app y en los documentos. El equipo SISVIA las da de alta, las desactiva, las exporta y las elimina, y entra a cada una con contraseña y registro. Hay placa única con baja por traspaso, "Escribir a SISVIA" con su bandeja, la Actividad de cada empresa, y la marca "Dueño de SISVIA" (puede haber varios) con su Registro del equipo.
- **Qué quedó afuera:** lo de SRS 3.N (cobrar dentro de la app, la Actividad en "Exportar todo", el registro público de empresas, logo y colores por empresa) y los pendientes para escalar (nota del cerebro).
- **Incumplimientos:** uno, RNF-03 en el intento 1 (el filtro de empresa armado a mano en doce consultas) → OB-48.
- **De yapa, con el OK de Martín:** seis textos en voseo pasaron al tuteo.
- **Falta de Martín, fuera del sello:** el push, y después borrar `ORG_NOMBRE` y `VITE_ORG_NOMBRE` de Railway y Cloudflare.

## 8. Enmiendas

| N | Fecha | Qué cambió | Motivo (pedido textual) | Obligaciones afectadas | Firma |
|---|---|---|---|---|---|
| 1 | 2026-09-19 | **CB-02 cambia:** el superadmin no puede bajar un límite por debajo de lo que la empresa ya tiene activo (antes: se permitía y solo frenaba las altas nuevas). Texto propuesto en la ronda. | *"si antes una empresa tenia 3 sedes yo cree 2 en total y despues edito la empresa y la bajo a 1 sede entonces el baja pero queda la otra sede hay creada superpuesta entonces toca colocar una validacion en esa parte"* | OB-11 (se reabre), test `CB-02` | Martín · 2026-09-19 |
| 2 | 2026-09-19 | **CB-17 nuevo · HU-09:** la empresa nunca queda sin Administrador de empresa activo: no se puede eliminar, desactivar ni cambiar de rol al último. | *"si la empresa esta creada y tiene 1 solo dueño ese dueño no se puede eliminar porque quedaria como una empresa fantasma"* | OB-27 nueva | Martín · 2026-09-19 |
| 3 | 2026-09-19 | **Sin cambio de criterios:** la geografía trae los 1.122 municipios de Colombia (antes, solo las capitales). | *"agregar todas las ciudades a sus departamentos para que cuando la empresa este creando su sede pueda encontrar su ciudad"* | migración `2026-09-19_municipios.sql` (la corre Martín) | OK de Martín en su pedido |
| 4 | 2026-09-19 | **Cómo se prueba HU-16.2-3:** `[api + ventana]` → `[api + ventana + Martín]`: Claude no escribe contraseñas en un campo (regla de seguridad que no se levanta ni con permiso); llega hasta el pedido y lo cancela, y Martín escribe la contraseña. | *"para que las pruebas sean mejores tambien ingrese las contraseña"* (Claude explicó por qué no puede) | ninguna | Martín · 2026-09-19 |
| 5 | 2026-09-19 | **HU-18 nueva (Should) · Escribir a SISVIA:** el Administrador de empresa le escribe a SISVIA (tipo, texto, un adjunto y datos que se llenan solos) y el equipo SISVIA responde desde una bandeja con estados. El informe que cae en el equipo SISVIA deja de ofrecer el resumen del área. Pasó al SRS 2.2. | *"como superadmin cuando nos hagan un informe no veo necesario que nos envien el resumen del area porque eso es informacion no necesaria lo que si podria ser es el texto y depronto que puedan enviar una foto o documento [...] si se comunican por ese medio se comunicarian para errores creeria yo"* · ronda del 2026-09-19: escribe solo el Administrador de empresa; SISVIA responde en la app con estados; entra en este pacto: *"que todo quede ahora no importa si el push se demora"* | obligaciones nuevas al firmar · **se tocan, sin reabrir nada hecho:** OB-24 (HU-17.1: el aviso de la placa lleva a este canal), OB-25 (HU-04: el .zip incluye los mensajes), OB-26 (HU-05: se borran con la empresa) → se hace en OB-34 | Martín · 2026-09-19 |
| 8 | 2026-09-22 | **Avisos al cambiar la marca** (enmienda chica, con el OK de Martín): la campanita avisa a quien recibe la marca y a los demás dueños. Pasó al SRS 2.6 como HU-20.8. | *"tambien toca colocar las notificaciones de cuando se coloca otro dueño para ver si sirvio"* | OB-45 · y con él OB-46, el arreglo del perfil | Martín · 2026-09-22 (OK, sin nueva firma) |
| 7 | 2026-09-22 | **Varios dueños de SISVIA** (enmienda chica sobre una historia Should, con el OK de Martín): la marca se le puede dar a otra cuenta sin quitarse la propia; cada dueño solo se quita la suya y el último no puede; en la Actividad, quién lo hizo va primero. Pasó al SRS 2.5. | *"a la vez permita que sea mas de 1 solo dueño porque si por ejemplo la empresa creciera y se vendiera la mitad entonces hay tendria otro dueño"* · *"tambien falta que diga quien hizo el cambio"* · ronda del 2026-09-22: el nombre primero y en negrita · dos botones separados (dar / pasarle la mía) · quitar la marca solo la propia (recomendación de Claude por seguridad: sacar a otro desde la app permitiría un secuestro de la cuenta) · la cuenta `segundo@gmail.com` queda también como dueña | OB-41 a OB-44 · se reabre PC-HU-20 | Martín · 2026-09-22 (OK, sin nueva firma) |
| 6 | 2026-09-21 | **HU-19 y HU-20 nuevas (Should):** "Actividad" de la empresa (lo que hizo su gente y lo que hizo el equipo SISVIA en su cuenta) y la marca **"Dueño de SISVIA"** con su "Registro del equipo". Pasó al SRS 2.3. | *"los registros de actividad [...] para que los de alto rango sepa que se hace en la pagina"* · *"que en si seria como para el dueño general de la pagina osea yo tener su propio rol [...] el super admin ve todos los movimientos que se haga mientras que los demas no"* · ronda del 2026-09-21: marca en la cuenta en vez de un rol nuevo; la empresa ve lo que hizo SISVIA; la Actividad la ve solo el Administrador de empresa; el traspaso de dueño se hace desde la app, solo el dueño; no va en "Exportar todo" | obligaciones nuevas al firmar · **se toca, sin reabrir nada hecho:** la eliminación de empresas (HU-05) borra también su actividad → se hace en OB-40 | Martín · 2026-09-21 |

### Enmienda 5 · firmada 2026-09-19

HU-18, RN-12, RN-13, CB-18 a CB-21 y RNF-10 pasaron al SRS 2.2 (§3.5, reglas de negocio, §4.2 y §6). Respuestas de la ronda: el botón va en la **barra de arriba** (así el mensaje sabe desde qué pantalla se escribió) y la conversación es un **hilo** hasta que SISVIA la marca Resuelta.

### Enmienda 6 · firmada 2026-09-21

HU-19, HU-20, RN-14, RN-15, CB-22 a CB-25 y RNF-11 pasaron al SRS 2.3 (§3.6, reglas de negocio, §4.1 y §6). Respuestas de la ronda: la Actividad **no** trae los chequeos (tienen su pantalla) y **sí** muestra lo ya registrado desde antes.
