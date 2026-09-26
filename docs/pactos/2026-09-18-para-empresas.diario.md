---
pacto: para-empresas
---

# Diario · SISVIA para empresas

> Evidencia de cada punto de control y de cada intento de sello. **No se lee para retomar**: lo
> pactado y el estado viven en el pacto (`2026-09-18-para-empresas.md`). Acá se busca cuando hace
> falta saber qué se probó y cómo.
>
> El diario nace en el sello (pacto-skill 1.1). La evidencia de las tandas 1 a 18 sigue en el pacto,
> sección 6; mudarla acá quedó propuesto en "Aclaraciones".

## Sello · intento 1 · 2026-09-24

- **Suite:** `npm test` 149 de 149 · lint 34 (= base) · build OK.
- **Pruebas por API** (`scratchpad/pc/sello.cjs`: las 17 corridas seguidas contra un backend de pruebas en `:3002` con `CORREO_ACTIVO=0`, cada una con sus empresas `TST A` y `TST B` y borrándolas al final):
  - 1.ª corrida: 15 de 17. `pc-hu19` tenía 6 textos y rutas viejos (de antes de la enmienda 7): se corrigió **el script**, el código cumplía. El aislamiento chocó con una `TST A` que había quedado de la prueba anterior: el runner ahora limpia antes de ese paso.
  - 2.ª corrida: 17 de 17 (dos pruebas se repitieron sueltas por el límite de pedidos de Supabase Auth: *"Request rate limit reached"*).
- **RNF-03 · ❌ → OB-48.** La revisión del código encontró doce consultas que armaban el filtro de empresa a mano (`.eq('empresa_id', …)`) en usuarios, empresas, catálogo, bloqueos, eliminar empresa, alcance y la Actividad, y una regla "base o de la empresa" repetida en el catálogo. Nada filtraba mal (el aislamiento daba verde), pero RNF-03 pide un único filtro. Se hizo OB-48 (`deLaEmpresa` y `baseODeLaEmpresa` en `scopeReglas.js`, con 2 tests nuevos) y el intento se cortó ahí para repetir todo.
- **RNF-06:** 28 de 28 tablas con RLS activo y 0 políticas; el backend entra con `service_role`.

## Sello · intento 2 · 2026-09-24 a 2026-09-25

### Código y suite

- **Suite:** `npm test` 151 de 151 · lint 34 (= base, ninguno nuevo) · build OK. Repetido el 2026-09-25 después de corregir los textos en voseo: igual.
- **RNF-03:** `grep` de filtros de empresa armados a mano en `backend/src` (fuera de `scopeReglas.js` y los tests): 0. Tests del filtro: 8 con `RNF-03` en el nombre.
- **RNF-06:** el esquema no cambió desde el 2026-09-22 (última migración); la revisión del intento 1 sigue valiendo.
- **Criterios `[test]`:** cada uno tiene su test con el ID en el nombre (HU-02.2-4, HU-06.5, HU-08.3, HU-10.1-2, HU-14.1-3, HU-15.1-3, HU-18.1-6/10, HU-19.1-5, HU-20.1-2/4-7, CB-02, CB-10, CB-15, CB-17, CB-18, CB-22 a CB-24). HU-10.3 no tiene uno propio: lo cubren `HU-10.1` (con 1 sede no se crea otro) y la sección "HU-10.3 · CB-12" del script de HU-10.

### Por API · 2026-09-25 (backend arrancado a las 14:35, con el código final del 2026-09-24 14:39)

`sello.cjs` → **17 de 17, 405 comprobaciones, 0 fallas** (`scratchpad/pc/sello/corrida3.txt`):

