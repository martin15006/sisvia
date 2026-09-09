-- 2026-06-20_login_intentos.sql
-- Bloqueo de inicio de sesion por intentos fallidos (proteccion anti fuerza bruta).
-- Tras 5 contraseñas fallidas SEGUIDAS para una misma cuenta, el login de esa
-- cuenta se bloquea durante 15 minutos. El contador se reinicia al entrar bien.
-- Solo el backend (service_role key) lee/escribe esta tabla; el front nunca la toca.

create table if not exists intentos_login (
    email           text        primary key,
    intentos        integer     not null default 0,
    bloqueado_hasta timestamptz,
    actualizado_en  timestamptz not null default now()
);

-- Regla del proyecto: las tablas nuevas van SIN Row Level Security
-- (el backend usa la service_role key, que de todos modos la salta).
alter table intentos_login disable row level security;
