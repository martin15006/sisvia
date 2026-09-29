# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Empresas con vehículos** (flotas de carga, transporte o servicio) en Colombia, que se suscriben a SISVIA. Adentro de cada empresa trabajan:
  - el **conductor**, que hace el chequeo desde el celular, a veces de madrugada y al aire libre;
  - el **Coordinador de sede** y el **Director Regional**, que ven qué vehículos pueden salir y reciben los avisos;
  - el **Administrador de empresa**, que arma sus sedes, su gente, sus vehículos y su catálogo.
- **El equipo SISVIA** (Administrador general), que da de alta las empresas, les da soporte y entra a cada una con verificación y registro.
- **Quien llega a la página pública**: alguien de una empresa (dueño, gerente o coordinador; no hay un perfil fijo) que quiere saber si SISVIA le sirve y hablar con el equipo.

## Product Purpose

SISVIA hace el chequeo preoperacional y el control de los vehículos de una empresa. El objetivo es que ningún vehículo salga a la vía sin haber sido revisado, y que cada revisión quede como evidencia. El éxito es una empresa que sabe, cada mañana, qué vehículos pueden salir y cuáles no, sin perseguir papeles.

**Modelo:** suscripción. Una empresa no compra con un botón: primero se comunica con el equipo SISVIA (por WhatsApp, por correo o dejando una solicitud con sus datos básicos) y se reserva una cita; después se activa su cuenta con su plan (límite de sedes y de vehículos).

## Positioning

**Un vehículo con fallas no sale.** El chequeo no es un formulario para archivar: si el vehículo está en estado crítico o no operativo, o tiene el SOAT, la técnico-mecánica o el extintor vencidos, el preoperacional no se puede iniciar. Si la licencia del conductor está vencida, tampoco. Cada intento bloqueado queda registrado y avisado, y cada chequeo queda en PDF y Word como prueba.

## Operating Context

- El conductor responde primero la **aptitud** (preguntas sobre su estado), después el **checklist** por categorías. Un "No cumple" exige observación y permite foto.
- Con las respuestas, el vehículo queda en uno de cinco estados: operativo, observación, alerta, crítico o no operativo. Verde es que puede salir; rojo, que no.
- El panel muestra qué vehículos **no pueden salir** y por qué.
- Los vencimientos (SOAT, técnico-mecánica, extintor y licencia) se avisan desde 30 días antes, por la campanita y por correo.
- Todo pasa en la app web (celular del conductor, computador del coordinador). No hay app nativa.

## Capabilities and Constraints

**Lo que SISVIA hace hoy** (verificado en el código, 2026-09-27):

- Chequeo preoperacional y postoperacional desde el celular: aptitud, checklist por categorías y tipo de vehículo, observación obligatoria y foto en "No cumple".
- Bloqueo de la salida (solo el preoperacional): estado crítico o no operativo; SOAT, técnico-mecánica o extintor vencidos; licencia del conductor vencida. Los intentos bloqueados quedan registrados.
- Falla crítica: aviso inmediato por correo a los responsables de la sede.
- Estados del vehículo, panel de la flota y lista de "no pueden salir".
- Avisos de vencimientos 30 días antes (campanita y correo diario).
- PDF y Word de cada chequeo y hoja de vida del vehículo.
- Varias empresas en una sola app, cada una ve solo lo suyo. Cada empresa tiene su plan (límite de sedes y vehículos), sus sedes en cualquier municipio de Colombia y sus cargos: Administrador de empresa, Director Regional, Coordinador de sede y Conductor. Hay conductores de pool con suplencias.
- Catálogo del chequeo: una base común más ítems, categorías y preguntas propios de cada empresa.
- Actividad de la empresa (quién hizo qué) y Soporte dentro de la app ("Escribir a SISVIA", con hilo y estados).
- Informe al superior; tema claro y oscuro.

**Lo que NO hace** (no se promete): citas o agenda de talleres, mantenimientos programados, GPS o rastreo, pagos o facturación dentro de la app, app nativa.

**Por decidir:** dónde vive la página pública (dentro de la app o aparte) y cómo llega la solicitud de contacto.

## Brand Commitments

- El nombre es **SISVIA** (nombre de trabajo; se lee de `marca.js`, nunca escrito a mano). Textos en español de Colombia, con **tuteo**, nunca voseo.
- **Nunca** se menciona al SENA ni a sus centros (cláusula CL-03).
- La identidad visual de la app ya está sellada ("Parte de inspección"; ver `docs/clausulas.md` y `frontend/src/styles/variables.css`). La página pública es de la misma marca.

## Evidence on Hand

- **Hay:** el producto funcionando, que se puede mostrar en una cita o una demo.
- **Contacto:** `sisviacontacto@gmail.com`, WhatsApp +57 316 362 7832 e Ibagué, Tolima. Salen de la propuesta de landing de una compañera; **por confirmar** que son los canales oficiales.
- **No hay** y no se inventa: clientes nombrados, testimonios, cifras de uso, precios publicados, premios (el reconocimiento de la ponencia nombraría al SENA) ni certificaciones.
- **Imágenes:** decisión de Martín (2026-09-27): **sin capturas de la app** por ahora. Los momentos reales del producto se muestran con **animaciones propias**, recreadas.

## Product Principles

1. **Solo la verdad.** Todo lo que se dice, se puede mostrar en una demo hoy. Lo que no existe no se promete, ni como "próximamente".
2. **La pregunta es si puede salir.** Todo gira alrededor de esa respuesta: verde o rojo, con su motivo.
3. **Hecho para el campo.** El conductor usa el celular con una mano, al sol o de madrugada: se lee de un vistazo y se toca fácil.
4. **Primero la conversación.** La suscripción empieza hablando con el equipo, no con un pago.
5. **La evidencia queda.** Cada revisión, cada bloqueo y cada cambio deja un rastro que sirve ante una auditoría.

## Accessibility & Inclusion

- Contraste de texto de al menos 4.5:1 (3:1 si es grande), en tema claro y en oscuro (CL-07).
- Lo que se toca, de al menos 44 × 44 px en las pantallas del conductor (CL-08).
- Toda animación respeta "reducir movimiento".
- Lectores con poca experiencia digital (conductores): frases cortas y palabras de todos los días.
