-- ==
-- Seed: 5 categorías del checklist preoperacional
-- ==
-- Orden de ejecución: 01 (antes de items y preguntas)
-- Idempotente: usa ON CONFLICT para no duplicar

INSERT INTO categorias_chequeo (nombre, descripcion, icono, orden) VALUES
    ('NIVELES',        'Fluidos del vehículo',                      '💧', 1),
    ('PEDALES',        'Acelerador, embrague y freno',              '🦶', 2),
    ('LUCES',          'Sistema de iluminación completo',           '💡', 3),
    ('SEGURIDAD VIAL', 'Kit de carretera obligatorio',              '🛟', 4),
    ('VARIOS',         'Estado mecánico y accesorios del vehículo', '🚛', 5)
ON CONFLICT (nombre) DO NOTHING;
