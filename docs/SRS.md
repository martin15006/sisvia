# SRS · SISVIA para empresas (versión 2.7 · sellado)

> Formato de Martín. Es la parte "qué" del pacto `para-empresas` (`docs/pactos/2026-09-18-para-empresas.md`).
> Cómo se prueba cada criterio está en el archivo del pacto, no acá.
> Las ideas salen de las conversaciones del 2026-09-16 al 2026-09-18 (resumen en el cerebro: Proyectos/SISVIA, "SISVIA para empresas").

## Índice

1. Visión general · 2. Roles y permisos · 3. Requerimientos funcionales · 4. No funcionales · 5. Arquitectura · 6. Casos borde · Anexo A

### Glosario

| Término | Qué es |
|---|---|
| **Empresa** | Un cliente de SISVIA. Tiene sus sedes, usuarios, vehículos, chequeos y catálogo propio. |
| **Superadmin** | El equipo de SISVIA (Martín y su gente). Está por encima de todas las empresas. Hoy se llama "Administrador general". |
| **Administrador de empresa** | Rol nuevo: el dueño o encargado de una empresa. Ve y maneja toda su empresa, en todas sus regiones. |
| **Sede** | Una sucursal de una empresa, en una ciudad. Siempre pertenece a una sola empresa. |
| **Geografía** | Regiones, departamentos y ciudades de Colombia. Es la misma para todas las empresas. |
| **Catálogo base** | Categorías, ítems del chequeo y preguntas de aptitud que maneja el superadmin y ven todas las empresas. |
| **Catálogo propio** | Lo que una empresa agrega para ella sola. |
| **Bloqueo** | Un elemento del catálogo base que el superadmin le oculta a una empresa puntual. |
| **Límite de sedes / de vehículos** | El máximo que una empresa puede tener activo. Lo pone el superadmin. |
| **Respaldo** | El archivo "Exportar todo" con los datos de una empresa. |

## 1. Visión general del proyecto

### 1.1 Problema que resuelve

Hoy SISVIA sirve a **una sola organización por instalación**: su nombre sale de una variable de entorno y todos los datos son de ella. Para vender el producto a varias empresas habría que desplegar una copia por cliente, con su propia base y su propio mantenimiento. Además, el catálogo del chequeo es uno solo y lo edita cualquier Coordinador de sede, así que una empresa no puede adaptarlo sin cambiárselo a las demás.

### 1.2 Objetivo general

Que **una sola instalación de SISVIA sirva a muchas empresas**, cada una viendo solo lo suyo y con los mismos roles adentro, y que el equipo de SISVIA administre las empresas, sus límites y el catálogo base desde la misma app.

### 1.3 Objetivos medibles

- **O1** · Ningún usuario de una empresa ve ni modifica datos de otra, por ninguna pantalla ni llamada a la API.
- **O2** · Dar de alta una empresa con su administrador lleva menos de 2 minutos desde el módulo Empresas.
- **O3** · Los datos que existen hoy pasan a una empresa inicial sin perder nada: mismos conteos de sedes, usuarios, vehículos y chequeos antes y después.
- **O4** · Una empresa nunca supera sus límites de sedes y vehículos activos.
- **O5** · Cada empresa puede tener catálogo propio sin cambiar lo que ven las demás.

### 1.4 Alcance del sistema

**Incluye:** módulo Empresas (alta, límites, desactivar, exportar todo, eliminar), rol Administrador de empresa, separación de los datos por empresa, roles según la cantidad de sedes, catálogo por empresa (propio y bloqueos), nombre de la empresa en la app y en los documentos, y el paso de los datos actuales a una empresa inicial.

**No incluye:** cobros ni facturación dentro de la app, que una empresa se registre sola, un logo por empresa, dominios o subdominios por empresa, y una persona trabajando en dos empresas (ver 3.N).

## 2. Roles y permisos de usuario

### 2.1 Roles

| Rol | Alcance | Qué hace |
|---|---|---|
| **Superadmin** (equipo SISVIA) | Todas las empresas | Crea y administra empresas y sus límites, maneja el catálogo base y los bloqueos, maneja la geografía y los usuarios del equipo SISVIA. Entra a cualquier empresa para ver y ajustar su información; lo que cambia adentro pide su contraseña y queda registrado (HU-16). |
| **Administrador de empresa** *(nuevo)* | Toda su empresa | Maneja sus sedes, usuarios, vehículos y catálogo propio. Ve el panel y los chequeos de toda su empresa. |
| **Director Regional** | Las sedes de su empresa en su departamento | Igual que hoy, pero solo dentro de su empresa. |
| **Coordinador de sede** | Su sede | Igual que hoy. Ya no edita el catálogo. |
| **Conductor** | Sus chequeos | Igual que hoy. El conductor pool suple solo sedes de su empresa. |

Con **una sola sede activa**, la empresa solo tiene Administrador de empresa y Conductor. Con dos o más, se habilitan Director Regional y Coordinador de sede (RN-04).

### 2.2 Matriz de permisos

| Acción | Superadmin | Admin. de empresa | Director Regional | Coordinador | Conductor |
|---|---|---|---|---|---|
| Crear, editar, desactivar y eliminar empresas | ✅ | — | — | — | — |
| Poner límites de sedes y vehículos | ✅ | — | — | — | — |
| Crear usuarios del equipo SISVIA | ✅ | — | — | — | — |
| Crear Administradores de empresa (una empresa puede tener varios) | ✅ | — | — | — | — |
| Crear usuarios de su empresa (roles inferiores) | ✅ | ✅ | ✅ (sus sedes) | ✅ (conductores de su sede) | — |
| Crear y editar sedes (hasta el límite) | ✅ dentro de la empresa, con verificación | ✅ | — | — | — |
| Crear y editar vehículos | ✅ | ✅ | ✅ (sus sedes) | ✅ (su sede) | — |
| Regiones, departamentos y ciudades | ✅ | — | — | — | — |
| Catálogo base | ✅ | ver | ver | ver | — |
| Catálogo propio de la empresa | ✅ | ✅ | ver | ver | — |
| Bloquear elementos base a una empresa | ✅ | — | — | — | — |
| Ver datos de las empresas (soporte y seguimiento) | ✅ todo, entrando a cada empresa (HU-16) | su empresa | sus sedes | su sede | lo suyo |
| Dar de baja un vehículo por traspaso | ✅ dentro de la empresa, con verificación | — | — | — | — |
| Escribirle a SISVIA (HU-18) | responde, desde "Soporte" | ✅ | — | — | — |
| Ver los mensajes a SISVIA | ✅ todos | los de su empresa | — | — | — |
| Ver la actividad de la empresa (HU-19) | ✅ entrando a la empresa (HU-16) | ✅ | — | — | — |
| Ver el registro del equipo SISVIA (HU-20) | solo la cuenta del **dueño de SISVIA** | — | — | — | — |
| Pasar la marca de dueño (HU-20) | solo el dueño, a otro Administrador general activo | — | — | — | — |
| Hacer chequeos | — | — | — | — | ✅ |