| Script | Qué cubre | Resultado |
|---|---|---|
| `pc-empresas` | HU-01 a HU-03, CB-02, CB-09, CB-10, CB-14 | 33 de 33 |
| `pc-hu16` | HU-16, RN-11, HU-06.6 | 22 de 22 |
| `pc-enmiendas` | CB-02, CB-17, HU-16.5 | 19 de 19 |
| `pc-catalogo` | HU-12 a HU-15, CB-03 a CB-05, CB-08 | 39 de 39 |
| `pc-hu08` | HU-08 | 10 de 10 |
| `pc-hu10` | HU-10, CB-12 | 12 de 12 |
| `pc-hu11` | HU-11 | 6 de 6 |
| `pc-hu17` | HU-17 | 24 de 24 |
| `pc-hu04` | HU-04, CB-01, RNF-05 | 20 de 20 |
| `rnf02` | RNF-01: panel con 150 vehículos en 1.619 / 1.124 / 1.481 ms (tope 2.000) · RNF-02: `.zip` de 18,0 MB con 1.000 PDF y 39.000 respuestas en 36,2 s (tope 120 s) | 2 de 2 |
| `pc-hu05` | HU-05, CB-07 | 19 de 19 |
| `pc-hu18` | HU-18, CB-18 a CB-21, RNF-10 | 51 de 51 |
| `pc-hu19` | HU-19, CB-24, CB-25, RNF-11 (10.000 registros: páginas de 50 en ~300 ms), HU-20.2, HU-20.4 | 82 de 82 |
| `pc-hu20` | HU-20.1-7, CB-22, CB-23 | 38 de 38 |
| `pc-enmienda8` | HU-20.8 y el perfil que borraba la marca | 16 de 16 |
| `pc-perfil` | Mi perfil (OB-47) | 12 de 12 |
| `probar-aislamiento` | HU-06.1-2, RNF-04 | *"Sin filtraciones: ninguna empresa ve datos de la otra."* |

### En la ventana (`navegador-visible`, app de pruebas en `:5175` contra el backend de `:3002`)

**Lado empresa, 2026-09-24** (sesiones cargadas de cuentas `@sisvia.test`, sin escribir contraseñas):

- HU-02.5 · el panel del Administrador de TST A: *"Sedes: 1 de 3 · Vehículos: 1 de 5 · Para ampliar tu plan, comunícate con SISVIA."*
- HU-08.1 · HU-09.1 · el menú de TST A y su nombre en la cabecera y el pie.
- HU-10.1-2 · con 1 sede el Cargo ofrece solo Conductor; con la segunda (creada por script), Director Regional, Coordinador de sede y Conductor.
- HU-09.2 · el alta ofrece solo sus 2 sedes, con el aviso de ciudades compartidas.
- HU-13.5 · el Coordinador: *"Solo lectura: los cambios los hace el Administrador de empresa."*
- HU-03.3 · CB-11 · RNF-08 · con la sesión abierta, TST B se desactivó por script y el clic siguiente llevó al login con *"Tu empresa está desactivada. Comunícate con SISVIA."* y el token borrado (TST B se reactivó después).
- CB-16 · a 360 px, "TST A Transportes Intermunicip…" con "…" y sin desborde (después se devolvió el nombre y los 1.280 × 800).

**Lado empresa, 2026-09-25:**

