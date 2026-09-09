# Diseño — Pool de transporte / Conductores VIP

> Documento de DISEÑO (vivo). Se va completando a medida que decidimos. Cuando se
> implementa, el detalle técnico pasa a `semana-N-cambios.md` y la decisión a
> `CONTEXTO_PROYECTO.md`. Estado: **TODO IMPLEMENTADO y verificado (14/15-jun).** Paso 1
> (VIP) + Paso 2 (suplencia) + Fase A (suplir otra sede) + Fase B (toda la regional con
> selector) + seguridad + redes de protección + barra de sede visible. Detalle en
> `semana-5-cambios.md`. (Pendiente operativo: correr `2026-06-15_suplencia_alcance.sql`.)

## Qué es (modelo refinado, 13-jun)

El **Pool de transporte** es un **cargo especial**, distinto del conductor normal,
con **dos estados**:

- **Estado base (desactivado):** funciona como conductor de los **vehículos
  especiales** — el vehículo personal del Coordinador de sede y los exclusivos
  de los directores. **NO** maneja la flota normal (esa es de los conductores
  normales). Pool y conductor normal manejan cosas distintas, no se cruzan.
- **Estado activado (suplencia, por un período):** alguien lo "activa" del X al Y;
  mientras está activo, el pool **hereda los permisos del Coordinador de sede** de
  su sede (gestiona flota/conductores/chequeos, panel admin) y **recibe las
  notificaciones** de la sede. Al desactivarse, vuelve al estado base.

## Reglas de manejo (qué vehículos maneja cada uno)

| | Flota normal | Vehículos especiales (`es_vip`) |
|---|---|---|
| Conductor normal | ✅ sí | ❌ no |
| Pool de transporte | ❌ no | ✅ sí |

Vehículo especial (`es_vip`) = personal del Coordinador o exclusivo de un director.

## Auditoría (pedido por Martín 13-jun)

El **Coordinador de sede debe tener un registro de lo que hizo el pool** — tanto
sus chequeos sobre los vehículos especiales como, sobre todo, **lo que hizo
mientras lo reemplazaba** (creó/editó vehículos o conductores, cerró chequeos,
etc.). Así, al volver, el Coordinador se entera de todo lo que pasó en su ausencia.
Se apoya en las tablas de auditoría que YA existen (`auditoria_usuarios`,
`auditoria_vehiculo`, y el `conductor_id` de los chequeos), filtrando por el pool
como actor. Faltaría una **vista "Actividad del pool"** para el Coordinador.

## Quién asigna / activa
- **El cargo Pool** (marcar a un conductor como del pool): lo asignan los
  **Directores** (Regional/Nacional). [decidido 13-jun]
- **Marcar un vehículo como especial (`es_vip`):** los Directores. (Abierto: ¿el
  Coordinador puede marcar su propio vehículo personal?)
- **Activar la suplencia (estado activado):** el Coordinador titular y/o el
  Director Regional. (Ver preguntas abiertas.)

## Implementación — propuesta en 2 pasos

### Paso 1 — Cargo pool + vehículos especiales  ✅ *(implementado 13-jun)*
- [x] BD: `vehiculos.es_vip` y `usuarios.es_pool` (BOOLEAN default false) + índice
      `idx_vehiculos_es_vip`. Se eligió el **flag `es_pool`** (no un valor de enum):
      el pool es funcionalmente un cargo sin agregar un valor permanente al enum
      `rol_usuario` (que en Postgres no se puede quitar). Migración
      `database/migrations/2026-06-13_pool_vip.sql` + `database.sql`. **(Martín corre la migración en Supabase.)**
- [x] Backend: `crear/actualizarVehiculo` aceptan `es_vip` y `crear/actualizarUsuario`
      aceptan `es_pool`, ambos **solo si el actor es Director** (`superadmin` /
      `admin_departamental`); `es_pool` además solo si el rol es `conductor`.
- [x] Backend: `chequeos.service` (`obtenerVehiculosDisponibles` y
      `verificarVehiculoParaChequeo`) aplica la matriz de manejo
      (pool → solo `es_vip`; normal → solo no-`es_vip`), leyendo `req.usuario.es_pool`.
- [x] Frontend: casilla en `ModalVehiculo` ("Vehículo especial / de dirección"), casilla
      "Pool de transporte" en `ModalCrearUsuario`/`ModalEditarUsuario` (solo Directores,
      solo cuando el cargo es Conductor), cargo "Pool" en la tabla de usuarios
      (`etiquetaCargoCorta`) y badge ⭐ VIP en las tarjetas de vehículos. Todas las
      casillas/badges solo aparecen para quien corresponde.
- [x] Docs (este checklist + `semana-5-cambios.md` + `CONTEXTO_PROYECTO.md`).

> **Pendiente operativo:** correr la migración en Supabase para que las casillas y el
> filtro de manejo tengan efecto real (las columnas no existen hasta entonces).

### Paso 2 — Suplencia (estado activado)  *(código completo 14-jun; pendiente migración + verificación)*

> Diseño en `docs/superpowers/specs/2026-06-14-suplencia-pool-design.md`; plan en
> `docs/superpowers/plans/2026-06-14-suplencia-pool.md`. Implementado en 11 commits
> (`0d4304a`…`bc2dd0c`). **Pendiente:** correr `database/migrations/2026-06-15_suplencias.sql`
> en Supabase y la verificación end-to-end (Fase C del plan). El push lo hace Martín.

- [x] BD: tabla `suplencias` (pool, sede, activada_por, desde/hasta, activa, historial)
      + índices. Migración `2026-06-15_suplencias.sql`.
- [x] Backend: helper `rolEfectivo` — un pool con suplencia vigente se trata como
      `admin_sede` de su sede (scope + guards + jerarquía reusan todo el stack admin);
      la faceta conductor (chequeos/VIP) queda intacta. Notificaciones de la sede también
      llegan al suplente. Endpoints activar/desactivar/listar/actividad del pool.
- [x] Frontend: modal "Activar/Finalizar suplencia" + acción en Gestión de usuarios;
      la UI admin (ProtectedRoute/Sidebar) acepta al suplente por rol efectivo; banner
      para el pool en su dashboard con acceso al panel.
- [x] Vista "Actividad del pool" (audits del pool) para el Coordinador/Director.

**Decisiones (14-jun):** activan titular + Director Regional (+ Nacional); modelo
concurrente (el titular conserva acceso); fecha fin opcional (con fecha auto-vence, sin
fecha hasta desactivar a mano); alcance `admin_sede` completo, acotado por las reglas
que ya existen (VIP/pool Director-only, #112 protege al titular, #111).

## Preguntas abiertas
- [x] ¿El cargo pool es un **valor de enum nuevo** (`rol='pool'`) o un **flag
      `es_pool`**? → **Resuelto (13-jun): flag `es_pool`** sobre un conductor, mostrado
      como cargo "Pool de transporte". Mismo resultado visual, sin tocar el enum.
- [ ] Durante la suplencia, ¿el Coordinador titular conserva acceso o queda solo el pool?
- [ ] ¿Quién activa la suplencia: el Coordinador, el Director Regional, o ambos?
- [ ] ¿La activación tiene fecha fin obligatoria o puede ser "hasta que la quiten"?
- [ ] ¿El Coordinador puede marcar `es_vip` su propio vehículo personal, o solo los Directores?

## Mejoras pendientes del Pool (post Fase B)
- [ ] **Mostrar en grande / lugar bien visible** qué sede (o sector, si cubre varios)
      está suplantando el pool — en su dashboard y/o header. (Pedido por Martín; hacerlo
      cuando esté lista toda la suplencia multi-sede.)