## 3. Requerimientos funcionales

### 3.0 Resumen

| HU | Título | Módulo | Prioridad |
|---|---|---|---|
| HU-01 | Crear una empresa con su administrador | F1 Empresas | Must |
| HU-02 | Límites de sedes y vehículos | F1 Empresas | Must |
| HU-03 | Desactivar y reactivar una empresa | F1 Empresas | Must |
| HU-04 | Exportar todo de una empresa | F1 Empresas | Should |
| HU-05 | Eliminar una empresa con respaldo previo | F1 Empresas | Should |
| HU-06 | Cada empresa ve solo lo suyo | F2 Separación | Must |
| HU-07 | Los datos de hoy pasan a una empresa inicial | F2 Separación | Must |
| HU-08 | El nombre de la empresa en la app y en los documentos | F2 Separación | Must |
| HU-09 | El Administrador de empresa maneja su empresa | F3 Roles | Must |
| HU-10 | Roles según la cantidad de sedes | F3 Roles | Should |
| HU-11 | Usuarios del equipo SISVIA | F3 Roles | Should |
| HU-12 | Catálogo base solo del superadmin | F4 Catálogo | Must |
| HU-13 | Catálogo propio de la empresa | F4 Catálogo | Must |
| HU-14 | Bloquear elementos base a una empresa | F4 Catálogo | Should |
| HU-15 | El chequeo usa el catálogo de su empresa | F4 Catálogo | Must |
| HU-16 | El superadmin entra a una empresa | F1 Empresas | Must |
| HU-17 | Placa única en SISVIA y baja por traspaso | F1 Empresas | Should |
| HU-18 | Escribir a SISVIA | F5 Soporte | Should |
| HU-19 | La actividad de la empresa | F6 Registro | Should |
| HU-20 | Dueño de SISVIA y el registro del equipo | F6 Registro | Should |

### Reglas de datos

- Toda sede, usuario (salvo el superadmin), vehículo, chequeo, intento bloqueado, notificación, elemento del catálogo propio y mensaje a SISVIA pertenece a **una** empresa.
- La geografía (regiones, departamentos y ciudades) y el catálogo base no son de ninguna empresa.
- Nada que ya se haya usado en un chequeo se borra: se apaga (catálogo, vehículos, usuarios). Solo "Eliminar empresa" (HU-05) borra de verdad.

### Reglas de negocio

| ID | Regla |
|---|---|
| **RN-01** | Un usuario que no es superadmin solo accede a datos de su empresa. Pedir por URL o por la API algo de otra empresa responde como si no existiera. |
| **RN-02** | La geografía es compartida; cada sede pertenece a una empresa. Un Director Regional ve solo las sedes de **su empresa** en su departamento. |
| **RN-03** | No se puede crear ni reactivar una sede o un vehículo si con eso la empresa supera su límite. Lo desactivado no cuenta para el límite. |
| **RN-04** | Con una sola sede activa, la empresa solo puede crear Conductores (además de lo que haga el superadmin). Con dos o más, también Director Regional y Coordinador de sede. |
| **RN-05** | Con la empresa desactivada, ningún usuario suyo entra ni usa la API. Sus datos quedan intactos y el superadmin los sigue viendo. |
| **RN-06** | Solo se puede eliminar una empresa desactivada, con un respaldo generado en los últimos **30 días**, escribiendo su nombre para confirmar. |
| **RN-07** | El catálogo que ve un chequeo = base activo − lo bloqueado para esa empresa + lo propio activo de esa empresa, filtrado por el tipo de vehículo y las excepciones del vehículo. Se calcula al **iniciar** el chequeo. |
| **RN-08** | Lo nuevo del catálogo base les aparece a todas las empresas, salvo a las que lo tengan bloqueado. |
| **RN-09** | La cédula y el correo son únicos en todo SISVIA: una persona pertenece a una sola empresa. |
| **RN-10** | La placa es única entre los vehículos **no dados de baja** de todo SISVIA. |
| **RN-11** | Todo lo que el superadmin crea, edita, desactiva, da de baja o elimina dentro de una empresa pide su contraseña y queda registrado con quién, cuándo, qué y en qué empresa. |
| **RN-12** | Solo el Administrador de empresa le escribe a SISVIA. Cada empresa ve solo sus mensajes; el equipo SISVIA ve todos. Responder no pide contraseña ni entrar a la empresa: los mensajes son datos de SISVIA, no de la empresa. |
| **RN-13** | Estados de un mensaje a SISVIA: Nuevo → En revisión (cuando SISVIA lo abre) → Resuelto (lo marca SISVIA). Un mensaje Resuelto no se reabre. |
| **RN-14** | El registro de actividad solo crece: no se edita ni se borra desde la app. Al eliminar la empresa (HU-05) se va lo que hizo su gente; lo que hizo el equipo SISVIA queda en el registro del equipo. |
| **RN-15** | Puede haber **varios dueños de SISVIA**, y nunca ninguno. Solo un dueño da la marca, y solo a un Administrador general activo que no la tenga; cada dueño puede quitarse la suya, **nunca la de otro**, y el último no puede quitársela. La cuenta con la marca no se desactiva, elimina ni cambia de rol desde la app *(enmienda 7, 2026-09-22)*. |

### 3.1 Módulo Empresas (F1) · solo superadmin

#### HU-01 · Crear una empresa con su administrador · **Must**

> Como **superadmin**, quiero **crear una empresa junto con su administrador** para **que el cliente entre y arme lo suyo sin que yo cree sus usuarios**.

**Criterios de aceptación**

1. **Dado** el menú del superadmin, **cuando** entra a "Empresas", **entonces** ve la lista de empresas con nombre, estado (Activa / Desactivada), sedes activas / límite y vehículos activos / límite.
2. **Dado** el formulario "Nueva empresa", **cuando** completa los datos de la empresa (nombre, obligatorio; NIT; ciudad principal; teléfono y correo de contacto; máximo de sedes y de vehículos) y los del administrador (nombre completo, cédula, correo y teléfono) y guarda, **entonces** se crean la empresa activa y su Administrador de empresa, que recibe su contraseña temporal igual que hoy los usuarios nuevos.
3. **Dado** un correo o una cédula que ya existe en SISVIA, **cuando** guarda, **entonces** no crea nada y muestra *"Ese correo ya está registrado en SISVIA"* o *"Esa cédula ya está registrada en SISVIA"*.
4. **Dado** el nombre de una empresa que ya existe, **cuando** guarda, **entonces** muestra *"Ya existe una empresa con ese nombre"*.
5. **Dado** el administrador nuevo, **cuando** entra por primera vez, **entonces** cambia su contraseña (como hoy) y llega al panel de su empresa, vacío.

