# Mapa del código del Sistema de Gestión de Flota

Esta es una **guía rápida** para que cualquier persona (programador o no) sepa dónde está cada cosa del proyecto sin tener que abrir y leer archivos al azar.

> **Si eres nuevo en el proyecto, lee primero este archivo.**
>
> **Última actualización:** 8 de junio de 2026 (Fase 4 — navegación unificada, dashboard, notificaciones, perfiles, licencia vencida).

---

## 1. Recursos visuales (logos, imágenes, íconos)

| Quiero cambiar... | Dónde está | Cómo se cambia |
|---|---|---|
| El logo del producto | `frontend/public/logo.png` | Reemplazar el archivo PNG con el mismo nombre |
| El **nombre** del producto | `frontend/src/lib/marca.js` y `backend/src/config/marca.js` | Cambiar ahí; no está hardcodeado en ningún componente |
| El nombre de la organización cliente | `ORG_NOMBRE` / `VITE_ORG_NOMBRE` en los `.env` | Variable de entorno, no código |
| El logo de ICI | `frontend/public/ici.png` | Reemplazar el archivo PNG |
| Los íconos 🚛 y 🏁 del dashboard | `frontend/src/pages/Conductor/ConductorDashboard.jsx` | Son emojis Unicode escritos en el JSX. Buscar y reemplazar el emoji |
| Los íconos de categorías del chequeo (Niveles, Pedales, etc.) | Base de datos, tabla `categorias_chequeo`, columna `icono` | Ver sección 3 (catálogo del chequeo) |

---

## 2. Colores, tipografías, espaciados (diseño global)

Todo el diseño está centralizado en **un solo archivo de variables CSS**:

```
frontend/src/styles/variables.css
```

Allí están todos los colores (primario, naranja, rojo, etc.), tamaños de texto, espacios y sombras. Si quieres cambiar el color primario del sistema, lo haces ahí una vez y se actualiza en todas las páginas.

Cada componente tiene su propio archivo CSS al lado del JSX. Ejemplo:

```
frontend/src/pages/Login/
├── Login.jsx       (la lógica y la estructura)
└── Login.css       (los estilos solo de esta pantalla)
```

**No usamos Tailwind.** Todo es CSS modular.

---

## 3. Catálogo del chequeo preoperacional (preguntas, ítems, categorías)

Este es el contenido del chequeo que hace el conductor. Está en **base de datos** porque queremos que cada cliente pueda ajustarlo sin necesitar al desarrollador.

### Dónde está la fuente de verdad inicial

| Quiero cambiar... | Archivo SQL en Git |
|---|---|
| Las 5 categorías y sus íconos | `database/seeds/01_categorias_chequeo.sql` |
| Los 39 ítems del chequeo (y cuáles son críticos) | `database/seeds/02_items_chequeo.sql` |
| Las 5 preguntas de aptitud del conductor | `database/seeds/03_preguntas_aptitud.sql` |
| Las regiones de Colombia | `database/seeds/04_regiones.sql` |
| Los departamentos de Colombia | `database/seeds/05_departamentos.sql` |

### Cómo se cambia algo (la forma fácil) ✅

**Entra como admin al sistema → Dashboard → "Catálogo del chequeo"** (`/admin/catalogo`).

Allí tienes 3 pestañas:
- **Categorías**: crear, editar (incluyendo cambiar el ícono visual), desactivar.
- **Ítems del checklist**: crear, editar (incluyendo marcar/desmarcar como críticos), desactivar. Agrupados por categoría.
- **Preguntas de aptitud**: crear, editar, desactivar.

Los cambios se reflejan **inmediatamente** en la app del conductor. No necesitas saber SQL ni tocar código.

> Si por algún motivo quieres editar directamente la BD (avanzado), las tablas son `categorias_chequeo`, `items_chequeo`, `preguntas_aptitud`. Los archivos JSX de la pantalla admin son:
> - `frontend/src/pages/CatalogoAdmin/CatalogoAdmin.jsx`
> - `backend/src/services/catalogoAdmin.service.js`
> - `backend/src/controllers/catalogoAdmin.controller.js`
> - `backend/src/routes/catalogoAdmin.routes.js`

