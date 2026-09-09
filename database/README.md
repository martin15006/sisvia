# Carpeta `database/` — Esquema y datos iniciales

SQL completo de SISVIA: estructura de tablas y datos semilla para levantar la base desde cero.

## La forma rápida: un solo archivo

```
database/INSTALAR_TODO.sql   ← esquema + los 6 seeds + verificación, todo junto
```

1. Supabase → **SQL Editor** → **New query**.
2. Pegar **todo** `INSTALAR_TODO.sql`.
3. **Run**.
4. Al final devuelve una tabla de conteos para confirmar que todo entró.

Las 12 migraciones de `migrations/` **ya están incluidas** en el esquema. No hay que correr ninguna aparte.

> [!] Después de instalar no hay usuarios. El último bloque del archivo explica cómo crear tu primer administrador (dos pasos: crearlo en Supabase Auth y luego un `INSERT`).

## Estructura de la carpeta

```
database/
├── README.md                          ← este archivo
├── INSTALAR_TODO.sql                  ← TODO junto, para pegar y correr
├── database.sql                       ← solo el esquema: 22 tablas + triggers + índices + RLS
├── migrations/                        ← historial de cambios (ya aplicados en database.sql)
└── seeds/
    ├── 01_categorias_chequeo.sql      ← las 5 categorías del checklist
    ├── 02_items_chequeo.sql           ← los 39 ítems normativos
    ├── 03_preguntas_aptitud.sql       ← las 5 preguntas del conductor
    ├── 04_regiones.sql                ← las 5 regiones naturales de Colombia
    ├── 05_departamentos.sql           ← los 32 departamentos asignados a regiones
    └── 06_geografia_capitales.sql     ← 34 ciudades + 5 sedes de muestra
```

## La forma manual (archivo por archivo)

Útil cuando se quiere correr solo una parte.

```bash
psql "postgresql://..." -f database.sql
psql "postgresql://..." -f seeds/01_categorias_chequeo.sql
psql "postgresql://..." -f seeds/02_items_chequeo.sql
psql "postgresql://..." -f seeds/03_preguntas_aptitud.sql
psql "postgresql://..." -f seeds/04_regiones.sql
psql "postgresql://..." -f seeds/05_departamentos.sql
psql "postgresql://..." -f seeds/06_geografia_capitales.sql
```

## Las 22 tablas

| Bloque | Tablas |
|---|---|
| Geografía | `regiones`, `departamentos`, `ciudades`, `sedes` |
| Usuarios | `usuarios`, `auditoria_usuarios`, `suplencias`, `intentos_login` |
| Vehículos | `vehiculos`, `fotos_vehiculo`, `auditoria_vehiculos` |
| Catálogo del chequeo | `categorias_chequeo`, `items_chequeo`, `preguntas_aptitud`, `excepciones_items_vehiculo` |
| Chequeos | `chequeos_preoperacionales`, `respuestas_chequeo`, `respuestas_aptitud`, `fotos_chequeo` |
| Registro | `intentos_chequeo_bloqueado`, `auditoria_chequeos`, `notificaciones` |

## Row Level Security

**RLS queda ACTIVO en las 22 tablas y SIN políticas. Es a propósito.**

La llave anónima de Supabase viaja en el bundle público del frontend. Con RLS apagado, cualquiera podía leer y escribir la base por la API REST saltándose el backend — eso fue un hallazgo **crítico** en el proyecto de origen. Con RLS activo y sin políticas, el rol `anon` queda denegado por defecto.

El backend usa `service_role`, que se salta RLS: sus consultas no cambian. El Realtime anónimo de notificaciones cae al polling de respaldo.

> [!] Si agregas una tabla nueva, acuérdate de activarle RLS también.

## Re-ejecución

Casi todo es idempotente: los `CREATE TABLE` usan `IF NOT EXISTS` y los seeds usan `ON CONFLICT DO NOTHING` o un `DELETE` previo.

**La excepción importante:** los seeds 02 y 03 borran y vuelven a insertar el catálogo. Si ya hay chequeos hechos, ese `DELETE` **falla** contra la llave foránea de `respuestas_chequeo`. Eso protege el historial, pero corta el script ahí. Con datos vivos, ajustar el catálogo a mano o desde la pantalla de Catálogo del admin.

## Requisitos

- **PostgreSQL 15+** (usa `gen_random_uuid()` nativo). No necesita extensiones.
- **Schema `auth` de Supabase** debe existir: `usuarios.id` referencia `auth.users(id)`. Fuera de Supabase hay que ajustar o quitar esa FK.
- Permisos para crear tablas, funciones, triggers e índices en `public`.

## Convenciones

- **Nombres:** snake_case en español.
- **Llaves primarias:** UUID con `gen_random_uuid()` para entidades de negocio; SERIAL para catálogos pequeños.
- **Fechas:** siempre `TIMESTAMPTZ`.
- **Borrado suave:** `activo BOOLEAN DEFAULT true` en vez de borrar registros importantes.
- **Auditoría:** `created_at` y `updated_at` en tablas que se editan.
- **CASCADE** solo en "hijo muere con el padre" (`fotos_vehiculo` con el vehículo).
- **SET NULL** en auditoría (`accion_por_id`).
- **RESTRICT** donde protege integridad (`vehiculos.sede_id`, `chequeos.vehiculo_id`).

## Mantenimiento

Al agregar o cambiar tablas:

1. Actualizar `database.sql` en la sección que corresponda.
2. Dejar el cambio también en `migrations/` con la fecha, para tener el historial.
3. Si es un catálogo nuevo, agregar su seed con el número siguiente.
4. **Regenerar `INSTALAR_TODO.sql`**, que es la concatenación de `database.sql` + los seeds.
5. Activarle RLS a la tabla nueva.
6. Actualizar este README si cambia la lista de tablas o el orden.
