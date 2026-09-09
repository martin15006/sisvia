# Desplegar SISVIA

Frontend en **Cloudflare Pages** (gratis), backend en **Railway** (~5 USD/mes), base en **Supabase** (ya montada).

> [!] El orden importa. El backend necesita saber la URL del frontend (CORS) y el frontend necesita saber la URL del backend (`VITE_API_URL`). Es circular: se rompe desplegando el backend primero y volviendo al final a completarle el CORS.

---

## Paso 0 · GitHub

Las dos plataformas despliegan desde un repositorio Git. Sin esto no arranca nada.

1. Crear un repositorio **privado** en GitHub (por ejemplo `sisvia`).
2. Conectarlo y subir la rama `main`.

El repositorio ya tiene `.gitignore` configurado: los `.env` **no** se suben. Las credenciales se cargan como variables de entorno en cada plataforma.

---

## Paso 1 · Backend en Railway

1. **New Project → Deploy from GitHub repo** y elegir el repositorio.
2. **Root Directory:** `backend`
3. **Start Command:** `npm start`
4. En **Variables**, cargar:

```
NODE_ENV=production
CORS_ORIGIN=https://TEMPORAL.pages.dev
ORG_NOMBRE=El nombre de la empresa cliente
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CRON_VENCIMIENTOS=0 7 * * *
```

`CORS_ORIGIN` queda provisional: se corrige en el Paso 3.

**No cargar `PORT`.** Railway lo inyecta solo y el código ya lo lee (`process.env.PORT`).

5. Generar el dominio público (**Settings → Networking → Generate Domain**). Anotar la URL: `https://algo.up.railway.app`.
6. Comprobar que responde:

```bash
curl https://TU-BACKEND.up.railway.app/api/hello
```

Debe devolver un JSON con un saludo. Si falla, revisar los *Deploy Logs*.

> [!] Railway **no** puede quedar en plan gratuito con suspensión: el aviso diario de vencimientos es un cron dentro del proceso. Si el servicio se duerme, el cron no corre.

---

## Paso 2 · Frontend en Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** y elegir el mismo repositorio.
2. Configuración de build:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Variables de entorno (para *Production*):

```
VITE_API_URL=https://TU-BACKEND.up.railway.app/api
VITE_ORG_NOMBRE=El nombre de la empresa cliente
```

> [!] `VITE_API_URL` termina en **`/api`**. El cliente arma las rutas encima de ese valor; sin el `/api` todas las peticiones dan 404.

4. Desplegar y anotar la URL: `https://sisvia.pages.dev`.

Las variables de Vite se leen **en el build**, no en tiempo de ejecución: si cambiás una, hay que volver a desplegar.

---

## Paso 3 · Cerrar el círculo del CORS

Volver a Railway y poner el valor definitivo:

```
CORS_ORIGIN=https://sisvia.pages.dev
```

Redesplegar el backend. En producción el código compara el origen **literalmente**: sin barra final y con `https://`. Si no coincide exacto, el navegador bloquea todo y en la consola sale un error de CORS.

---

## Paso 4 · Comprobar que quedó vivo

1. Abrir la URL de Cloudflare → debe cargar el login.
2. Iniciar sesión con el usuario administrador.
3. Abrir las herramientas del navegador (F12) → pestaña **Red**: las peticiones deben ir al dominio de Railway y responder 200.
4. Entrar a *Gestión de geografía* → deben aparecer las sedes y ciudades.

---

## Qué NO queda funcionando todavía

| Cosa | Por qué | Cómo se arregla |
|---|---|---|
| Correo de avisos | `GMAIL_USER` y `GMAIL_APP_PASSWORD` vacíos | Cargar una contraseña de aplicación de Gmail, o un servicio SMTP |
| Notificaciones en vivo | RLS activo sin políticas: el rol anónimo no lee nada | La campanita funciona igual con sondeo cada 60 s |
| Datos | La base está vacía | Crear sedes, vehículos y conductores desde el panel |

---

## Costos

| Servicio | Plan | Costo |
|---|---|---|
| Cloudflare Pages | Gratis | 0 |
| Railway | Always-on por el cron | ~5 USD/mes |
| Supabase | Gratis | 0 hasta 500 MB |
| Cloudinary | Gratis | 0 hasta 25 créditos |

---

## Antes de mostrárselo a un cliente

- [ ] Elegir la dirección de diseño y aplicarla (hoy está la paleta provisional)
- [ ] Cargar datos reales o de demostración: sedes, vehículos y al menos un conductor
- [ ] Configurar el correo de avisos
- [ ] Dominio propio en vez de `.pages.dev`
- [ ] Revisar `ORG_NOMBRE` en las dos plataformas