### Por qué los textos no están hardcodeados en los JSX del conductor

Si las preguntas estuvieran escritas directamente en `ChequeoAptitud.jsx`, cualquier cambio requeriría: editar código → commit → push → redeploy. Como están en BD y editables desde el admin, el cliente puede ajustar el chequeo en vivo sin pasar por desarrollo. El archivo JSX solo dibuja la pantalla; el contenido viene de la BD.

---

## 4. Datos de prueba (usuarios, vehículos)

| Quiero cambiar... | Cómo |
|---|---|
| El primer usuario admin | Se crea manualmente al iniciar el proyecto. Las instrucciones están en `docs/CONTEXTO_PROYECTO.md` |
| Los vehículos de prueba | Por la interfaz: entra como admin → Gestión de vehículos → Crear vehículo |
| Los conductores de prueba | Por la interfaz: entra como admin → Gestión de usuarios → Crear usuario (rol: Conductor) |

---

## 5. Lógica del negocio (¿cómo se calcula el estado del vehículo?)

Toda la lógica de cálculo del chequeo (qué estado le da al vehículo, cuándo bloquea, etc.) está en:

```
backend/src/services/chequeos.service.js
```

Funciones clave:
- `evaluarAptitud()` — decide si el conductor está apto.
- `calcularResultado()` — calcula el estado final del vehículo (operativo / observación / alerta / crítico / no operativo).
- `cerrarChequeo()` — cierra el chequeo y actualiza el vehículo si corresponde.

Las reglas de negocio están explicadas en `docs/CONTEXTO_PROYECTO.md` sección 9.

---

## 6. Páginas del frontend (dónde está cada pantalla)

### Pantallas comunes (login)

| Pantalla | Archivo |
|---|---|
| Inicio de sesión | `frontend/src/pages/Login/Login.jsx` |
| Cambio obligatorio de contraseña | `frontend/src/pages/CambiarPassword/CambiarPassword.jsx` |

### Pantallas del admin

Todas las pantallas "raíz" del admin van envueltas en el **AdminLayout** (menú lateral + cabecera con campanita + footer). Las pantallas de detalle NO llevan menú lateral; usan el botón `BotonVolver`.

| Pantalla | Archivo |
|---|---|
| Dashboard del admin (KPIs + alertas) | `frontend/src/pages/Dashboard/Dashboard.jsx` |
| Gestión de usuarios | `frontend/src/pages/UsuariosAdmin/UsuariosAdmin.jsx` |
| Perfil de un usuario (detalle) | `frontend/src/pages/PerfilUsuario/PerfilUsuario.jsx` |
| Mi perfil (del propio admin) | `frontend/src/pages/MiPerfil/MiPerfil.jsx` |
| Gestión de vehículos | `frontend/src/pages/VehiculosAdmin/VehiculosAdmin.jsx` |
| Detalle de un vehículo | `frontend/src/pages/VehiculoDetalle/VehiculoDetalle.jsx` |
| **Catálogo del chequeo** (preguntas, ítems, categorías) | `frontend/src/pages/CatalogoAdmin/CatalogoAdmin.jsx` |
| Chequeos realizados (lista) | `frontend/src/pages/ChequeosAdmin/ChequeosAdmin.jsx` |
| Detalle de un chequeo | `frontend/src/pages/ChequeoDetalle/ChequeoDetalle.jsx` |
| Intentos bloqueados | `frontend/src/pages/IntentosBloqueados/IntentosBloqueados.jsx` |
| Todas las notificaciones | `frontend/src/pages/Notificaciones/Notificaciones.jsx` |
| Gestión de geografía (ciudades + sedes) | `frontend/src/pages/GeografiaAdmin/GeografiaAdmin.jsx` (solo Administrador general y Regional) |

### Pantallas del conductor

Las pantallas del conductor usan el **ConductorLayout** (cabecera simple + cerrar sesión + footer, sin menú lateral porque el flujo es lineal).

