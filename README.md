# SISVIA · Control de vehículos

Sistema web para el **chequeo preoperacional** de vehículos: el conductor revisa el vehículo desde el celular antes de salir, el sistema detecta las fallas, calcula el estado del vehículo y avisa al responsable. Además lleva el control de vencimientos (SOAT, revisión técnico-mecánica, extintor, licencia de conducción) y avisa antes de que se venzan.

Sirve para cualquier parque automotor —carros, camiones, buses, motos o maquinaria— y para organizaciones con **varias sedes**: cada quien ve solo lo suyo.

---

## Qué resuelve

| Problema | Qué hace SISVIA |
|---|---|
| El chequeo preoperacional se hace en papel y se pierde | Chequeo digital desde el celular, con fotos, guardado y consultable |
| Nadie se entera de una falla hasta que el vehículo queda varado | Alerta inmediata al responsable de la sede cuando el chequeo detecta algo grave |
| Los documentos se vencen sin que nadie lo note | Aviso automático por correo y campanita antes del vencimiento |
| No hay evidencia si pasa un accidente | Historial completo: quién condujo, qué reportó, qué fotos tomó, qué día |
| Una organización con varias sedes no puede separar la información | Alcance por sede / regional / general, con roles y permisos reales |

---

## Estado

Producto en desarrollo. La base funcional está construida (chequeos, vehículos, usuarios, roles multinivel, notificaciones, exportación a PDF/Word, tema claro/oscuro). Falta el trabajo de producto: identidad visual definitiva, base de datos propia, precios y despliegue comercial.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + React Router 7 + CSS modular |
| Backend | Node.js + Express 5 + Multer |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth + JWT |
| Imágenes | Cloudinary |
| Tiempo real | Supabase Realtime |
| Correo | Nodemailer |
| Documentos | @react-pdf/renderer (PDF) y docx (Word) |

---

## Estructura

```
sisvia/
├── backend/                  → API REST (Node.js + Express)
│   └── src/
│       ├── config/           → Supabase, Cloudinary, correo y MARCA
│       ├── routes/           → Endpoints
│       ├── controllers/      → Reciben la petición y responden
│       ├── services/         → Lógica de negocio y generación de PDF/Word
│       ├── middlewares/      → Autenticación y permisos
│       └── jobs/             → Tareas programadas (aviso de vencimientos)
├── frontend/                 → Aplicación React
│   ├── public/               → logo.png y archivos estáticos
│   └── src/
│       ├── pages/            → Una carpeta por pantalla (.jsx + .css)
│       ├── components/       → Piezas reutilizables
│       ├── lib/              → Cliente de API, MARCA, tema, roles
│       ├── hooks/            → Hooks propios
│       └── styles/           → variables.css (todos los tokens de diseño)
├── database/                 → Esquema SQL, migraciones y datos semilla
└── docs/                     → Manual de uso, mapa del código y diseño
```

---

## Puesta en marcha

Requiere Node.js 20 o superior y una cuenta de Supabase.

**1. Base de datos.** Crear un proyecto en Supabase y ejecutar, en el editor SQL y en este orden:

```bash
database/database.sql
database/seeds/01_categorias_chequeo.sql
database/seeds/02_items_chequeo.sql
database/seeds/03_preguntas_aptitud.sql
database/seeds/04_regiones.sql
database/seeds/05_departamentos.sql
database/seeds/06_geografia_capitales.sql
```

Después aplicar las migraciones de `database/migrations/` por fecha.

**2. Variables de entorno.** Copiar los ejemplos y rellenarlos con credenciales propias:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**3. Backend:**

```bash
cd backend && npm install && npm run dev
```

**4. Frontend** (en otra terminal):

```bash
cd frontend && npm install && npm run dev
```

La aplicación queda en `http://localhost:5173` y la API en `http://localhost:3001`.

---

## Personalizar la marca

Todo el branding está centralizado. Para renombrar el producto no hay que tocar componentes:

| Qué | Dónde |
|---|---|
| Nombre, lema y logo del producto | `frontend/src/lib/marca.js` y `backend/src/config/marca.js` |
| Nombre de la organización cliente | `ORG_NOMBRE` y `VITE_ORG_NOMBRE` en los `.env` |
| Colores, tipografía y espacios | `frontend/src/styles/variables.css` |
| Imagen del logo | `frontend/public/logo.png` y `backend/src/services/export/assets/logo.png` |

---

## Roles

| Rol | Alcance | Qué ve |
|---|---|---|
| Administrador general | Toda la organización | Todo |
| Director regional | Su departamento | Las sedes de su departamento |
| Coordinador de sede | Su sede | Los vehículos, conductores y chequeos de su sede |
| Conductor | Sus propios chequeos | Los vehículos que puede operar |

---

## Documentación

| Archivo | Para qué |
|---|---|
| `docs/MANUAL_DE_USO.md` | Manual del usuario final, pantalla por pantalla |
| `docs/MAPA_DEL_CODIGO.md` | Dónde tocar cada cosa dentro del código |
| `docs/CONTEXTO_PRODUCTO.md` | Qué es el producto, a quién le sirve y qué falta |
| `docs/diseno-pool-vip.md` | Diseño del pool de conductores y la suplencia |