#### HU-02 · Límites de sedes y vehículos · **Must**

> Como **superadmin**, quiero **ponerle a cada empresa un máximo de sedes y de vehículos** para **cobrar y dar servicio según lo que de verdad maneja**.

**Criterios de aceptación**

1. **Dado** el formulario de la empresa, **cuando** el superadmin pone "Máximo de sedes" y "Máximo de vehículos" (enteros de 1 en adelante) y guarda, **entonces** quedan guardados y se ven en la lista.
2. **Dado** una empresa con 3 sedes activas y límite 3, **cuando** su administrador intenta crear o reactivar una sede, **entonces** no se hace y ve *"Tu empresa llegó al límite de 3 sedes de su plan. Para ampliarlo, comunícate con SISVIA."*
3. **Dado** una empresa con 120 vehículos activos y límite 120, **cuando** alguien de la empresa intenta crear o reactivar un vehículo, **entonces** no se hace y ve *"Tu empresa llegó al límite de 120 vehículos de su plan. Para ampliarlo, comunícate con SISVIA."*
4. **Dado** una empresa con 2 de 3 sedes, **cuando** crea una, **entonces** se permite (el límite es "hasta", inclusive).
5. **Dado** el panel del Administrador de empresa, **cuando** lo abre, **entonces** ve cuántas sedes y vehículos usa de su límite (por ejemplo "Vehículos: 118 de 120").

#### HU-03 · Desactivar y reactivar una empresa · **Must**

> Como **superadmin**, quiero **desactivar una empresa que se fue o no pagó** para **cortarle el acceso sin perder sus datos**.

**Criterios de aceptación**

1. **Dado** una empresa activa, **cuando** el superadmin la desactiva y confirma, **entonces** queda "Desactivada" y sus datos no cambian.
2. **Dado** un usuario de una empresa desactivada, **cuando** intenta entrar, **entonces** no entra y ve *"Tu empresa está desactivada. Comunícate con SISVIA."*
3. **Dado** un usuario de esa empresa con la sesión abierta, **cuando** hace cualquier acción, **entonces** sale al login con el mismo mensaje.
4. **Dado** una empresa desactivada, **cuando** el superadmin la reactiva, **entonces** sus usuarios vuelven a entrar como antes.

#### HU-04 · Exportar todo de una empresa · **Should**

> Como **superadmin**, quiero **descargar todos los datos de una empresa en un archivo** para **entregárselos si se va, antes de eliminarla**.

**Criterios de aceptación**

1. **Dado** la ficha de una empresa, **cuando** el superadmin toca "Exportar todo", **entonces** descarga un `.zip` con: sedes, usuarios, vehículos, chequeos (con sus respuestas) e intentos bloqueados en archivos que abre Excel (CSV), y un PDF por chequeo.
2. **Dado** una exportación terminada, **cuando** vuelve a la ficha, **entonces** ve "Último respaldo: [fecha y hora]".
3. **Dado** una empresa sin chequeos, **cuando** exporta, **entonces** el `.zip` sale igual, con los archivos vacíos y sus encabezados.

#### HU-05 · Eliminar una empresa con respaldo previo · **Should**

> Como **superadmin**, quiero **que eliminar una empresa me obligue a tener su respaldo** para **no borrar datos que la empresa podría necesitar**.

**Criterios de aceptación**

1. **Dado** una empresa activa, **cuando** el superadmin busca "Eliminar", **entonces** no está disponible y ve *"Primero desactiva la empresa."*
2. **Dado** una empresa desactivada sin respaldo reciente (RN-06), **cuando** intenta eliminar, **entonces** no puede y ve *"Antes de eliminar, genera el respaldo con «Exportar todo» y envíaselo a la empresa."*
3. **Dado** una empresa desactivada con respaldo reciente, **cuando** escribe el nombre exacto de la empresa y confirma, **entonces** se borran para siempre la empresa y todo lo suyo (sedes, usuarios con su acceso, vehículos, chequeos, fotos, catálogo propio y bloqueos).
4. **Dado** el nombre escrito distinto, **cuando** confirma, **entonces** no se borra nada.

#### HU-16 · El superadmin entra a una empresa · **Must**

> Como **superadmin**, quiero **entrar a una empresa y ver sus módulos con su información** para **hacerle seguimiento, dar soporte y ajustar lo que haga falta, dejando constancia de lo que hago**.

**Criterios de aceptación**

1. **Dado** la ficha de una empresa, **cuando** el superadmin toca "Entrar a la empresa", **entonces** ve los módulos de esa empresa (panel, vehículos, usuarios, sedes, catálogo, chequeos, notificaciones) con sus datos, y arriba una franja: *"Estás viendo [nombre de la empresa] como SISVIA · Salir"*.
2. **Dado** el superadmin dentro de una empresa, **cuando** crea, edita, desactiva, da de baja o elimina algo, **entonces** primero confirma con su contraseña y la acción queda registrada con quién, cuándo, qué y en qué empresa (RN-11).
3. **Dado** una contraseña incorrecta, **cuando** confirma, **entonces** no se hace nada y ve *"Contraseña incorrecta"*.
4. **Dado** la franja, **cuando** toca "Salir", **entonces** vuelve al módulo Empresas.
5. **Dado** cinco contraseñas incorrectas seguidas, **cuando** confirma otra vez, **entonces** su cuenta queda bloqueada 15 minutos (como en el login), ve *"Demasiados intentos fallidos. Intenta de nuevo en 15 minutos."* y el botón "Confirmar" queda deshabilitado. *(Pedido de Martín en la ronda del 2026-09-19.)*

#### HU-17 · Placa única en SISVIA y baja por traspaso · **Should**

> Como **superadmin**, quiero **que una placa no esté en dos empresas y poder liberarla cuando un vehículo se vende** para **que los registros sean confiables**.

**Criterios de aceptación**

1. **Dado** una placa de un vehículo de A (activo o desactivado), **cuando** alguien de B intenta registrarla, **entonces** no se registra y ve *"Esa placa ya está registrada en SISVIA. Si el vehículo ahora es de tu empresa, comunícate con SISVIA."* (sin decir de qué empresa es).
2. **Dado** el superadmin dentro de A, **cuando** da de baja ese vehículo "por traspaso", escribe el motivo y confirma con su contraseña, **entonces** el vehículo sale de la flota de A, A conserva sus chequeos viejos, y la placa queda libre.
3. **Dado** la baja, **cuando** se consulta el registro, **entonces** aparece quién la hizo, cuándo y el motivo.
4. **Dado** un vehículo dado de baja, **cuando** alguien de A lo busca, **entonces** aparece como "Dado de baja por traspaso" y no se puede reactivar.

