---
estado: aprobado   # borrador → aprobado. Un borrador no es ley: ningún chat lo aplica todavía.
---

# Cláusulas · SISVIA

> Reglas que no se negocian en este proyecto. Todo pacto se revisa contra ellas.
> Una cláusula aprobada cambia solo con el OK explícito de Martín, anotado en el historial.

| ID | Cláusula | Por qué | Origen |
|---|---|---|---|
| **CL-01** | Claude no corre ningún comando de git que escriba (`add`, `commit`, `push`, `init`, `checkout`, `restore`); lo hace Martín. Claude propone el mensaje de commit. | Cada push a `main` redespliega Cloudflare y Railway: lo que entra al repo sale a producción. | memoria |
| **CL-02** | El nombre del producto se lee de `frontend/src/lib/marca.js` y `backend/src/config/marca.js`; el de la organización cliente, de `VITE_ORG_NOMBRE` y `ORG_NOMBRE`. Nunca escritos a mano en componentes, correos ni documentos. | SISVIA es un nombre de trabajo: renombrarlo tiene que ser cambiar dos constantes. | memoria + código |
| **CL-03** | Ningún texto, logo, color, dato de ejemplo ni documento menciona al SENA o a sus centros de formación. | Es un producto comercial propio, separado de la institución de la que salió. | memoria |
| **CL-04** | Colores, espacios, tamaños y tipografía salen de los tokens de `frontend/src/styles/variables.css`. Ningún color escrito en hex, `rgb()` ni `rgba()` dentro de los `.css` de componentes y páginas. | Un tema repinta toda la app cambiando solo los tokens; un color suelto queda igual en todos los temas y rompe el oscuro. | código (4.364 usos de tokens) + comentario de `variables.css` |
| **CL-05** | Los cinco estados del vehículo (operativo, observación, alerta, crítico, no operativo) usan solo los tokens `--veh-*`. Ningún tema cambia su tono: solo su luminosidad, para seguir legibles. | Verde = puede salir, rojo = no puede salir: es el mensaje del producto, no decoración. Un tema que pinte todo de rojo borra esa señal. | memoria + código |
| **CL-06** | Cada componente y página tiene su `.css` al lado de su `.jsx`. Estilos en línea solo para valores que se calculan al ejecutar (un ancho en %, una proporción). | El estilo se busca en un solo lugar y los temas lo alcanzan. | código (41 de 42 componentes) |
| **CL-07** | Todo texto de la interfaz da un contraste de **≥ 4.5:1**, y **≥ 3:1** si es grande (≥ 24 px, o ≥ 18.66 px en negrita), medido en tema claro y en oscuro. | El conductor lee al aire libre y de madrugada; en oscuro ya hubo textos a 2.0:1 que parecían correctos a ojo. | nueva |
| **CL-08** | En las pantallas del conductor, todo lo que se toca mide al menos **44 × 44 px**. | Se usa con el celular en una mano, apurado y a veces con guantes. | nueva (inferido) |
| **CL-09** | Toda tabla lleva RLS activo. El backend accede con `service_role`; la llave anónima nunca se usa para leer o escribir datos. | La llave anónima viaja en el bundle público: con RLS apagado, cualquiera lee la base por la API. | README de `database/` + memoria |
| **CL-10** | Toda verificación de contraseña usa un cliente de Supabase desechable (`crearClienteAuth()`), nunca el cliente compartido. | `signInWithPassword` deja al cliente compartido con el token del usuario y, con RLS activo, todas las consultas del backend devuelven 0 filas hasta reiniciar. | código + memoria |
| **CL-11** | El backend corre en **Node 22 o superior** (`engines` en `backend/package.json`). | `supabase-js` necesita WebSocket nativo: con Node 20 el backend no arranca en Railway. | código + memoria |
| **CL-12** | Textos de la interfaz, identificadores y comentarios en español; tablas y columnas en `snake_case`. | Todo lo existente ya está así; mezclar idiomas hace que no se encuentre nada. | README de `database/` + código |

## Stack fijo

- Frontend: React 19 + Vite 8 + React Router 7, CSS por componente.
- Backend: Node 22 + Express 5.
- Datos: Supabase (PostgreSQL) con RLS; fotos en Cloudinary.
- Despliegue: Cloudflare Pages (`frontend`, sale en `sisvia.pages.dev`) y Railway (`/backend`, sale en `sisvia.up.railway.app`). Cada push a `main` redespliega los dos.

## Incumplimientos ya presentes en el código

> Se corrigen solo si un pacto toca ese código; si no, quedan como propuesta aparte.

- **CL-04:** 113 colores en hex sueltos en 23 archivos `.css` (el que más tiene: `PerfilUsuario.css`, con 17).
- **CL-06:** 4 estilos en línea fijos: `marginLeft: "auto"` en `ChequeoDetalle.jsx` y `ChequeosAdmin.jsx`, y `display: "none"` dos veces en `ChequeoItems.jsx`.

## Historial

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-09-16 | Primera versión (borrador) | Primer pacto del proyecto: identidad y correcciones |
| 2026-09-16 | Aprobada por Martín, sin cambios | Letra chica del pacto `identidad-y-correcciones` |