- HU-08.2 · el PDF del chequeo de TST A (bajado por script, sin descarga del navegador) abierto en la ventana: *"TST A · Regional Amazonas · TST Sede A"*; el Word dice lo mismo por dentro y no *"Mi organización"*.
- HU-12.2 · las 5 categorías y los 39 ítems base con "Base" y sin botones; solo los 3 ítems propios tienen Editar.
- HU-13.3 · CB-03 · el chequeo viejo sigue mostrando *"TST Extintor extra · Cumple"* con el ítem ya apagado. (Sus contadores de arriba dicen 0: ese chequeo lo insertó el script sin pasar por el cierre, que es quien los guarda. No es un error de la app.)
- HU-09.4 · Geografía: 33 departamentos y solo las 2 sedes de TST A.
- HU-15.1 · la aptitud del conductor: *"1 DE 6"* (5 base + la propia *"TST ¿Revisó el arnés de seguridad?"*).
- HU-15.3 · el chequeo del camión: NIVELES 4 ítems (sin el base bloqueado), PEDALES 3, LUCES 7, SEGURIDAD VIAL 8, VARIOS 16 y **TST GRÚA solo con *"TST Gancho de la grúa sin fisuras"*** (ni el casco de motos ni el extintor apagado). "Finalizar chequeo" abre su confirmación; no se cerró (dato de prueba).
- HU-18.1 · el formulario con los 5 tipos, *"0 de 2.000 caracteres"* y el adjunto de 5 MB; el Coordinador no ve ni el botón ni "Soporte", y por la URL vuelve al panel.
- HU-18.9 · el aviso de placa (*"Esa placa ya está registrada en SISVIA. Si el vehículo ahora es de tu empresa, comunícate con SISVIA."*) abre el formulario con "Traspaso de un vehículo" y la placa; el de límite (*"Tu empresa llegó al límite de 1 vehículo de su plan. Para ampliarlo, comunícate con SISVIA."*) con "Necesito más cupo del plan". No se creó ningún vehículo.
- HU-18.2-3 · enviado con una captura PNG: *"Mensaje enviado a SISVIA. Te avisamos en la campanita cuando respondan."* y "Ver en Soporte"; en la base quedó Nuevo, pantalla `/admin/vehiculos`, *"Chrome 153 · Windows"* y el adjunto de 47.369 bytes.
- HU-19.4 · la Actividad con 61 filas de prueba: 50 y "Ver más" → 61 y *"Esto es todo lo registrado."*; Sedes 1, Usuarios 2, Catálogo 1, Equipo SISVIA 1, Vehículos 50 con "Ver más"; persona "coordinador" (minúsculas) → 19; desde y hasta el 23 → solo sus 12; "Limpiar filtros".
- HU-19.1 · el nombre primero y en negrita, con el cargo, y el texto de cada acción.
- HU-18.6 · HU-18.8 · la empresa ve su hilo *"Resuelto. ¿Sigue pasando? Escribe un mensaje nuevo."* con "Escribir un mensaje nuevo", la respuesta de SISVIA y sin los datos internos (pantalla y navegador).
- RNF-07 · medidor en Actividad, Mi perfil, Soporte y Catálogo (claro y oscuro, 1.280 y 390 px) y en el inicio del conductor y su aptitud (claro y oscuro, 931 px): **0 fallas de contraste en 20 mediciones**, sin desborde. Los controles de menos de 44 px son de administración (el pedido de 44 px es para el conductor); en el conductor, solo el botón de tema (28 px), que es de antes de este pacto.

**Lado SISVIA, 2026-09-25** (Martín inició sesión él en la ventana; Claude solo navegó y canceló lo que pedía contraseña):

- HU-08.4 · HU-06.6 · afuera, "SISVIA" en la cabecera y el pie, y el menú de afuera (Empresas, usuarios, geografía, catálogo, Registro del equipo, Soporte, avisos, ajustes, perfil).
- HU-01.1 · la lista con Activa, "Sedes: 2 de 3 · Vehículos: 1 de 5", los filtros Todas / Activas / Desactivadas y la búsqueda ("tst b" → solo TST B).
- HU-05.1 · TST A activa: *"Primero desactiva la empresa."* y "Eliminar empresa" deshabilitado.
- HU-02.1 · CB-10 · 0 y 2.5 → *"El límite debe ser un número entero de 1 en adelante."*; en la base los límites siguieron en 3 y 5.
- HU-11.1 · afuera, *"Equipo SISVIA · la gente de cada empresa se ve entrando a ella, desde Empresas"*, los 3 del equipo, y el alta ofrece solo "Administrador general".
- HU-20.3-4 · la fila de Martín con *"Dueño de SISVIA"* y sin Desactivar ni Eliminar; las otras dos sí los tienen.
- HU-20.1 · el Registro del equipo con lo de cada persona (en empresas y con las cuentas del equipo); los filtros por empresa ("tst") y por persona ("segundo").
- HU-20.3,5 · Mi perfil: "Guardar cambios" apagado con *"No hay cambios para guardar."*, y los tres botones de la marca. "Dar la marca…" ofrece a los 2 Administradores generales activos sin marca; con uno elegido pide su nombre exacto y la contraseña, con "Dar la marca" apagado. Se canceló.
- HU-18.4 · "Soporte 1" en el menú; la bandeja con el de TST A arriba como Nuevo; al abrirlo, "En revisión" y el menú pasa a "Soporte".
- HU-18.5 · la respuesta de SISVIA (texto TST) aparece en el hilo con el nombre de Martín.
- HU-18.6 · *"¿Marcarlo resuelto? Ya nadie podrá responder en este hilo."* → "Resuelto", sin caja para responder.
- HU-18.7 · HU-16.1 · "Ver en la empresa" → `/admin/vehiculos` de TST A con *"Estás viendo TST A como SISVIA"*, su menú y su nombre.
- HU-16.1 · el alta de vehículo adentro ofrece solo las 2 sedes de TST A (la de TST B está en la misma ciudad).
- HU-16.2 · al guardar: *"Vas a crear un vehículo en TST A, como SISVIA. Queda registrado con tu nombre."* con "Confirmar" apagado; Cancelar → *"Cancelaste el cambio: no se guardó nada."* y siguió 1 vehículo.
- HU-14.1 · adentro, *"Líquido refrigerante de radiador · Base · Bloqueado para esta empresa"* con "Desbloquear"; los otros 38 base con "Bloquear" (no se tocó).
- HU-11.2 · ficha → "Ver sus usuarios": entra con la franja, solo las 3 personas de TST A, y el Cargo ofrece Administrador de empresa, Director Regional, Coordinador de sede y Conductor.
- HU-16.4 · "Salir" → Empresas, sin franja y con "SISVIA" arriba.
- **La pantalla de Empresas cambió el 2026-09-21, después de PC-HU-01-03**, así que se repitió:
  - HU-01.2 · "Nueva empresa" creó *TST Ventana* con su Administrador (`@sisvia.test`) y mostró *"Se generó una contraseña temporal para TST Admin Ventana…"*; en la lista, Activa, "Sedes: 0 de 2 · Vehículos: 0 de 3".
  - HU-03.1 · *"¿Desactivar TST Ventana? Sus usuarios no podrán entrar hasta que la reactives… No se borra ningún dato."* → "Desactivada", los mismos números.
  - HU-05.2 · desactivada y sin respaldo: *"Antes de eliminar, genera el respaldo con «Exportar todo» y envíaselo a la empresa."* y el botón apagado.
  - HU-03.4 · *"¿Reactivar TST Ventana? Sus usuarios vuelven a entrar como antes, con todos sus datos."* → Activa.
  - HU-01.5 · su Administrador (sesión por enlace mágico) cae en *"Cambia tu contraseña"* sin menú; tras cambiarla por la misma ruta que usa esa pantalla, llega al panel vacío con "TST Ventana" arriba y "Sedes: 0 de 2 · Vehículos: 0 de 3".