| Pantalla | Archivo |
|---|---|
| Dashboard del conductor | `frontend/src/pages/Conductor/ConductorDashboard.jsx` |
| Aptitud (5 preguntas) | `frontend/src/pages/Conductor/ChequeoAptitud.jsx` |
| Selección de vehículo | `frontend/src/pages/Conductor/SeleccionVehiculo.jsx` |
| Checklist (5 categorías) | `frontend/src/pages/Conductor/ChequeoItems.jsx` |
| Resultado final | `frontend/src/pages/Conductor/ChequeoResultado.jsx` |

---

## 6.1 Componentes reutilizables (se usan en varias pantallas)

| Componente | Para qué sirve | Archivo |
|---|---|---|
| **AdminLayout** | Envoltorio de todas las páginas raíz del admin: menú lateral, cabecera, campanita, footer | `frontend/src/components/AdminLayout/AdminLayout.jsx` |
| **Sidebar** | El menú lateral con los accesos a cada módulo | `frontend/src/components/AdminLayout/Sidebar.jsx` |
| **Campanita** | Notificaciones en tiempo real con dropdown y punto rojo | `frontend/src/components/AdminLayout/Campanita.jsx` |
| **ConductorLayout** | Envoltorio de las pantallas del conductor (cabecera + footer, sin menú) | `frontend/src/components/ConductorLayout/ConductorLayout.jsx` |
| **BotonVolver** | Botón "Volver al listado" para páginas de detalle | `frontend/src/components/BotonVolver/BotonVolver.jsx` |
| **InputPassword** | Campo de contraseña con botón de ojo (mostrar/ocultar) | `frontend/src/components/InputPassword/InputPassword.jsx` |
| **Toast** | Notificaciones temporales (éxito/error/aviso) | `frontend/src/components/Toast/Toast.jsx` |
| **Modal** | Ventana modal base reutilizable | `frontend/src/components/Modal/Modal.jsx` |
| **Lightbox** | Visor de fotos con flechas y zoom | `frontend/src/components/Lightbox/Lightbox.jsx` |
| **Footer** | Pie institucional con logos | `frontend/src/components/Footer/Footer.jsx` |

### Hooks y utilidades del frontend

| Archivo | Para qué sirve |
|---|---|
| `frontend/src/hooks/useAuth.js` | Acceso al usuario logueado y sesión |
| `frontend/src/hooks/useNotificaciones.js` | Contador + lista de notificaciones (Realtime + polling de respaldo) |
| `frontend/src/hooks/useTimeoutAbandono.js` | Detecta inactividad/cierre en el checklist y reporta abandono |
| `frontend/src/lib/api.js` | Helper central para llamar al backend |
| `frontend/src/lib/supabaseClient.js` | Cliente de Supabase solo para Realtime de notificaciones |
| `frontend/src/lib/notificacionesUtils.js` | Íconos, colores y tiempo relativo de notificaciones |
| `frontend/src/lib/roles.js` | Jerarquía de roles (espejo del backend): `esAdmin()` (¿es admin de cualquier nivel? — usar SIEMPRE en vez de comparar contra "admin" literal, ver BUG-011), `esDirector()` (Regional/Nacional, los que asignan VIP/pool), etiquetas legibles (`ETIQUETA_ROL`, `ETIQUETA_ROL_CORTA`), cargo con pool (`etiquetaCargo`/`etiquetaCargoCorta` → "Pool de transporte" si `es_pool`), qué roles puede crear cada admin y qué territorio asigna |
| `frontend/src/contexts/AuthContext.jsx` | Estado global del usuario (login, logout, actualizar) |

---

## 7. Endpoints del backend

Todos los endpoints están agrupados por entidad en `backend/src/routes/`:

| Archivo | Endpoints |
|---|---|
| `auth.routes.js` | Login, cambio de contraseña, perfil propio (`/auth/mi-perfil`) |
| `usuarios.routes.js` | CRUD de usuarios + cambiar cédula/correo + perfil detalle (`/:id/perfil-detalle`) |
| `vehiculos.routes.js` | CRUD de vehículos + fotos + RUNT |
| `geo.routes.js` | Regiones, departamentos, ciudades, sedes (todos filtrados por el scope del admin; soportan `?region_id=`, `?departamento_id=`, `?ciudad_id=`) |
| `chequeos.routes.js` | Catálogo + flujo del chequeo + vista admin + abandonar (`/:id/abandonar`) |
| `dashboard.routes.js` | KPIs y alertas del dashboard (`/dashboard/stats`) |
| `notificaciones.routes.js` | Listar, contar no leídas, marcar leída(s) |