### 3.2 Separación de datos (F2)

#### HU-06 · Cada empresa ve solo lo suyo · **Must**

> Como **Administrador de empresa**, quiero **que nadie de otra empresa vea mis datos** para **confiar en SISVIA con la información de mi flota**.

**Criterios de aceptación**

1. **Dado** dos empresas A y B, **cuando** un usuario de A abre panel, vehículos, usuarios, sedes, chequeos, intentos bloqueados o notificaciones, **entonces** solo aparece lo de A.
2. **Dado** un vehículo, usuario, sede o chequeo de B, **cuando** un usuario de A lo pide por su dirección o por la API, **entonces** responde "No encontrado", como si no existiera.
3. **Dado** un Director Regional de A en Tolima y una sede de B en Tolima, **cuando** abre sus sedes, **entonces** no ve la de B.
4. **Dado** un conductor pool de A, **cuando** se le activa una suplencia, **entonces** solo se pueden elegir sedes de A.
5. **Dado** avisos (campanita y correos de vencimientos), **cuando** se generan por algo de A, **entonces** solo les llegan a usuarios de A.
6. **Dado** el superadmin, **cuando** quiere ver o ajustar datos de una empresa, **entonces** lo hace entrando a ella (HU-16).

#### HU-07 · Los datos de hoy pasan a una empresa inicial · **Must**

> Como **Martín**, quiero **que lo que ya está cargado quede en una empresa** para **no perder nada al pasar a varias empresas**.

**Criterios de aceptación**

1. **Dado** la base actual, **cuando** se corre la migración, **entonces** existe una empresa inicial llamada **SISVIA** y todas las sedes, usuarios que no son superadmin, vehículos, chequeos, intentos y notificaciones quedan en ella.
2. **Dado** la migración, **cuando** se comparan los conteos antes y después, **entonces** son iguales.
3. **Dado** los superadmin actuales, **cuando** termina la migración, **entonces** siguen siendo superadmin (equipo SISVIA), sin empresa.
4. **Dado** la empresa inicial, **cuando** se crea, **entonces** sus límites son iguales a lo que ya tiene activo (nadie queda por encima de su límite).
5. **Dado** el catálogo actual, **cuando** se migra, **entonces** pasa a ser el catálogo base.

#### HU-08 · El nombre de la empresa en la app y en los documentos · **Must**

> Como **Administrador de empresa**, quiero **ver el nombre de mi empresa en SISVIA y en los documentos** para **que sea mi herramienta y la pueda mostrar**.

**Criterios de aceptación**

1. **Dado** un usuario de la empresa A, **cuando** entra, **entonces** la cabecera del menú y el pie muestran el nombre de A.
2. **Dado** un chequeo de A exportado a PDF o Word, **cuando** se abre, **entonces** la cabecera dice "[nombre de A] · Regional … · Sede …", como hoy dice la organización.
3. **Dado** un correo que manda SISVIA por algo de A, **cuando** llega, **entonces** usa el nombre de A.
4. **Dado** el superadmin, **cuando** entra, **entonces** la cabecera muestra "SISVIA".

### 3.3 Roles (F3)

#### HU-09 · El Administrador de empresa maneja su empresa · **Must**

> Como **Administrador de empresa**, quiero **crear mis sedes, usuarios y vehículos** para **poner a funcionar SISVIA en mi empresa sin depender de SISVIA**.

**Criterios de aceptación**

1. **Dado** el Administrador de empresa, **cuando** entra, **entonces** ve el panel, vehículos, usuarios, sedes, catálogo, chequeos y notificaciones de toda su empresa, en todas sus regiones.
2. **Dado** "Gestión de usuarios", **cuando** crea un usuario, **entonces** puede elegir entre los roles permitidos por RN-04, nunca superadmin ni Administrador de empresa.
3. **Dado** la API, **cuando** intenta crear un superadmin o un Administrador de empresa, **entonces** responde "No tienes permiso para crear ese rol".
4. **Dado** sus sedes, **cuando** crea una, **entonces** elige la ciudad de la geografía compartida y la sede queda en su empresa (respetando RN-03).

#### HU-10 · Roles según la cantidad de sedes · **Should**

> Como **Administrador de una empresa chica**, quiero **ver solo los roles que me sirven** para **no confundirme con cargos que no tengo**.

**Criterios de aceptación**

1. **Dado** una empresa con 1 sede activa, **cuando** su administrador crea un usuario, **entonces** solo puede elegir "Conductor".
2. **Dado** esa empresa, **cuando** crea su segunda sede, **entonces** al crear usuarios aparecen también "Director Regional" y "Coordinador de sede".
3. **Dado** una empresa que vuelve a 1 sede activa, **cuando** ya tenía coordinadores, **entonces** esos usuarios siguen funcionando; solo no se pueden crear nuevos de ese rol.

#### HU-11 · Usuarios del equipo SISVIA · **Should**

> Como **superadmin**, quiero **que "Usuarios" me muestre solo al equipo SISVIA** para **no mezclar mi gente con la de los clientes**.

**Criterios de aceptación**

1. **Dado** el superadmin, **cuando** abre "Usuarios", **entonces** ve y crea solo usuarios superadmin (equipo SISVIA).
2. **Dado** una empresa, **cuando** el superadmin quiere ver o crear sus usuarios, **entonces** lo hace desde la ficha de esa empresa.

### 3.4 Catálogo (F4)

#### HU-12 · Catálogo base solo del superadmin · **Must**

> Como **superadmin**, quiero **ser el único que cambia el catálogo base** para **que ninguna empresa les cambie el chequeo a las demás**.

**Criterios de aceptación**

1. **Dado** el superadmin, **cuando** crea, edita o apaga una categoría, un ítem o una pregunta de aptitud base, **entonces** el cambio lo ven todas las empresas que no lo tienen bloqueado.
2. **Dado** un usuario de una empresa, **cuando** abre el catálogo, **entonces** ve lo base marcado "Base" y sin botones de editar ni apagar.
3. **Dado** la API, **cuando** un usuario de una empresa intenta cambiar algo base, **entonces** responde "No tienes permiso para cambiar el catálogo base".

#### HU-13 · Catálogo propio de la empresa · **Must**

> Como **Administrador de empresa**, quiero **agregar categorías, ítems y preguntas de aptitud propias** para **revisar lo que mi operación necesita**.

**Criterios de aceptación**

