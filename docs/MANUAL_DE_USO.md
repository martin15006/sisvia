# Manual de uso del SISVIA

Este manual explica paso a paso cómo usar el sistema, tanto desde el panel del administrador como desde la aplicación del conductor.

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Primer ingreso (cambio obligatorio de contraseña)](#2-primer-ingreso)
3. [Flujo del Administrador](#3-flujo-del-administrador)
4. [Mi perfil (admin y conductor)](#4-mi-perfil)
5. [Flujo del Conductor](#5-flujo-del-conductor)
6. [Cerrar sesión](#6-cerrar-sesion)
7. [Solución de problemas comunes](#7-solucion-de-problemas-comunes)

---

## 1. Acceso al sistema

### Cómo entrar

1. Abre el navegador (Chrome, Edge, Brave o Firefox).
2. Entra a la dirección del sistema (en local: `http://localhost:5173`, en producción la URL donde esté desplegado).
3. Vas a ver la pantalla de inicio de sesión con el logo de SISVIA.

### Datos de inicio de sesión

Tienes que ingresar:

- **Correo o cédula**: puedes usar cualquiera de los dos. El sistema reconoce ambos.
- **Contraseña**: la que te entregó el administrador (si es tu primer ingreso) o la que ya cambiaste.

> **Mostrar/ocultar contraseña:** al lado del campo de contraseña hay un **ícono de ojo**. Si pulsas el ojo abierto se muestra lo que escribiste; si pulsas el ojo tachado se oculta. Útil para verificar que tipeaste bien una contraseña difícil.

### Botón de inicio de sesión

Al pulsar **Iniciar sesión**, el sistema te lleva automáticamente a la pantalla correspondiente según tu rol:
- Si eres **administrador** → vas al panel de administración.
- Si eres **conductor** → vas al dashboard del conductor.

> Si te equivocas en el correo o contraseña 5 veces seguidas, el sistema bloquea la cuenta por 15 minutos por seguridad.

### ¿Tu cuenta está desactivada?

Si tu contraseña era correcta pero tu cuenta está desactivada por el administrador, **NO** verás el mensaje genérico "Credenciales inválidas". En su lugar verás un cartel naranja con un candado:

> 🔒 Tu cuenta está desactivada. Contacta al administrador del sistema para reactivarla.

Esto evita confusiones (no es que te equivocaste de clave, es que tu cuenta requiere ser reactivada por un superior).

---

## 2. Primer ingreso

### Cambio obligatorio de contraseña

Cuando el administrador crea tu cuenta, te entrega una contraseña temporal. **La primera vez que ingreses**, el sistema te obliga a cambiarla por una propia.

### Pasos

1. Inicia sesión con la contraseña temporal que te dieron.
2. El sistema te lleva automáticamente a la pantalla **"Cambia tu contraseña"**.
3. Ingresa la nueva contraseña en el primer campo:
   - Mínimo 8 caracteres.
   - Recomendación: combina letras, números y al menos un signo (por ejemplo: `Patio2026!`).
4. Repítela en el campo **"Confirmar nueva contraseña"** para evitar errores.
5. Pulsa **Cambiar contraseña**.

> Importante: en el primer ingreso NO te piden la contraseña temporal de nuevo. Solo necesitas definir la nueva. Es así porque el sistema ya sabe que estás autenticado con la temporal y queremos facilitarte el proceso.

### Cambios posteriores de contraseña

Si más adelante quieres cambiar tu contraseña por seguridad (no por obligación), el sistema sí te pedirá:
- Tu contraseña **actual** (verificación de identidad).
- La nueva contraseña.
- La confirmación.

---

## 3. Flujo del Administrador

### Estructura general de la interfaz del admin

Después de iniciar sesión, el administrador entra a una interfaz con tres zonas:

**Menú lateral (sidebar) — siempre visible a la izquierda en computador.** Contiene los accesos a todos los módulos del sistema. Cada ítem tiene un ícono y se resalta en verde cuando estás dentro de esa sección. En la parte inferior del menú aparece tu nombre, tu cargo con su área (por ejemplo "Coordinador de sede · Sede X", o "Administrador general · Nacional") y el botón **"Cerrar sesión"** (en rojo). El menú queda **fijo a la pantalla**: aunque la página sea larga y hagas scroll, el "Cerrar sesión" siempre está visible.

Ítems del menú:
- **Dashboard** — panel principal con resumen del día y alertas.
- **Gestión de vehículos** — listado y administración de la flota.
- **Gestión de usuarios** — conductores y otros administradores.
- **Catálogo del chequeo** — preguntas, ítems y categorías.
- **Chequeos realizados** — historial completo con filtros.
- **Intentos bloqueados** — chequeos que el sistema impidió iniciar.
- **Mi perfil** — tus propios datos (ver sección 4).

**Cabecera (header) — sticky arriba.** Contiene:
- Botón **hamburguesa (☰)** a la izquierda — clic para **colapsar o expandir** el menú lateral. Tu preferencia se recuerda automáticamente para la siguiente vez que entres.
- **Título de la página actual** a la sede.
- **Campanita de notificaciones** a la derecha. Muestra un **punto rojo con el número** de notificaciones sin leer. Funciona en **tiempo real**: cuando ocurre un evento (un conductor completa o abandona un chequeo, un intento bloqueado, etc.), la campanita se enciende **al instante**. Al pulsarla se despliega la lista de las más recientes; cada una tiene un ícono de color según el tipo de evento (verde = operativo, azul = observación, amarillo = alerta, rojo = crítico/abandono, gris = no operativo, naranja = intento bloqueado). Clic en una notificación la marca como leída y te lleva al detalle del evento. Botón "Marcar todas como leídas" arriba.
- **Tu nombre y cargo** al lado de la campanita: debajo del nombre hay un **badge verde** con tu cargo completo ("Administrador general", "Director Regional", "Coordinador de sede", etc.) visible en todas las páginas; al entrar hace un pulso suave 2 veces para que lo ubiques. Clic en el cuadro te lleva a **"Mi perfil"**.

### Notificaciones (página completa)

Desde el sidebar, ítem **"Notificaciones"**. Muestra el historial completo con paginación (20 por página), filtro **Todas / Solo no leídas** y botón para marcar todas como leídas. Es el complemento de la campanita (que solo muestra las 10 más recientes).

**Eventos que generan notificación:**
- Un conductor completa un chequeo (de cualquier resultado).
- Un conductor abandona un chequeo (por inactividad o cierre del navegador).
- Un intento de chequeo bloqueado (conductor no apto o vehículo no autorizado).
- **Documentos por vencer** (avisos automáticos): SOAT, RTM (revisión técnico-mecánica), extintor de un vehículo, o **licencia de un conductor** que vence pronto. El sistema los revisa **todos los días** y avisa con anticipación (cuando faltan 30 días o menos). Para no saturar, el mismo aviso no se repite antes de 7 días.

> Cada quien recibe **solo lo de su área**: un Coordinador de sede ve las notificaciones de su sede, un Director Regional las de su departamento, y el Administrador general las de todo el país.

### Notificaciones por correo (avisos importantes)

Además de la campanita (que vive dentro del sistema), los **avisos más importantes también llegan por correo electrónico** a los administradores, para que se enteren aunque no tengan la app abierta. Son dos:

1. **Falla crítica (vehículo NO OPERATIVO):** apenas un chequeo deja un vehículo no operativo por una falla crítica, sale un correo **al instante** a los administradores de la sede. El correo trae la placa, el conductor, la criticidad y un botón para ver el chequeo.
2. **Resumen diario de vencimientos:** una vez al día, cada administrador recibe **un solo correo** con la lista de todo lo que está por vencer en su área (SOAT, RTM, extintor, licencias), ordenado por urgencia y marcando en rojo lo que ya está vencido. Un solo correo resumido, no uno por cada documento.

> Los correos llegan con el diseño de SISVIA (cabecera de color con el logo). Si aún no se ha configurado el correo de envío, el sistema funciona igual: simplemente los avisos quedan solo en la campanita.

> **Importante — los avisos automáticos se quedan en la sede.** Las notificaciones automáticas (chequeos, intentos bloqueados, vencimientos, etc.) le llegan **solo al Coordinador de sede de la sede**, no suben solas al Director Regional ni al Nacional (así no se inundan de avisos de todas las sedes). Para subir algo hacia arriba, se usa el botón de informar (ver abajo).

### Informar a mi superior (escalar)

En el **Dashboard**, los administradores (menos el Administrador general, que no tiene superior) tienen un botón **"📤 Informar a mi superior"**. Sirve para **enviarle a tu jefe inmediato** algo que amerite su atención, en vez de que le lleguen avisos automáticos de todo.

- **Quién recibe:** el Coordinador de sede se lo manda a **su Director Regional**; el Director Regional a la **Administración general**.
- **Cómo:** se abre un modal donde escribes un **asunto**, un **mensaje**, y opcionalmente marcas **"incluir un resumen de mi área"** (vehículos, críticos, no operativos, chequeos de hoy).
- **Cómo le llega al superior:** por **correo** (con tu nota y el resumen) y como **notificación en su campanita**.

**Contenido principal — a la sede.** Aquí se carga la pantalla del módulo que estás viendo.

**En celular o tablet:** el sidebar arranca **cerrado** y se abre como un panel deslizable desde la izquierda al pulsar la hamburguesa. Toca afuera del panel para cerrarlo.

### Panel principal (Dashboard)

El dashboard es la pantalla de inicio del admin. Resume **todo lo importante del día** en una sola vista para que apenas entres tengas el panorama completo.

**Bloque de bienvenida (arriba):** saludo personalizado con tu primer nombre + la fecha en español. Si tu rol es "admin de sede", también aparece la nota "Estás viendo datos de tu sede asignada".

**Números de hoy — 4 cajas grandes clicables:**

| Caja | Significado | A dónde te lleva al hacer clic |
|---|---|---|
| **Chequeos del día** | Total de chequeos realizados hoy | Lista de chequeos realizados |
| **No operativos** | Cuántos vehículos quedaron NO OPERATIVO hoy (se pinta de naranja si > 0) | Lista de chequeos |
| **Intentos bloqueados** | Cuántos chequeos fueron rechazados por el sistema hoy (se pinta de naranja si > 0) | Lista de intentos bloqueados |
| **Conductores activos** | Total de conductores activos en tu sede | Lista de usuarios |

**Necesita atención — 3 grupos de alertas accionables:** solo aparecen los grupos que tienen ítems. Cada ítem es clicable y te lleva al detalle correspondiente.

1. **Licencias por vencer** — conductores cuya licencia vence pronto o ya venció. Cada uno tiene un color según urgencia:
   - **Verde**: vence en más de 30 días.
   - **Naranja**: vence en 30 días o menos.
   - **Rojo**: vence en 15 días o menos (crítico — atención inmediata).
   - **Rojo invertido**: ya está vencida.
2. **Vehículos sin RUNT cargado** — vehículos a los que les falta subir el PDF del RUNT (naranja).
3. **Vehículos no operativos** — vehículos con estado NO OPERATIVO sin resolver o desactivados (rojo).

Si hay más de 5 ítems en un grupo, aparece un link **"Ver los X restantes →"** que te lleva a la página completa.

**Auto-refresh:** el dashboard se actualiza solo cada 60 segundos sin necesidad de recargar la página. Los números siempre están al día.

> Si **no hay ninguna alerta**, aparece un mensaje verde "Todo está en orden. No hay nada que requiera atención inmediata." Tranquilidad confirmada.

### Gestión de Usuarios

Permite administrar todos los usuarios del sistema (conductores y otros administradores).

**Filtros y herramientas arriba:** búsqueda por nombre o cédula, filtro por rol ("Administradores" agrupa todos los niveles administrativos), filtro por estado (activos/inactivos) y — si hay usuarios de más de una ciudad — un filtro de **ciudad** que se llena solo con las ciudades presentes en tu lista. Botón **"Refrescar"** para recargar la lista sin reiniciar la página.

**La tabla incluye la columna "Ámbito":** te dice de un vistazo de dónde es cada usuario o qué administra — un conductor o coordinador muestra su sede y ciudad ("Sede X · Bogotá"), un Director Regional muestra su departamento, y el Administrador general "Nacional".

**Crear un usuario nuevo:**
1. Click en **+ Crear usuario** (botón verde arriba a la derecha).
2. Llena el formulario:
   - Nombre completo (obligatorio, **solo letras y espacios** — si tipeas algo distinto aparece un aviso naranja explicando).
   - Cédula (obligatorio, **solo números**).
   - Correo electrónico (obligatorio).
   - Teléfono (opcional, **solo números, espacios y signos + -**).
   - Foto del usuario (opcional, máx 5 MB).
   - **Cargo**: el selector muestra **solo los cargos que tú puedes crear** (siempre de rango inferior al tuyo). Un Coordinador de sede solo puede crear **conductores**; un Director Regional puede crear Coordinadores de Flota y conductores. El **Administrador general** puede crear cualquier cargo, **incluyendo otros Directores Nacionales** (para que el nivel nacional nunca dependa de una sola persona) — eso sí, ningún Administrador general puede eliminar ni editar a otro.
   - **Área (territorio)**: el selector se adapta al rol elegido y muestra **solo lo que está dentro de tu área**:
     - Conductor o Coordinador de sede → **Sede**.
     - Director Regional → **Departamento**.
     - (Administrador general no requiere territorio: su alcance es nacional.)
   - Si es Conductor: datos de licencia (número solo dígitos, categoría máx 2 caracteres tipo C2, fecha de vencimiento), EPS y ARL — todos obligatorios.
   - **Pool de transporte** (casilla opcional, **solo la ven los Directores** y solo cuando el cargo es Conductor): al marcarla, ese conductor pasa a ser del **pool**, es decir maneja los **vehículos especiales/VIP** (los personales del Coordinador y los exclusivos de dirección) en lugar de la flota normal. En la tabla de usuarios aparece con el cargo **"Pool"** (etiqueta morada).
3. El sistema genera automáticamente una **contraseña temporal**.
4. Al guardar, aparece un modal con la contraseña temporal y un botón **Copiar al portapapeles** para que se la entregues al usuario nuevo.
5. Aparece un **toast verde de confirmación** arriba-sede con el nombre del usuario creado.

**Editar un usuario:** en la tabla, click en **Editar** del usuario. Se abre el modal de edición con los datos del usuario:

- **Foto, nombre, teléfono, datos de licencia, EPS y ARL** se editan directamente.
- **Rol**: se puede **cambiar** (promover o bajar de nivel), pero solo a roles de **rango inferior al tuyo**. Al elegir otro rol, el campo de área cambia al nivel correspondiente (sede, ciudad, departamento o región) para que asignes el territorio nuevo. Si lo pasás a Conductor, el formulario exige licencia, EPS y ARL. **Nadie puede cambiar su propio rol** (el selector aparece bloqueado si te editás a vos mismo).
- **Pool de transporte** (solo Directores, solo si el cargo es Conductor): la misma casilla del alta. Permite activar o quitar el pool a un conductor existente. Al cambiar el cargo a algo distinto de Conductor, la marca se quita sola.
- **Cédula y correo electrónico** son campos protegidos. Aparecen con un **candado 🔒** y un botón **"🔒 Cambiar"** al lado.

**Cambiar cédula o correo de un usuario:** click en el botón **"🔒 Cambiar"**. Se abre un modal de verificación que:
- Muestra el nombre del usuario y el valor actual del campo a cambiar.
- Si es cédula, muestra un **aviso amarillo crítico** recordando que debes tener el documento físico a la vista.
- Pide el **nuevo valor** y **tu contraseña de administrador** como confirmación de identidad.
- Para cédula, los inputs solo aceptan dígitos (si tipeas letras aparece el aviso naranja).
- Al confirmar, el sistema actualiza el dato y muestra un toast verde con el mensaje específico (ej: "Cédula actualizada correctamente"). El campo del modal de edición se refresca al instante para mostrar el nuevo valor.

**Ver perfil completo:** click en el botón **"Ver perfil"** de un usuario. Te lleva a una página dedicada con:
- Foto grande, nombre, badge de rol, sede y estado (activo/inactivo).
- Datos personales completos.
- Si es conductor: licencia (con indicador de tiempo restante coloreado), EPS y ARL.
- Historial de chequeos: total de chequeos completados, intentos bloqueados, último chequeo con placa y resultado.
- **Actividad reciente**: timeline con las últimas 10 acciones administrativas sobre el usuario (creación, cambios, desactivaciones, etc.) con fecha y quién las hizo.
- Botón **"Editar perfil"** arriba que abre el modal de edición.

**Otras acciones desde la tabla:**
- **Resetear contraseña**: genera una nueva contraseña temporal. Aparece un modal con la clave y botón de copiar.
- **Desactivar**: el usuario ya no puede iniciar sesión pero queda su historial. Aparece un toast naranja.
- **Reactivar**: vuelve a habilitar la cuenta. Toast verde.
- **Eliminar**: borra el usuario permanentemente (con confirmación previa).

> **Importante (jerarquía):** solo ves y gestionas a los usuarios **de tu propia área**, y únicamente a los de **rango inferior** al tuyo. Por seguridad, ningún administrador puede desactivar ni eliminar a otro administrador **de su mismo rango** o superior — eso solo lo puede hacer alguien por encima de él.

### Suplencia del Coordinador (Pool de transporte)

Cuando un Coordinador de sede se ausenta (vacaciones, incapacidad, etc.), un **conductor del pool** puede **reemplazarlo temporalmente**: durante la suplencia gana los permisos de administrador de la sede **sin dejar de ser conductor** (sigue pudiendo hacer chequeos). Esto lo activa y finaliza un **Director** (Regional o Nacional).

**Activar una suplencia (Director):**
1. En **Gestión de usuarios**, en la fila de un conductor del **pool**, pulsa el botón morado **"Suplencia"**.
2. En el modal eliges:
   - **Alcance:** *una sede* (reemplaza al Coordinador de una sede) o *toda la regional* (cubre todas las sedes de un departamento).
   - **Sede** o **departamento** según el alcance.
   - **Fechas** (desde / hasta) y un **motivo**.
3. Al activarla, ese conductor empieza a ver el panel de administración de la sede/área que cubre. Cuando vuelvas a abrir el modal, te muestra **quién activó la suplencia** y desde cuándo.

**Cómo lo vive el suplente (el conductor del pool):**
- Al iniciar sesión ya entra al **panel de administración** (no al de conductor).
- Arriba, una **barra prominente** le muestra **en grande** qué sede está gestionando (y la regional). Si cubre **varias sedes** (suplencia de toda una regional), gestiona **uno a la vez** y tiene un botón **"Cambiar de sede"** para alternar.
- Tiene un botón para **volver a su panel de conductor** cuando quiera (sigue siendo conductor).
- En su perfil aparece su **cargo real** ("Pool de transporte · Suplencia").

**Límites de seguridad del suplente:** como es un reemplazo temporal, **no** puede resetear contraseñas, **no** puede editar a otros administradores y **no** puede desactivarse a sí mismo.

**Finalizar la suplencia:** el Director la finaliza desde el mismo botón **"Suplencia"**. Apenas se finaliza (o si desactivan la cuenta del pool), al suplente se le **saca del panel de administración** automáticamente y vuelve a ser solo conductor.

**Ver qué hizo el pool:** en la fila del conductor del pool, botón **"Actividad"**, que abre una vista con lo que hizo durante sus suplencias.

### Gestión de Vehículos

Permite administrar la flota completa de la sede.

**Navegación por niveles (según tu cargo):** para que no salga una lista enorme con todos los vehículos del país, la pantalla se adapta a tu área:
- **Coordinador de sede:** ve directamente los vehículos de su sede.
- **Director Regional:** ve primero las **tarjetas de las sedes** de su departamento (cada una con cuántos vehículos tiene y sus alertas: críticos / no operativos). Entra a una sede para ver sus vehículos.
- **Administrador general:** ve primero los **departamentos** → entra a uno → ve sus **sedes** → entra a uno → ve los vehículos.
- En los niveles superiores hay un **buscador** (por departamento, sede o ciudad) y un botón **"← Volver"** con la ruta de dónde estás (ej. "Tolima › Sede Bogotá Norte").

**Vista de listado (dentro de una sede):**
- Cards visuales con foto, placa, marca/modelo y estado actual.
- Los vehículos especiales/VIP llevan un **badge ⭐ VIP** en la esquina superior izquierda de la card.
- Filtros por estado, tipo de vehículo y búsqueda por placa.
- Cards de estadística clickeables (Total, Operativo, Observación, Alerta, Crítico, No operativo, Inactivos) que filtran al hacer click.
- Botón de **Refrescar** con auto-refresh cada 30 segundos.

**Crear un vehículo:**
1. Click en **+ Crear vehículo**.
2. Llena los datos: placa, marca, línea/modelo, tipo, año, VIN, color, kilometraje.
   - **Vehículo especial / de dirección (VIP)** (casilla opcional, **solo la ven los Directores**): márcala para los vehículos personales del Coordinador o exclusivos de dirección. Estos vehículos los manejan **solo los conductores del pool**, no la flota normal.
3. Vencimientos: SOAT, RTM, extintor, último cambio de aceite.
4. Estado y nivel de criticidad (vinculados automáticamente con un slider de colores).
5. Subir fotos del vehículo (mínimo 1, máx 5 MB cada una). La primera se marca como principal.
6. Subir el archivo RUNT en PDF (máx 20 MB).
7. Notas y observaciones (opcional).
8. Click en **Crear vehículo**.

**Ver detalle de un vehículo:**
1. En el listado, click en **Detalle** de una card.
2. Vas a la página completa con: foto grande, datos básicos, documentación con fechas, ubicación de la sede, notas, galería de fotos navegable (click en una foto abre el visor Lightbox con flechas y zoom) y visor del RUNT embebido en PDF.

**Editar un vehículo:**
1. Desde el listado o la vista detalle, click en **Editar**.
2. Cambia lo que necesites.
3. Acciones rápidas: marcar foto como principal, eliminar foto, reemplazar el RUNT.
4. Click en **Guardar cambios**.

### Catálogo del chequeo

Permite al administrador gestionar el contenido del chequeo preoperacional (preguntas, ítems y categorías) sin necesidad de modificar la base de datos directamente.

**Acceso:** Dashboard → **Catálogo del chequeo** (`/admin/catalogo`).

La pantalla tiene 3 pestañas en la parte superior:

**Pestaña Categorías:**
- Lista de las 5 categorías oficiales del checklist (Niveles, Pedales, Luces, Seguridad Vial, Varios) con su ícono visual.
- Botón **"+ Nueva categoría"**: abre un formulario con nombre (se escribe en mayúsculas automáticamente), descripción, orden y un **selector visual de íconos** (puedes escribir cualquier emoji a mano, elegir de la grilla sugerida, o dejar sin ícono).
- Cada categoría tiene botones **"Editar"** y **"Eliminar"**.

**Pestaña Ítems del checklist:**
- Lista de los 39 ítems oficiales agrupados por categoría.
- Botón **"+ Nuevo ítem"**: formulario con la categoría (dropdown), descripción corta, descripción larga opcional, orden, checkbox **"Marcar como CRÍTICO"** (los críticos bloquean el vehículo si se marcan como NO CUMPLE), y checkboxes para definir si aplica al chequeo preoperacional, postoperacional o ambos.
- Cada ítem editable y eliminable.

**Pestaña Preguntas de aptitud:**
- Las 5 preguntas sobre el estado físico y mental del conductor.
- Crear, editar y eliminar.
- Para cada pregunta se define cuál es la respuesta apta (SÍ o NO), porque algunas preguntas son afirmativas y otras negativas (por ejemplo "¿Descansó lo suficiente?" la apta es SÍ; "¿Tomó medicamentos que dan sueño?" la apta es NO).

**Eliminación inteligente:**
- Si la categoría, ítem o pregunta **nunca se ha usado** en un chequeo real, se elimina permanentemente de la base de datos.
- Si **ya tiene historial** (algún chequeo la respondió), se desactiva nada más para no romper los chequeos anteriores. El admin puede reactivarla después editándola.
- El modal de confirmación explica este comportamiento antes de confirmar.

**Nota importante:** los cambios se aplican **inmediatamente** en la app del conductor. Si agregas un ítem nuevo, el próximo conductor que abra el checklist lo verá.

### Chequeos realizados (lista)

Acceso: Dashboard → **Chequeos realizados** (`/admin/chequeos`).

Lista de todos los chequeos que los conductores han realizado, visibles según la jerarquía del administrador (un admin de sede ve solo los chequeos de su sede, un admin regional ve todas las sedes de su regional, etc.).

**Filtros disponibles:**
- **Fecha desde / Fecha hasta:** rango de fechas.
- **Placa:** búsqueda libre, tolerante a espacios y mayúsculas (`ABC 123`, `abc123`, `ABC-123` matchean igual).
- **Estado del resultado:** Operativo, Observación, Alerta, Crítico, No operativo o "Todos".
- **Solo oficiales:** filtra los rechequeos del mismo día sobre el mismo vehículo (deja solo el chequeo principal).
- **Solo cerrados:** filtra los chequeos que el conductor empezó pero no terminó (deja solo los finalizados con resultado).
- Botón **Limpiar filtros** para resetear todo.

**Cada chequeo se ve como una tarjeta** con borde izquierdo del color del estado (verde, azul, amarillo, rojo, gris oscuro), con la placa grande, marca y línea del vehículo, conductor con CC, fecha y hora, badges de tipo (PRE/POST) y carácter (OFICIAL/RECHEQUEO/CERRADO), y los conteos cumple/no cumple/N/A.

Click en cualquier tarjeta abre el **detalle completo del chequeo**.

### Detalle de un chequeo

Acceso: desde la lista, click en cualquier card; o ruta directa `/admin/chequeos/:id`.

**Secciones de la pantalla:**

1. **Resultado y resumen** (arriba, con fondo de color según semáforo): badge del estado del vehículo (Operativo / Observación / Alerta / Crítico / No operativo), tipo de chequeo, fecha de inicio y cierre, kilometraje registrado, conteos cumple/no cumple/N/A y badge especial si hubo falla crítica.
2. **Vehículo:** foto principal, placa, marca, línea, año, tipo, color, VIN, estado actual del vehículo. Botón **"Ver ficha completa del vehículo →"** para abrir el detalle desde la sección de vehículos.
3. **Conductor:** foto, nombre completo, cédula, teléfono, datos completos de la licencia (número, categoría, vencimiento).
4. **Aptitud personal:** las 5 preguntas con un círculo verde con ✓ si la respuesta fue apta, o rojo con ✕ si no fue apta. Se ve la respuesta del conductor y cuál era la apta.
5. **Checklist del vehículo:** los ítems agrupados por categoría con cabecera verde y el ícono. Cada ítem muestra su descripción, badge CRÍTICO si aplica, estado (Cumple/No cumple/N/A), la observación del conductor (en bloque rosa si fue No cumple) y la grilla de fotos de evidencia si las hay.
6. **Notas generales** (si las hay): texto libre del conductor.

**Sobre las fotos:** cada foto es una tarjeta con la imagen + un botón debajo:
- **"Preservar siempre"** (texto morado): marca la foto como protegida del borrado automático. Útil cuando la foto es evidencia de un reclamo o auditoría en curso.
- Si ya está preservada: cambia a **"Quitar preservar"** y aparece un badge morado **"PRESERVADA"** en la esquina superior izquierda de la foto.
- Click en la foto la abre en una pestaña nueva en tamaño completo.

### Intentos bloqueados

Acceso: desde la lista de chequeos, botón **"Intentos bloqueados"** arriba a la derecha; o ruta directa `/admin/chequeos/intentos-bloqueados`.

Lista de todos los intentos de iniciar un chequeo que el sistema rechazó, registrados automáticamente para auditoría y notificación al administrador.

**Hay 3 razones de bloqueo:**

| Razón | Color | Cuándo se dispara |
|---|---|---|
| **Conductor no apto** | Rojo | El conductor respondió que no estaba en condiciones para conducir en alguna de las 5 preguntas de aptitud |
| **Vehículo desactivado** | Naranja | El conductor intentó usar un vehículo que el admin tiene desactivado |
| **Vehículo no encontrado** | Morado | El conductor intentó usar un vehículo que no existe o que pertenece a otra sede |

**Filtros:** fecha desde/hasta, razón del bloqueo, **"Solo pendientes de notificar"** (muestra solo los intentos sobre los que el admin todavía no recibió notificación).

**Cada intento aparece como una tarjeta** con borde izquierdo del color, frase explicativa, conductor + CC, vehículo (o "Sin vehículo seleccionado" si fue por aptitud), fecha y hora, y badge "NOTIFICADO" (verde) o "PENDIENTE DE NOTIFICAR" (amarillo).

### Exportar a PDF / Word

Los documentos importantes se pueden **descargar en PDF o Word** con un diseño profesional (cabecera de color con "{Organización} · Regional {departamento} · {Sede}", y un pie con la fecha de generación y el número de página). En cada caso hay **dos botones: "PDF" (rojo) y "Word" (azul)**. Solo los administradores/directivos pueden exportar.

Qué se puede exportar y desde dónde:
- **Detalle de un chequeo:** desde la página del chequeo (botón arriba) o desde cada tarjeta en el listado de chequeos. Incluye el resultado, los datos del vehículo y del conductor, y todo el checklist.
- **Ficha de un vehículo:** desde el detalle del vehículo (junto a *Editar / Abrir RUNT*) o desde su tarjeta en el listado. Incluye identificación, documentación con **los vencidos en rojo**, ubicación, notas y los últimos chequeos (con el conductor que los hizo).
- **Ficha de un conductor:** desde su perfil ("Ver perfil") o desde su fila en **Gestión de usuarios** (solo aparece en conductores). Incluye identificación, licencia (marcada si está vencida), EPS/ARL, ubicación y sus últimos chequeos.
- **Reporte / listado de chequeos:** desde la página **Chequeos realizados**, con los botones arriba a la derecha. Genera una tabla (en hoja horizontal) con **todos** los chequeos que cumplen **los filtros que tengas puestos** (período, placa, resultado…), respetando tu área.

> El archivo se descarga solo: el Word abre directamente en Word (en horizontal cuando es el reporte) y el PDF en cualquier visor. El nombre del archivo incluye la placa o la cédula para ubicarlo fácil.

### Apariencia: modo claro y oscuro

El sistema tiene **dos temas**: **Claro** (el de siempre) y **Oscuro** (fondo negro con acentos en el color primario, más cómodo de noche o con poca luz). Por defecto el sistema arranca en **Claro**.

**Dónde cambiarlo:** en el sidebar entra a **Ajustes** → sección **Apariencia** y elige **Claro** u **Oscuro**. El cambio es **inmediato** (con una animación de "onda" que repinta la pantalla desde el botón) y se **recuerda** la próxima vez que entres.

- Solo hay dos opciones: **Claro** y **Oscuro** (no hay "automático").
- El tema aplica a **toda** la aplicación: paneles, tablas, fichas y formularios.
- Si en tu sistema operativo tienes activada la opción de *reducir movimiento*, el cambio se hace sin la animación.

> El tema se guarda por **navegador/dispositivo**. Si entras desde otro computador o navegador, allí eliges el suyo. **No** afecta a lo que ven los demás usuarios.

---

## 4. Mi perfil

Cualquier usuario logueado (admin o conductor) tiene acceso a su propio perfil. Desde ahí puede ver sus datos completos y editar los que están permitidos.

### Cómo acceder

**Si eres admin:**
- Desde el **sidebar**, ítem **"Mi perfil"** (al final, antes del logout).
- O desde el **header**, click en tu nombre arriba a la derecha.

### Qué puedes ver

- Tu **foto** grande (avatar circular con borde verde).
- Tu **nombre completo**.
- Tu **rol** y tu **sede**.

### Qué puedes editar tú mismo

- **Foto**: pulsa el botón **"Cambiar foto"** debajo del avatar. Abre el selector de archivos (formatos JPEG, PNG, WebP, máx 5 MB). Mientras no guardes, ves un aviso "Hay una foto nueva sin guardar".
- **Nombre completo**: solo letras y espacios. Si tipeas un número aparece un aviso naranja.
- **Teléfono**: solo números, espacios y signos `+` `-`. Si tipeas una letra aparece un aviso.
- Para confirmar los cambios pulsa **"GUARDAR CAMBIOS"** (botón verde grande). Aparece un toast verde "Perfil actualizado correctamente" y los cambios se ven al instante en el header y el sidebar.

### Qué NO puedes editar tú mismo

- **Cédula**: aparece bloqueada con un candado 🔒.
- **Correo electrónico**: igual, bloqueado con candado 🔒.

Debajo de los campos protegidos verás un aviso amarillo explicando que para cambiar estos datos debes contactar a **un administrador de rango superior**. Esto es una medida de seguridad: ningún admin puede cambiarse a sí mismo datos críticos sin que quede registro de un superior aprobándolo.

> **Si eres super administrador:** no existe nadie por encima tuyo, así que el aviso te indica que esos datos se gestionan directamente con el **soporte técnico** de la plataforma.

### Cambiar mi contraseña

Desde Mi perfil, botón **"🔑 Cambiar mi contraseña"** (debajo, izquierda). Te lleva al flujo de cambio de contraseña.

**Flujo de cambio de contraseña:**
1. Ingresa tu contraseña **actual** (verificación de identidad).
2. Ingresa la nueva contraseña (mínimo 8 caracteres).
3. Confírmala en el segundo campo.
4. Pulsa **Cambiar contraseña**.
5. Verás un mensaje verde de éxito y el sistema te regresa al dashboard automáticamente. **Tu sesión sigue activa**, no necesitas volver a iniciar sesión con la clave nueva.

> En cada campo de contraseña hay un **ícono de ojo 👁** para mostrar/ocultar lo que escribiste. Útil para verificar contraseñas difíciles antes de guardar.

---

## 5. Flujo del Conductor

### Dashboard del conductor

Después de iniciar sesión, el conductor ve una pantalla optimizada para celular con su información personal y los accesos al chequeo.

**Header sticky (arriba):** logo de SISVIA + un **interruptor de tema** (sol/luna) + tu primer nombre + botón **"Cerrar sesión"** rojo (en móvil queda solo el ícono). Con el interruptor cambias entre **claro y oscuro** — es la forma del conductor de cambiar el tema, ya que no tiene página de Ajustes.

**Contenido principal — todo agrupado en una tarjeta blanca grande:**

1. **Tu foto** grande (avatar circular con borde verde de 4px). Si no tienes foto, aparece un círculo verde con la inicial de tu nombre.
2. **Hola, [TU NOMBRE]** en grande, verde oscuro.
3. **CONDUCTOR** como rol.
4. **Tu sede** como chip de color con borde (ej: "🏢 Sede Bogotá Norte").
5. **Fecha de hoy** en español (ej: "viernes 5 de junio de 2026").
6. **Dos círculos grandes a la sede** para iniciar el chequeo:
   - **Preoperacional** (círculo verde sólido) — antes de salir con el vehículo.
   - **Post-operacional** (círculo blanco con borde naranja) — al regresar del recorrido.
   - Al pasar el dedo o el mouse encima se levantan suavemente (efecto hover).
7. **Tu licencia de conducción** con tres datos:
   - **Categoría** (ej: C2).
   - **Número** de licencia.
   - **Vencimiento** con un indicador de color por urgencia:
     - **Verde**: vence en más de 30 días — sin preocupaciones.
     - **Naranja**: vence en 30 días o menos — empezar a tramitar renovación.
     - **Rojo**: vence en 15 días o menos — urgente.
     - **Rojo invertido (sólido)**: ya está vencida — debes renovarla cuanto antes.

> Las pantallas del chequeo (aptitud, selección de vehículo, checklist y resultado) están diseñadas para mantenerte enfocado en el proceso. Por eso **NO tienen botón de cerrar sesión** mientras estás en el flujo — para evitar que pulses algo por error y pierdas el progreso. Solo puedes cerrar sesión desde el dashboard antes de empezar o después de finalizar.

### Cómo hacer un chequeo preoperacional

El chequeo preoperacional se realiza en 4 pasos:

#### Paso 1 — Aptitud personal
1. Pulsa **Iniciar chequeo preoperacional** (círculo verde) desde tu dashboard.
   - Antes de empezar, el sistema **verifica que haya vehículos disponibles para ti** en tu sede (el círculo muestra "Verificando…" un instante). Si **no hay ninguno**, te avisa con un mensaje ("No hay vehículos disponibles para ti en tu sede… avísale al Coordinador de sede") y **no te hace perder tiempo** haciendo la aptitud para nada. Si eres del **pool de transporte**, solo cuentan los vehículos especiales/VIP de tu sede.
2. El sistema te muestra **5 preguntas, una por pantalla**, sobre tu estado físico y mental (cansancio, medicamentos, alcohol, etc.).
3. En cada pregunta tienes dos botones grandes: **SÍ** (verde) y **NO** (con borde rojo).
4. Cuando seleccionas una respuesta, aparece un **modal de confirmación** preguntándote *"¿Tu respuesta es SÍ/NO?"*. Esto es a propósito: evita que un toque accidental en la pantalla del celular registre una respuesta equivocada.
   - Si te equivocaste, pulsa **Volver atrás**.
   - Si está bien, pulsa **Sí, confirmar** y pasas a la siguiente pregunta.
5. En la parte superior verás una **barra de progreso** que indica en qué pregunta vas (por ejemplo: "3 DE 5").
6. Si **todas tus respuestas son aptas**, el sistema te lleva al siguiente paso (selección de vehículo).
7. Si **alguna respuesta indica que no estás apto** (por ejemplo, "Sí, tomé medicamentos que dan sueño"), el sistema:
   - Te muestra una **pantalla de bloqueo en rojo** que dice "No estás en condiciones aptas".
   - Lista cuál o cuáles preguntas no fueron aptas, para que sepas claramente el motivo.
   - **Notifica automáticamente al administrador** que hubo un intento bloqueado.
   - Te ofrece un botón **Volver al inicio**.

> **Recomendación:** responde siempre con honestidad. La aptitud personal protege tu vida, la de los demás conductores y los recursos de la organización. Un "no apto" no es un castigo, es una pausa preventiva.

#### Paso 2 — Selección de vehículo
1. Si todas las preguntas de aptitud fueron aptas, el sistema te lleva a la pantalla de **Selección de vehículo**.
2. Ves un **buscador por placa** en la parte de arriba (puedes escribir las primeras letras, ej: "OCJ").
3. Debajo aparece la **lista de vehículos disponibles de tu sede**. Cada vehículo se muestra como una tarjeta con:
   - La **placa** grande.
   - **Marca, línea y año**.
   - Una **etiqueta de color** con el estado actual (Operativo en verde, Observación en azul, Alerta en amarillo, Crítico en rojo, No operativo en gris oscuro).
   - El **último kilometraje** registrado.
4. Toca la tarjeta del vehículo que vas a usar. Aparece un **modal de confirmación** con:
   - Resumen del vehículo seleccionado.
   - Campo para ingresar el **kilometraje actual** (precargado con el último registrado).
   - Botones: *Volver atrás* / *Iniciar chequeo*.
5. Valida que el kilometraje no sea menor al registrado (no se puede "retroceder").
6. Al confirmar, el sistema crea el chequeo en la base de datos y te lleva al paso siguiente (la lista de 39 ítems).

> **Importante:** solo verás los vehículos **activos de tu sede**. Si necesitas usar un vehículo de otra sede o un vehículo desactivado, contacta al administrador.

#### Paso 3 — Lista de chequeo de 39 ítems
1. La lista está organizada en **5 categorías**: Niveles, Pedales, Luces, Seguridad Vial, Varios. **Ves una categoría a la vez** (5 pantallas en total).
2. En la parte de arriba ves una **barra de 5 bloques** que indica en qué categoría vas (verde oscuro = actual, verde claro = ya completada, gris = pendiente).
3. Cada ítem se muestra como una **tarjeta** con:
   - Descripción corta y, debajo, una descripción más larga (si aplica).
   - Tres botones grandes: **Cumple** (verde), **No cumple** (rojo), **N/A** (gris).
   - Si el ítem es **crítico** (afecta directamente la seguridad), aparece un **badge rojo "CRÍTICO"** al lado.
4. Cuando marcas **No cumple**, aparece automáticamente un cuadro de texto debajo para la **observación obligatoria** (no puedes seguir sin escribirla). Allí describes qué está mal.
5. Cuando termines todos los ítems de la categoría, pulsa **Siguiente →**. El sistema guarda automáticamente tus respuestas en la base de datos antes de pasar a la siguiente categoría.
6. Si te falta marcar algo o falta una observación, el sistema te muestra un mensaje rojo arriba de los botones y no te deja avanzar.
7. Puedes ir hacia atrás con el botón **← Anterior** en cualquier momento.
8. En la **última categoría**, el botón cambia a **Finalizar chequeo** (en naranja). Al pulsarlo, aparece un modal de confirmación recordándote que ya no podrás editar.

> **Importante:** las respuestas se guardan en tu navegador automáticamente. Si por algún motivo cierras la página o se recarga, **al volver entrar al chequeo sigues desde donde ibas** (no pierdes lo que ya respondiste). Pero ojo: para que queden registradas oficialmente en el sistema, debes pulsar **Siguiente** o **Finalizar**.

#### Adjuntar fotos de evidencia
Cuando marcas un ítem como **No cumple** y escribes la observación, aparece debajo la sección **"Evidencia fotográfica (opcional)"** con dos botones:

- **"Tomar foto"** (verde sólido): en celular abre la **cámara nativa** directamente. En computador abre el selector de archivos.
- **"Subir foto"** (blanco con borde verde punteado): siempre abre el selector de archivos / galería.

**Reglas y límites:**
- Máximo **3 fotos por ítem**.
- Formatos aceptados: JPG, PNG, WebP (y cualquier formato que la cámara del celular produzca — el sistema lo convierte automáticamente).
- Las fotos se **comprimen automáticamente** en el celular antes de subir (las cámaras modernas producen 5-8 MB, después de comprimir quedan en 500 KB - 1 MB sin pérdida visible). Esto hace que subir sea mucho más rápido con datos móviles.
- Solo aparece el botón cuando escribiste al menos 5 caracteres de observación (porque la observación es la descripción del problema y la foto es la evidencia).
- Mientras sube ves "Subiendo foto..." y los botones quedan deshabilitados.

**Eliminar una foto:** click en el **círculo rojo con X** en la esquina superior derecha de la previsualización. El sistema pide confirmación antes de eliminar.

**Si cambias de opinión:** si tienes fotos subidas y cambias el ítem de "No cumple" a otro estado (Cumple o N/A), el sistema te avisa que se eliminarán las fotos y pide confirmación. Si aceptas, las borra automáticamente.

**Qué hace el sistema con las fotos:** se conservan automáticamente **12 meses** desde que se subieron. Después se borran solas para liberar espacio. Si el administrador necesita guardar una foto específica para una reclamación, una auditoría o un caso especial, puede marcarla como **"Preservar siempre"** desde la pantalla de detalle del chequeo, y esa foto ya no se borra automáticamente.

#### Paso 4 — Resultado del chequeo
Después de finalizar, el sistema calcula automáticamente el estado del vehículo y te lleva a una **pantalla de resultado a color**:

| Estado | Color | Significado |
|---|---|---|
| **OPERATIVO** | Verde | Puedes salir sin restricciones. |
| **OBSERVACIÓN** | Azul | Detalles menores. Puedes operar pero repórtalo. |
| **ALERTA** | Amarillo | Varias fallas. Reporta antes de operar. |
| **CRÍTICO** | Rojo | Fallas graves. **Se recomienda no operar.** |
| **NO OPERATIVO** | Gris oscuro | **NO PUEDES operar el vehículo.** Hay falla crítica o demasiadas fallas. |

En la pantalla verás:
- **Tarjeta principal**: el estado con un ícono dentro de un círculo de color y un texto que te explica qué hacer.
- **Resumen del chequeo**: cuántos ítems marcaste Cumple, No cumple y N/A.
- **Alerta de críticos**: si hubo ítems críticos fallados, aparece un bloque rojo destacado con el número.
- **Datos del vehículo**: la placa grande y el tipo de chequeo (pre/post).
- **Aviso de actualización**: si el sistema actualizó el estado del vehículo automáticamente (porque el resultado es peor), te lo dice.
- **Aviso de sugerencia**: si el resultado del vehículo es **mejor** que su estado anterior, el sistema envía una sugerencia al administrador para revisar y actualizar manualmente. A ti se te informa para que sepas que tu chequeo aportó esa mejora.
- **Botón "Volver al inicio"**: te lleva de vuelta a tu dashboard de conductor.

> **NO OPERAR EL VEHÍCULO**: si el resultado es Crítico o No operativo, la pantalla muestra una franja roja gigante con ese mensaje. El administrador ya fue notificado automáticamente.

### Cómo hacer un chequeo post-operacional

Al regresar de un recorrido, repites el mismo proceso pero seleccionando **Chequeo post-operacional** en el dashboard. Esto sirve para comparar el estado del vehículo antes y después del uso.

### Reglas importantes

- **Solo puedes operar vehículos de tu sede** asignado.
- **No puedes usar un vehículo desactivado** por el administrador. Si lo intentas, el sistema te bloquea y notifica al admin.
- **Tu licencia de conducción debe estar vigente.** Si está vencida, el sistema **no te deja iniciar ningún chequeo**: los botones del dashboard quedan deshabilitados y verás un aviso rojo. Además, el administrador es notificado automáticamente (al iniciar sesión y si intentas un chequeo) para que gestione tu renovación. Debes renovar la licencia y pedirle al administrador que actualice la fecha en el sistema.
- **Los documentos del vehículo deben estar vigentes.** Si el **SOAT, la revisión técnico-mecánica (RTM) o el extintor** del vehículo están vencidos, el sistema **no te deja iniciar el chequeo preoperacional** con ese vehículo (legalmente no puede circular) y te dice cuál documento está vencido. Avísale al Coordinador de sede para que lo renueve. *(El post-operacional sí se permite, para poder cerrar un recorrido que ya ocurrió.)*
- **El primer chequeo del día** se marca como "oficial". Los siguientes del mismo día son rechequeos (útiles si hubo reparación a mediodía).
- **Las fotos de evidencia** se conservan automáticamente por 12 meses. El administrador puede marcarlas como "preservar siempre" si son importantes.

---

## 6. Cerrar sesión

**Admin:** botón **"Cerrar sesión"** rojo, al final del sidebar (parte inferior izquierda).

**Conductor:** botón **"Cerrar sesión"** arriba a la derecha del header. **Solo disponible desde el dashboard** del conductor (NO durante el flujo del chequeo).

Por seguridad:
- Tu sesión tiene una duración limitada. Si pasa mucho tiempo sin actividad, el sistema te puede sacar automáticamente.
- Siempre cierra sesión en computadores compartidos.

---

## 7. Solución de problemas comunes

### No puedo iniciar sesión

- Verifica que el correo o cédula estén bien escritos.
- Verifica la contraseña (puede haber mayúsculas o minúsculas activadas que no notas).
- Si te equivocas 5 veces, espera 15 minutos antes de reintentar.
- Si olvidaste la contraseña, contacta al administrador para que te genere una nueva.

### La página se ve incompleta o con errores

- Asegúrate de tener conexión a internet estable.
- Refresca la página con `Ctrl + F5` (recarga forzada).
- Si sigues teniendo problemas, cierra el navegador completo y vuelve a entrar.

### Subí una foto y no aparece

- Verifica que el archivo sea menor a 5 MB.
- Verifica que sea JPEG, PNG o WebP.
- Espera unos segundos: las fotos pueden tardar en cargarse la primera vez.

### El sistema me sacó automáticamente

- Tu sesión expiró por inactividad. Vuelve a iniciar sesión.
- Si pasa frecuentemente, verifica que tu equipo tenga la hora correcta.

### "No tienes sede asignada" (conductor)

- Tu cuenta no tiene una sede asignada. Contacta al administrador para que te lo asigne.
