-- ==
-- Seed: 5 preguntas de aptitud del conductor
-- ==
-- Orden de ejecución: 03 (independiente de las anteriores)
-- Idempotente: borra las preguntas anteriores y vuelve a insertar
--
-- Fuente: Paso 2 del flujo del conductor
-- ==

DELETE FROM preguntas_aptitud;

INSERT INTO preguntas_aptitud (pregunta, respuesta_apta, orden) VALUES
    ('¿Descansó lo suficiente (mínimo 6–8 horas de sueño)?',                                       'si', 1),
    ('¿Se siente bajo el efecto de algún medicamento que cause somnolencia?',                       'no', 2),
    ('¿Presenta mareo, visión borrosa o dolor de cabeza intenso?',                                  'no', 3),
    ('¿Ha consumido bebidas alcohólicas o sustancias psicoactivas en las últimas 24 horas?',        'no', 4),
    ('¿Se siente emocionalmente apto para conducir hoy?',                                           'si', 5);