1. **Dado** el catálogo de su empresa, **cuando** el Administrador de empresa crea un ítem en una categoría base o propia, **entonces** lo ven los conductores de su empresa y de ninguna otra.
2. **Dado** el catálogo, **cuando** crea una categoría propia o una pregunta de aptitud propia, **entonces** pasa lo mismo: solo su empresa.
3. **Dado** un elemento propio ya usado en algún chequeo, **cuando** lo quiere quitar, **entonces** solo se puede apagar, y los chequeos viejos lo siguen mostrando.
4. **Dado** un elemento propio sin usar, **cuando** lo elimina, **entonces** se borra.
5. **Dado** el Director Regional o el Coordinador, **cuando** abre el catálogo, **entonces** lo ve pero no lo edita.

#### HU-14 · Bloquear elementos base a una empresa · **Should**

> Como **superadmin**, quiero **ocultarle a una empresa algo del catálogo base** para **adaptarlo a su operación sin cambiárselo a las demás**.

**Criterios de aceptación**

1. **Dado** la ficha de una empresa, **cuando** el superadmin bloquea un ítem, una categoría o una pregunta base, **entonces** esa empresa deja de verlo en su catálogo y en sus chequeos nuevos; las demás no cambian.
2. **Dado** una categoría base bloqueada, **cuando** la empresa inicia un chequeo, **entonces** no aparecen sus ítems base (sí sus ítems propios dentro de ella, si los tiene).
3. **Dado** un elemento bloqueado, **cuando** el superadmin lo desbloquea, **entonces** vuelve a aparecer en esa empresa.

#### HU-15 · El chequeo usa el catálogo de su empresa · **Must**

> Como **conductor**, quiero **que mi chequeo tenga exactamente lo que pide mi empresa** para **no revisar cosas de otras empresas ni saltarme las mías**.

**Criterios de aceptación**

1. **Dado** un conductor de A, **cuando** inicia un chequeo, **entonces** ve los ítems y preguntas según RN-07.
2. **Dado** un ítem propio de B, **cuando** un conductor de A inicia un chequeo, **entonces** no aparece.
3. **Dado** un ítem propio de A marcado solo para motos, **cuando** el conductor inicia el chequeo de un camión, **entonces** no aparece.

### 3.5 Soporte (F5)

#### HU-18 · Escribir a SISVIA · **Should**

> Como **Administrador de empresa**, quiero **escribirle a SISVIA cuando algo falla o necesito algo, con una captura si hace falta**, para **que me respondan sin salir de la app**.
> Como **superadmin**, quiero **recibir esos mensajes en un solo lugar, con lo necesario para entender el problema, y responderlos**.

**Criterios de aceptación**

1. **Dado** el Administrador de empresa, **cuando** toca "Escribir a SISVIA" en la barra de arriba (está en todas las pantallas), **entonces** se abre un formulario con el tipo (*Algo falla · Tengo una duda · Necesito más cupo del plan · Traspaso de un vehículo · Una idea*), el mensaje (obligatorio, hasta 2.000 caracteres) y un adjunto opcional. Los demás roles no ven el botón, y por la API reciben *"Solo el Administrador de empresa puede escribirle a SISVIA."*
2. **Dado** el adjunto, **cuando** es JPG, PNG o PDF de hasta 5 MB, **entonces** se guarda con el mensaje; si no, no se envía y ve *"El archivo debe ser una imagen JPG o PNG, o un PDF, de hasta 5 MB."* (5 MB pasa; 5 MB + 1 byte, no).
3. **Dado** el envío, **entonces** el mensaje queda **Nuevo** con datos que nadie escribe: empresa, quién, cargo, la pantalla desde donde escribió, fecha y hora, navegador y sistema. Le llega al equipo SISVIA a la campanita (y copia por correo), y quien escribió ve *"Mensaje enviado a SISVIA. Te avisamos en la campanita cuando respondan."*
4. **Dado** el superadmin, **cuando** abre "Soporte" en su menú (afuera de las empresas), **entonces** ve los mensajes de todas las empresas, los nuevos primero, con filtro por estado y el número de nuevos en el menú. Al abrir uno Nuevo, pasa a **En revisión**.
5. **Dado** un mensaje abierto, **cuando** el superadmin responde (texto y un adjunto opcional), **entonces** a quien escribió le llega a la campanita (y por correo), y el Administrador contesta en el mismo **hilo** mientras no esté Resuelto (sus respuestas le llegan al equipo SISVIA igual).
6. **Dado** un mensaje, **cuando** el superadmin lo marca **Resuelto**, **entonces** el hilo se cierra y el Administrador ve *"Resuelto. ¿Sigue pasando? Escribe un mensaje nuevo."*
7. **Dado** un mensaje, **cuando** el superadmin toca "Ver en la empresa", **entonces** entra a esa empresa (con su registro, como HU-16.1) y abre la pantalla desde donde se escribió.
8. **Dado** el Administrador de empresa, **cuando** abre "Soporte" en su menú, **entonces** ve los mensajes de su empresa con su estado y las respuestas, y nunca los de otra.
9. **Dado** el aviso de límite del plan (HU-02) o el de la placa ya registrada (HU-17.1), **cuando** lo ve el Administrador de empresa, **entonces** trae "Escribir a SISVIA" con el tipo ya elegido (y la placa en el mensaje).
10. **Dado** un Director o Coordinador de una empresa sin Administrador de empresa (hoy, solo "SISVIA"), **cuando** informa a su superior, **entonces** el informe llega al equipo SISVIA **sin la opción del resumen del área**; en las demás empresas el informe sigue igual.

### 3.6 Registro (F6)

#### HU-19 · La actividad de la empresa · **Should**

> Como **Administrador de empresa**, quiero **ver en una sola lista qué se hizo en mi empresa y quién lo hizo**, para **saber quién cambió algo y confiar en que nadie toca mis datos a escondidas**.

**Criterios de aceptación**

1. **Dado** el Administrador de empresa, **cuando** abre "Actividad" en su menú, **entonces** ve lo que pasó en su empresa, lo más nuevo primero: quién (nombre y cargo), qué en palabras (*"Desactivó el vehículo ABC123"*, *"Creó a Ana Pérez · Coordinador de sede"*) y cuándo.
2. **Entran:** vehículos (crear, editar, desactivar, reactivar, fotos, RUNT, baja por traspaso, eliminar), usuarios (crear, editar, cambiar el rol, desactivar, reactivar, resetear la contraseña, cambiar correo o cédula, eliminar), sedes (crear, editar, desactivar, reactivar) y catálogo propio (crear, editar, apagar, borrar). Los chequeos no: tienen su pantalla "Chequeos realizados". Aparece también lo que ya estaba registrado antes de esta versión (vehículos, usuarios y lo del equipo SISVIA); sedes y catálogo, desde que se empiezan a registrar.
3. **Dado** algo que hizo el equipo SISVIA dentro de la empresa, **entonces** aparece como *"Equipo SISVIA · <nombre>"*: entró a la empresa, cada cambio con contraseña, exportó todo, desactivó o reactivó la empresa, cambió el plan, dio de baja un vehículo.
4. **Filtros:** por tipo (Vehículos, Usuarios, Sedes, Catálogo, Equipo SISVIA), por persona y por fechas (desde y hasta); de a 50, con "Ver más".
5. **Dado** otro rol de la empresa, **entonces** no ve "Actividad", y por la API recibe *"Solo el Administrador de empresa ve la actividad de la empresa."* (El equipo SISVIA la ve entrando a la empresa, como sus demás módulos, HU-16.) Nunca aparece la de otra empresa.
6. **Nadie edita ni borra el registro desde la app:** solo se agrega (RN-14).

