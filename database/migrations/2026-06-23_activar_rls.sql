-- ============================================================================
--  ACTIVAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS · sisvia · 2026-06-23
-- ============================================================================
--  POR QUÉ (hallazgo CRÍTICO de la auditoría):
--    La "anon key" de Supabase viaja en el bundle PÚBLICO del frontend. Con RLS
--    DESHABILITADO, cualquier persona en internet podía tomar esa clave y
--    leer/escribir la base directamente por la API REST de Supabase, saltándose
--    el backend Express y todos sus controles (login, rol, sede).
--
--  QUÉ HACE ESTO:
--    Activa RLS en todas las tablas. SIN políticas, RLS DENIEGA por defecto al
--    rol `anon` (y `authenticated`). Es decir, la API pública de Supabase deja
--    de devolver datos sin un backend de por medio. El hueco se cierra.
--
--  POR QUÉ NO ROMPE NADA:
--    El backend usa la SERVICE_ROLE key, que tiene BYPASSRLS: IGNORA RLS por
--    completo. Por eso TODAS las consultas del backend siguen EXACTAMENTE igual.
--    El único efecto visible: la suscripción Realtime ANÓNIMA de notificaciones
--    deja de recibir eventos al instante; el frontend ya tiene polling de
--    respaldo cada 60s (useNotificaciones.js) → el contador sigue funcionando,
--    solo se actualiza cada ~1 min en vez de al instante.
--    (Esto reemplaza la decisión vieja de BUG-008: aquella era sobre queries
--    sujetas a RLS; el backend con service_role nunca lo está, y el keepAlive
--    ya mantiene la conexión caliente.)
--
--  CÓMO CORRERLO: Supabase → SQL Editor → pegar TODO → Run.
--  ES REVERSIBLE: al final hay un bloque de ROLLBACK comentado.
-- ============================================================================

ALTER TABLE regiones                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudades                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_vehiculo              ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_vehiculos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_aptitud           ENABLE ROW LEVEL SECURITY;
ALTER TABLE excepciones_items_vehiculo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chequeos_preoperacionales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_aptitud          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_chequeo_bloqueado  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_chequeos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suplencias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_login              ENABLE ROW LEVEL SECURITY;

-- Verificación: TODAS deben salir con rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ----------------------------------------------------------------------------
-- ROLLBACK (SOLO si algo se rompiera): vuelve a desactivar y avísame.
-- ----------------------------------------------------------------------------
-- ALTER TABLE regiones                   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE departamentos              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ciudades                   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sedes          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuarios                   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditoria_usuarios         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehiculos                  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fotos_vehiculo             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditoria_vehiculos        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categorias_chequeo         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE items_chequeo              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE preguntas_aptitud          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE excepciones_items_vehiculo DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE chequeos_preoperacionales  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE respuestas_chequeo         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE respuestas_aptitud         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fotos_chequeo              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE intentos_chequeo_bloqueado DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditoria_chequeos         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notificaciones             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE suplencias                 DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE intentos_login             DISABLE ROW LEVEL SECURITY;
