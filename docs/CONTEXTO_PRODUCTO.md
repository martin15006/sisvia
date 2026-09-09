# SISVIA — contexto del producto

Este documento explica **qué es SISVIA, a quién le sirve y qué falta** para poder venderlo. Es el documento que hay que leer primero al retomar el proyecto.

---

## 1. Origen

SISVIA nace de un sistema de gestión de flota construido a la medida para una institución. Esta copia se separó de ese origen para convertirse en un **producto propio y neutro**, vendible a cualquier organización con vehículos.

Lo que se hizo al separarlo:

- Se eliminó toda la marca, los logos y el vocabulario de la institución original.
- El lugar donde vive un vehículo pasó a llamarse **sede**, que es lo que entiende cualquier empresa (antes usaba el vocabulario interno de la institución).
- Los cargos pasaron a nombres genéricos: Administrador general, Director regional, Coordinador de sede, Conductor.
- La identidad (nombre, logo, colores) quedó **centralizada** para poder cambiarla sin tocar componentes.
- El nombre de la organización cliente pasó a ser una **variable de entorno**, para que el mismo código sirva a varios clientes.

---

## 2. A quién le sirve

Cualquier organización que tenga vehículos y necesite demostrar que los revisa antes de usarlos:

- Empresas de transporte de carga o pasajeros.
- Empresas con flota propia de reparto o servicio técnico.
- Constructoras y agroindustria (maquinaria amarilla, camionetas, volquetas).
- Entidades públicas y contratistas obligados a llevar el chequeo preoperacional.
- Empresas de domicilios con motos.

El chequeo preoperacional es una **obligación legal** en varios de estos sectores, y hoy casi siempre se hace en papel. Ese es el punto de entrada comercial.

---

## 3. Qué hace hoy

**Para el conductor (celular):**

- Inicia sesión, elige el vehículo que va a operar.
- Responde un chequeo de aptitud personal (¿durmió bien? ¿tomó medicamentos?).
- Recorre la lista de ítems del vehículo (frenos, luces, llantas, niveles, documentos) y marca el estado.
- Toma fotos de lo que está mal.
- Recibe un resultado: si el vehículo está apto o no para salir.
- El sistema le bloquea la operación si su licencia está vencida o el vehículo está en estado crítico.

**Para el responsable (escritorio):**

- Panel con el estado de todos sus vehículos.
- Alerta inmediata cuando un chequeo detecta una falla grave.
- Gestión de vehículos, conductores y sedes.
- Aviso automático de vencimientos (SOAT, revisión técnico-mecánica, extintor, licencia).
- Historial completo y exportación de reportes a PDF y Word.
- Campanita de notificaciones en tiempo real.

**Transversal:**

- Cuatro niveles de permisos con alcance territorial real.
- Tema claro y oscuro.
- Suplencia: un conductor del pool puede cubrir temporalmente al coordinador de una sede.
- Catálogo de ítems y preguntas **editable desde la interfaz**, sin tocar código. Cada cliente puede armar su propio chequeo.

---

## 4. Qué falta para venderlo

| Frente | Qué falta |
|---|---|
| **Identidad** | Logo definitivo, paleta propia y dirección de diseño. Lo actual es un marcador de posición funcional pero provisional. |
| **Infraestructura** | Proyecto de Supabase propio, cuenta de Cloudinary propia, correo de envío propio. |
| **Multi-cliente** | Hoy el nombre de la organización es una variable de entorno: sirve para un cliente por despliegue. Para varios clientes en un solo despliegue hace falta un modelo de organizaciones dentro de la base de datos. |
| **Onboarding** | No hay un flujo para que un cliente nuevo se registre y cargue sus sedes y vehículos por su cuenta. Hoy hay que sembrar datos a mano. |
| **Precio** | Sin definir. Lo natural en este tipo de producto es cobrar por vehículo activo al mes. |
| **Legal** | Términos de servicio, tratamiento de datos personales (los conductores son personas identificadas) y política de retención de fotos. |
| **Nombre** | SISVIA es un nombre de trabajo. Está centralizado para poder cambiarlo barato. Antes de registrarlo hay que verificar disponibilidad de marca y dominio. |

---

## 5. Decisiones ya tomadas

- **El chequeo es configurable, no fijo.** Categorías, ítems y preguntas de aptitud viven en base de datos y se editan desde la interfaz. Es lo que permite que el mismo producto sirva a una empresa de camiones y a una de motos.
- **El historial no se borra.** El chequeo preoperacional es prueba de debida diligencia: si hay un accidente, hay que poder mostrar quién condujo, qué reportó y qué fotos tomó. Sin historial no hay defensa ante una auditoría o una reclamación.
- **Las fotos se conservan 12 meses** y luego se borran solas, salvo las marcadas como "preservar siempre".
- **El bloqueo por licencia vencida o vehículo crítico es duro**, no una advertencia. Es el valor real del producto: impedir que salga un vehículo que no debe salir.

---

## 6. Riesgos conocidos

- **La base de datos exige RLS activo.** El proyecto original tuvo un incidente por tener Row Level Security desactivado con la llave anónima expuesta en el bundle. Al montar el Supabase nuevo, activar RLS en **todas** las tablas antes de exponer nada.
- **Las credenciales de este repositorio están vacías a propósito.** No reutilizar las de ningún otro proyecto.
- **El nombre SISVIA no está verificado como marca.** Verificar antes de invertir en identidad visual.