#### HU-20 · Dueño de SISVIA y el registro del equipo · **Should**

> Como **dueño de SISVIA**, quiero **ver todo lo que hace el equipo SISVIA y que nadie pueda sacarme de la app**, para **controlar a mi equipo**.

> Puede haber **más de un dueño**: si la empresa crece o se vende una parte, la marca se le da a otra cuenta sin quitarse la propia *(enmienda 7, 2026-09-22)*.

**Criterios de aceptación**

1. **Dado** una cuenta con la marca de dueño, **cuando** abre "Registro del equipo" en su menú, **entonces** ve todo lo que hizo cada persona del equipo SISVIA: en todas las empresas (crearla, cambiar el plan, desactivarla, reactivarla, entrar, cada cambio adentro, exportar, eliminar) y sobre las cuentas del equipo (crear, editar, desactivar, reactivar, eliminar, pasar la marca), lo más nuevo primero, con filtros por persona, empresa y fechas.
2. **Dado** un Administrador general sin la marca, **entonces** no ve "Registro del equipo", y por la API recibe *"Solo el dueño de SISVIA ve el registro del equipo."*
3. **Dado** una cuenta con la marca, **entonces** muestra *"Dueño de SISVIA"* en su perfil y en la lista del equipo SISVIA. En "Mi perfil" cada dueño ve quiénes son los demás.
4. **Dado** cualquiera, también el propio dueño, **cuando** intenta desactivar, eliminar o cambiarle el rol a una cuenta con la marca, **entonces** no se hace: *"Esta cuenta es la del dueño de SISVIA: no se puede desactivar, eliminar ni cambiar de rol. Para dejar de ser dueño, quítate la marca."* *(texto ajustado en la enmienda 7.)*
5. **Dado** un dueño, **cuando** elige con **"Dar la marca"** a otro Administrador general activo que todavía no la tiene, confirma con su contraseña y escribe su nombre exacto, **entonces** esa cuenta queda **también** como dueña (los dos lo son) y queda en el registro: *"Le dio la marca de dueño a <nombre>"*.
6. **Dado** un dueño, **cuando** usa **"Pasarle la mía"** con los mismos datos, **entonces** en una sola operación la otra cuenta queda como dueña y él deja de serlo, y queda en el registro: *"Pasó la marca de dueño a <nombre>"*.
7. **Dado** un dueño, **cuando** elige **"Quitarme la marca"**, confirma con su contraseña y escribe su propio nombre exacto, **entonces** deja de ser dueño y queda en el registro: *"Se quitó la marca de dueño"*. Si es el único, no se hace: *"No puedes quitarte la marca: eres el único dueño de SISVIA. Primero dásela a otra cuenta."* **Nadie le quita la marca a otro desde la app** (RN-15).
8. **Dado** cualquier cambio de la marca, **entonces** la campanita avisa: a quien la recibe (*"Ahora eres dueño de SISVIA"*) y a los demás dueños (*"Hay un dueño nuevo"*, *"La marca de dueño cambió"* o *"Un dueño dejó la marca"*). A quien lo hizo no se le avisa: ya lo vio en pantalla. *(Enmienda 8, 2026-09-22.)*
9. **La primera marca** se pone con una instrucción en la base (la corre Martín, buscando su cuenta por la cédula). Desde la app nadie se la da a sí mismo.

### 3.N Won't have (descartado en esta versión)

- Cobrar o facturar dentro de SISVIA (los límites se ponen a mano).
- La actividad de la empresa (HU-19) dentro de "Exportar todo" (HU-04).
- Que una empresa se registre sola desde una página pública.
- Logo o colores propios por empresa.
- Dominios o subdominios por empresa.
- Una persona trabajando en dos empresas con la misma cuenta.
- Que una empresa oculte por sí misma algo del catálogo base (lo hace el superadmin, HU-14).
- **Compartir el historial de un vehículo dado de baja con la empresa que lo compró**, y **eliminar del todo un vehículo dado de baja** después de un tiempo (uno o dos años) con confirmación de la empresa anterior. Queda para un pacto propio: necesita una política de datos (autorizaciones según la Ley 1581 de 2012, de habeas data).

## 4. Requerimientos no funcionales

### 4.1 Rendimiento y tiempos de respuesta

| ID | Qué se exige | Cómo se mide |
|---|---|---|
| **RNF-01** | El panel de una empresa con 150 vehículos carga en menos de 2 s en una conexión normal. | Tiempo de la respuesta de `/api/dashboard` con 150 vehículos de prueba. |
| **RNF-02** | "Exportar todo" de una empresa con 150 vehículos y 1.000 chequeos termina en menos de 2 minutos. | Tiempo medido con datos de prueba. |
| **RNF-11** | La Actividad de una empresa con 10.000 registros carga cada página (50) en menos de 2 s. | Tiempo de la respuesta con registros de prueba. |

### 4.2 Seguridad y privacidad de datos

| ID | Qué se exige | Cómo se mide |
|---|---|---|
| **RNF-03** | Toda consulta del backend a datos de una empresa pasa por un único filtro de empresa; ninguna ruta lo arma a mano. | Revisión del código + tests del filtro. |
| **RNF-04** | Ninguna ruta de la API devuelve datos de otra empresa. | Script contra la API con usuarios de dos empresas, sobre todas las rutas de listado y de detalle. |
| **RNF-05** | Las acciones del superadmin sobre empresas (crear, límites, desactivar, exportar, eliminar, bloqueos) quedan registradas con quién y cuándo. | Registro de auditoría consultable. |
| **RNF-06** | RLS sigue activo en toda tabla nueva; el backend sigue accediendo con `service_role` (CL-09). | Revisión del esquema. |
| **RNF-10** | Los adjuntos de los mensajes a SISVIA no quedan en un enlace público: se abren desde la app, con sesión, y solo los ve quien ve el mensaje. | Script contra la API: otra empresa → 404; sin sesión → 401. |

### 4.3 Usabilidad y diseño UX/UI

