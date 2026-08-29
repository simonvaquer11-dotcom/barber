-- ============================================
-- BARBERÍA CITY — Esquema de base de datos
-- Ejecutar esto en Supabase: Proyecto > SQL Editor > New query > Run
-- ============================================

-- Reservas de turnos
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  servicio text not null check (servicio in ('corte', 'color')),
  barba boolean not null default false,
  fecha date not null,
  hora time not null,
  precio integer not null,
  estado text not null default 'confirmado' check (estado in ('confirmado', 'cancelado')),
  creado_en timestamptz not null default now()
);

-- Esta es la protección real contra doble reserva:
-- solo puede existir UNA reserva "confirmado" por fecha+hora.
-- Si se cancela, el índice deja de contarla y el horario se libera.
create unique index if not exists bookings_unica_activa
  on bookings (fecha, hora)
  where estado = 'confirmado';

-- Configuración semanal de horarios de atención (la define el dueño desde el panel admin)
create table if not exists horarios_config (
  id serial primary key,
  dia_semana integer not null check (dia_semana between 0 and 6), -- 0 = domingo ... 6 = sábado
  hora_inicio time not null,
  hora_fin time not null,
  intervalo_minutos integer not null default 30,
  activo boolean not null default true
);

-- Bloqueos manuales (feriados, turnos médicos, día completo o un horario puntual)
create table if not exists horarios_bloqueados (
  id serial primary key,
  fecha date not null,
  hora time, -- null = bloquea el día completo
  motivo text
);

-- Seguridad: estas tablas solo se acceden desde las funciones serverless
-- con la Service Key, nunca directamente desde el navegador. Se deja RLS
-- activado y sin políticas públicas como capa extra de protección.
alter table bookings enable row level security;
alter table horarios_config enable row level security;
alter table horarios_bloqueados enable row level security;