**Lo que no se repitió en la ventana** (su pantalla no cambió después de su punto de control, y la API de hoy lo cubre): HU-05.3-4 (PC-HU-05), HU-16.3,5 (enmiendas del 2026-09-19 y la prueba de Martín), HU-17.2-4 (PC-HU-17), HU-18.10 (PC-HU-18). HU-07, CB-06 y RNF-09 son de la migración que Martín corrió en producción el 2026-09-18 (PC-HU-07).

### Qué falló y cómo se arregló

- **Textos en voseo** (encontrados en la ventana): *"contanos"*, *"Vos seguís siendo dueño."* y *"vos dejás de serlo"* (de este pacto) y tres de la suplencia (*"Elegí…"*, *"Entrá a un sede… podés volver acá"*, *"Si la dejás vacía"*). Con el OK de Martín se pasaron al tuteo del resto de la app (y "un sede" → "una sede"). Ningún criterio ni test los fijaba. Suite, lint y build repetidos: iguales.
- **agent-browser:** tres veces una espera (`wait`) que no se cumplía relanzó Chrome y dejó la ventana en blanco, sin sesión; una de esas veces se perdió la de Martín y él volvió a entrar. Desde ahí, sin `wait`: acción, pausa corta y `eval`. `fill` no escribe en los campos de fecha: se tecleó dígito por dígito.
- **Los tokens de prueba duran 1 hora:** uno vencido mandó la ventana al login; se regeneraron por enlace mágico.

### Limpieza (2026-09-25)

- `empresas-prueba.cjs borrar` → 0 empresas TST y 0 cuentas `@sisvia.test`; 0 filas de Actividad y 0 mensajes TST.
- **28 avisos de la campanita** que las pruebas de la marca (HU-20.5-8) le dejaron a Martín entre el 23 y el 25, nombrando a cuentas "TST …": borrados. Los scripts de la marca no los limpiaban (los del buzón sí).
- Cloudinary: la captura del mensaje de la ventana quedó suelta (la empresa se borró directo en la base, sin "Eliminar empresa"): borrada. 0 adjuntos de empresas que ya no existen.
- El único dueño de SISVIA sigue siendo Martín. Servidores de prueba apagados, ventana cerrada, archivos de sesión y tokens borrados del scratchpad.