| ID | Qué se exige | Cómo se mide |
|---|---|---|
| **RNF-07** | Las pantallas nuevas siguen la identidad sellada: tokens, contraste ≥ 4.5:1 en claro y oscuro, controles del conductor ≥ 44 px (CL-04, CL-07, CL-08). | Medidor de contraste y tamaños en la ventana. |
| **RNF-08** | Los mensajes de límite, empresa desactivada y eliminación dicen qué pasó y qué hacer, con los textos exactos de HU-02, HU-03 y HU-05. | Lectura en la ventana. |

### 4.4 Escalabilidad y disponibilidad

| ID | Qué se exige | Cómo se mide |
|---|---|---|
| **RNF-09** | La migración de HU-07 se puede correr sobre la base de producción sin apagar la app más de 5 minutos, y se puede verificar con conteos. | Prueba sobre una copia local de la base. |

## 5. Arquitectura técnica y restricciones

### 5.1 Decisión de arquitectura

**Una sola base compartida con una marca de empresa en cada dato** (multi-empresa por columna). Cada empresa no tiene su propia base: sería más aislado, pero multiplicaría el mantenimiento, que es justo lo que Martín quiere evitar. El aislamiento lo garantiza el backend con un filtro único (RNF-03), probado (RNF-04).

### 5.2 Stack tecnológico

El mismo, sin cambios: React 19 + Vite 8, Node 22 + Express 5, Supabase (PostgreSQL con RLS), Cloudinary, Cloudflare Pages y Railway. Para el `.zip` de HU-04 hace falta una librería de compresión en el backend.

### 5.3 Componentes

- **Filtro de empresa:** el `scope` actual del backend (que ya filtra por sede, departamento y región) suma la empresa como primer nivel.
- **Módulo Empresas:** pantallas y rutas nuevas, solo del superadmin.
- **Catálogo:** las rutas actuales pasan a distinguir base y propio, más los bloqueos.
- **Marca de la organización:** el nombre sale de la empresa del usuario, no de `ORG_NOMBRE` (choca con CL-02, ver pacto).

### 5.4 Modelo de datos

- Tabla nueva `empresas`: nombre, datos de contacto, límite de sedes, límite de vehículos, activa, fecha del último respaldo.
- Columna `empresa_id` en sedes, usuarios, vehículos y en las tablas que se consultan sin pasar por la sede (chequeos, intentos, notificaciones), para filtrar directo y más seguro.
- Catálogo: `empresa_id` vacío = base; con valor = propio. Tabla nueva de bloqueos (empresa + elemento base).
- Rol nuevo `admin_empresa` en la lista de roles.
- Mensajes a SISVIA (HU-18): el mensaje (empresa, quién, tipo, estado, pantalla, navegador) y sus respuestas, cada uno con un adjunto opcional.
- Registro de actividad (HU-19 y HU-20): quién (con su nombre y cargo, aunque después se elimine), si es del equipo SISVIA, qué, sobre qué, en qué empresa y cuándo. Marca de dueño en la cuenta del usuario (una sola).
- Una migración para las bases existentes y la versión nueva de `database.sql` e `INSTALAR_TODO.sql` para instalaciones desde cero.

### 5.5 Servicios de terceros e integraciones

- **Supabase Auth:** cada usuario de empresa se sigue creando igual; el correo es único en todo SISVIA (RN-09).
- **Cloudinary:** al eliminar una empresa (HU-05) se borran sus fotos. Los adjuntos de los mensajes a SISVIA se guardan privados (RNF-10).
- **Correo (Nodemailer):** usa el nombre de la empresa del destinatario.

### 5.6 Restricciones

- Martín corre las migraciones y hace todo el git (CL-01).
- La base de producción es la real: las pruebas usan empresas, usuarios y vehículos de prueba que se borran al terminar.

## 6. Casos borde y excepciones

### 6.1 Conexión

| ID | Qué pasa si… | Cómo se comporta |
|---|---|---|
| **CB-01** | Se corta la conexión mientras se genera "Exportar todo" | No se marca "Último respaldo"; se puede volver a exportar. |
| **CB-18** · HU-18 | Falla la subida del adjunto de un mensaje a SISVIA | No se envía nada a medias: *"No se pudo subir el archivo. Intenta de nuevo o envía el mensaje sin él."* *(Enmienda 5, 2026-09-19.)* |

### 6.2 Almacenamiento y datos

| ID | Qué pasa si… | Cómo se comporta |
|---|---|---|
| **CB-02** | El superadmin baja un límite por debajo de lo que la empresa ya tiene activo | No se guarda: *"La empresa tiene 2 sedes activas: el límite no puede ser menor. Primero desactiva las que sobran."* (con vehículos: *"La empresa tiene 118 vehículos activos: el límite no puede ser menor. Primero desactiva los que sobran."*). Bajarlo hasta lo que ya usa sí se puede. *(Enmienda 1, 2026-09-19.)* |
| **CB-03** | Una empresa apaga un ítem propio usado en chequeos | Los chequeos viejos lo siguen mostrando con su respuesta. |
| **CB-04** | El superadmin bloquea un ítem mientras un conductor tiene un chequeo en curso | El chequeo en curso no cambia (RN-07 se calcula al iniciar). |
| **CB-05** | Se apaga un ítem base usado en chequeos de varias empresas | Desaparece de los chequeos nuevos de todas; los viejos lo siguen mostrando. |
| **CB-06** | La base tiene usuarios sin sede (Director Regional con solo departamento) al migrar | Quedan en la empresa inicial igual que los demás. |
| **CB-07** | Una empresa eliminada tenía conductores pool con suplencias activas | Las suplencias se borran con la empresa; no quedan huérfanas. |
| **CB-21** · HU-18 | Se elimina una empresa que tiene mensajes a SISVIA | Antes, "Exportar todo" (HU-04) los incluye; al eliminarla, sus mensajes y adjuntos se borran con ella. *(Enmienda 5, 2026-09-19.)* |
| **CB-25** · HU-19 | Se elimina una empresa con actividad registrada | Lo que hizo su gente se borra con ella; lo que hizo el equipo SISVIA en ella queda en el registro del equipo, con el nombre de la empresa, junto con que se eliminó. *(Enmienda 6, 2026-09-21; ajustado con el OK de Martín el 2026-09-22.)* |

### 6.3 Entrada de datos

| ID | Qué pasa si… | Cómo se comporta |
|---|---|---|
| **CB-08** | Una empresa crea una categoría propia con el mismo nombre que una base | No se crea: *"Ya existe una categoría con ese nombre"*. |
| **CB-09** | Al crear una empresa, el correo del administrador ya existe en SISVIA | No se crea ni la empresa ni el usuario (HU-01.3). Nada queda a medias. |
| **CB-10** | El límite se escribe en 0, negativo o con decimales | No se guarda: "El límite debe ser un número entero de 1 en adelante." |