La lógica de cada uno está en `backend/src/controllers/` y `backend/src/services/`.

### Disparadores de notificaciones (Fase 4 Bloque C)

Las notificaciones al admin se crean automáticamente desde el helper `crearNotificacion()` en `backend/src/services/notificaciones.service.js`. Se invoca en:
- `chequeos.controller.js` → al cerrar un chequeo (cualquier resultado), al bloquear un intento (aptitud / vehículo / licencia vencida) y al abandonar un chequeo.
- `auth.controller.js` → al iniciar sesión un conductor con licencia vencida (máx 5/día con `dedupeHoras` + `maxPorVentana`).

### Roles multinivel y scope territorial (Fase 4, #102)

La jerarquía administrativa (cuatro niveles: **superadmin = Administrador general → admin_departamental = Director Regional → admin_sede = Coordinador de sede → conductor**) se apoya en dos servicios:

| Archivo | Responsabilidad |
|---|---|
| `backend/src/services/scope.service.js` | **Scope territorial**: qué sedes ve un admin (`obtenerScope`), aplicar el filtro a una consulta (`aplicarScope`), y ubicar a otros usuarios dentro del área (`usuarioEnScope`, `puedeAccederSede`). |
| `backend/src/services/jerarquia.service.js` | **Jerarquía de rango**: quién puede crear (`puedeCrearRol`, #111) y gestionar (`puedeGestionarRol`, #112) a quién. |
| `frontend/src/lib/roles.js` | Espejo de la jerarquía para la UI (qué roles ofrecer y qué territorio pedir al crear un usuario). |

Para crear o gestionar a un usuario se exigen **ambas** condiciones: que esté dentro del *scope* del admin **y** que su rango sea estrictamente inferior. El filtro de scope se aplica en `dashboard.controller.js`, `vehiculos.controller.js`, `chequeos.service.js`, `usuarios.controller.js` y `geo.routes.js`.

Reglas especiales:
- **Cambio de rol en edición** (`actualizarUsuario`): permitido solo a rangos inferiores, con territorio del nivel nuevo validado dentro del scope; **nadie puede cambiar su propio rol**.
- **Excepción de continuidad**: el superadmin puede **nombrar** otros superadmins (`puedeCrearRol`), pero nunca eliminarlos/editarlos (`puedeGestionarRol` los protege).
- **Cascada de territorio al crear** (usuarios y vehículos): el territorio se hereda/acota según quién crea (Coordinador → su sede automática; Director Regional → sede de su depto; Administrador general → departamento → sede). Misma lógica en `ModalCrearUsuario.jsx` y `ModalVehiculo.jsx` (pendiente extraer a un `<SelectorSede>` compartido). `crearVehiculo` resuelve la sede con `req.usuario.sede_id || req.body.sede_id` + `puedeAccederSede`.
- **Gestión de geografía** (`geo.routes.js` escritura): el Administrador general opera en todo el país; el Director Regional **solo en su departamento** (validado por scope en cada endpoint).
- La geografía base se siembra con `database/seeds/06_geografia_capitales.sql` (33 capitales + Espinal y 5 sedes de muestra); luego se administra desde la página de Gestión de geografía.

> El alias histórico `admin` (anterior al multinivel) se trata como `admin_sede` si tiene sede; si no tiene sede, conserva visibilidad global para no romper cuentas previas.

---

## 8. Documentación adicional

| Archivo | Para qué sirve |
|---|---|
| `docs/CONTEXTO_PROYECTO.md` | Toda la información de dominio: roles, reglas de negocio, decisiones tomadas |
| `docs/MANUAL_DE_USO.md` | Manual de usuario final (se entrega al cliente) |
| `docs/MAPA_DEL_CODIGO.md` | **Este archivo** — guía rápida para desarrolladores nuevos |