### 6.4 Interacción

| ID | Qué pasa si… | Cómo se comporta |
|---|---|---|
| **CB-11** | Un usuario con sesión abierta pertenece a una empresa que se desactiva | En su próxima acción sale al login con el mensaje de HU-03.2. |
| **CB-12** | Una empresa con coordinadores queda con 1 sede activa | Los coordinadores siguen funcionando (HU-10.3). |
| **CB-13** | Un Administrador de empresa intenta crear un superadmin o un Administrador de empresa por la API | 403 con "No tienes permiso para crear ese rol" (HU-09.3). |
| **CB-14** | Dos personas del superadmin crean a la vez empresas con el mismo nombre | Solo se crea una; la otra ve "Ya existe una empresa con ese nombre". |
| **CB-15** | Llega un correo de vencimientos de un vehículo de A | Solo a usuarios de A (HU-06.5). |
| **CB-19** · HU-18 | El Administrador que escribió a SISVIA ya no está activo | Las respuestas les llegan a los Administradores activos de su empresa, que ven el hilo. *(Enmienda 5, 2026-09-19.)* |
| **CB-20** · HU-18 | La empresa que escribió a SISVIA está desactivada | Su gente no entra (HU-03), así que no escribe; sus mensajes siguen en "Soporte" del equipo SISVIA. *(Enmienda 5, 2026-09-19.)* |
| **CB-22** · HU-20 | Se intenta dar o pasar la marca a una cuenta desactivada, que no es Administrador general, o que ya es dueña | No se hace: *"Solo se le puede dar la marca a un Administrador general activo que todavía no la tenga."* *(Enmienda 6, 2026-09-21.)* |
| **CB-23** · HU-20 | Dos cambios de la marca a la vez (dos traspasos, o los dos últimos dueños quitándose la suya) | La app nunca queda sin dueño ni con la marca donde no corresponde: el segundo ve *"La marca de dueño ya cambió. Recarga la página."* o *"No puedes quitarte la marca: eres el único dueño de SISVIA. Primero dásela a otra cuenta."* *(Enmienda 6, 2026-09-21; ampliado en la enmienda 7, 2026-09-22.)* |
| **CB-24** · HU-19 | Una persona que hizo cosas y después se eliminó | El registro conserva su nombre. *(Enmienda 6, 2026-09-21.)* |

### 6.5 Dispositivo y navegador

| ID | Qué pasa si… | Cómo se comporta |
|---|---|---|
| **CB-16** | El nombre de la empresa es largo (60 caracteres) en la cabecera del menú en el celular | Se corta con "…" sin romper la cabecera; completo al pasar el mouse o en la ficha. |
| **CB-17** · HU-09 | Alguien intenta eliminar, desactivar o cambiarle el rol al último Administrador de empresa activo de una empresa | No se hace: *"La empresa no puede quedar sin Administrador de empresa. Crea otro antes de hacer este cambio."* Con dos o más, sí. *(Enmienda 2, 2026-09-19.)* |

## Anexo A: criterios de terminado

- [x] Las historias **Must** cumplen todos sus criterios de aceptación.
- [x] Ningún usuario de una empresa ve datos de otra (RNF-04 en verde).
- [x] La migración de HU-07 corrió en producción con conteos iguales antes y después (lo corre Martín).
- [x] Lo que ya funcionaba sigue igual: suite completa en verde y el chequeo del conductor, el panel y las exportaciones funcionando como antes para la empresa inicial.

### Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 2.0-borrador | 2026-09-18 | Primera versión del SRS de SISVIA para empresas, a partir de las ideas acordadas con Martín. |
| 2.0 | 2026-09-18 | Firmado. Entran las respuestas de la ronda: el superadmin entra a cada empresa con verificación y registro (HU-16, RN-11); placa única en todo SISVIA con baja por traspaso (HU-17, RN-10); sedes las crea el Administrador de empresa; varios Administradores por empresa; respaldo de 30 días; datos de la empresa; empresa inicial "SISVIA"; categoría propia no repite nombre de una base. Compartir historial y eliminar vehículos dados de baja, a un pacto futuro. |
| 2.1 | 2026-09-19 | Enmiendas firmadas por Martín: CB-02 ya no deja bajar un límite por debajo de lo activo; CB-17 nuevo (la empresa nunca queda sin Administrador de empresa); HU-16.5 (bloqueo tras 5 contraseñas malas, con "Confirmar" deshabilitado). La geografía trae los 1.122 municipios (sin cambio de criterios). |
| 2.2 | 2026-09-19 | Enmienda 5 firmada por Martín: HU-18 nueva (Should, F5 Soporte), "Escribir a SISVIA". El Administrador de empresa le escribe a SISVIA desde la barra de arriba (tipo, texto, un adjunto y datos que se llenan solos) y el equipo SISVIA responde en un hilo con estados. Se suman RN-12, RN-13, CB-18 a CB-21 y RNF-10. El informe que cae en el equipo SISVIA ya no ofrece el resumen del área (HU-18.10). |
| 2.3 | 2026-09-21 | Enmienda 6 firmada por Martín: HU-19 ("Actividad" de la empresa, con lo que hizo el equipo SISVIA en su cuenta; sin chequeos; con lo ya registrado) y HU-20 (marca "Dueño de SISVIA" en una cuenta, en vez de un rol nuevo: solo el dueño ve el registro del equipo, su cuenta no se desactiva ni cambia de rol, y la marca se pasa desde la app con contraseña). Se suman RN-14, RN-15, CB-22 a CB-25 y RNF-11. La actividad no va en "Exportar todo". |
| 2.4 | 2026-09-22 | CB-25 y RN-14 ajustados con el OK de Martín (historia Should, sin volver a firmar): al eliminar una empresa, lo que hizo el equipo SISVIA en ella queda en el registro del equipo, para que nadie borre sus rastros eliminándola. |
| 2.5 | 2026-09-22 | Enmienda 7 (OK de Martín, historia Should): **varios dueños de SISVIA**. RN-15 reescrita; HU-20.5 pasa a "Dar la marca" (suma dueño), HU-20.6 "Pasarle la mía" y HU-20.7 "Quitarme la marca" (solo la propia, nunca la de otro, y el último no puede). CB-22 y CB-23 ampliados. En la Actividad, quién lo hizo va primero y en negrita. |
| 2.6 | 2026-09-22 | Enmienda 8 (OK de Martín, historia Should): HU-20.8 nuevo — la campanita avisa cuando la marca cambia, a quien la recibe y a los demás dueños. |
| 2.7 | 2026-09-25 | Pacto sellado: se tildan los criterios de terminado (Anexo A). Sin cambios en historias ni criterios. |
