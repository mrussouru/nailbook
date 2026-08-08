-- ============================================================
-- NAILBOOK · Setup de base de datos para Supabase
-- ============================================================
-- Instrucciones: copiá TODO este archivo y pegalo en
-- Supabase → tu proyecto → SQL Editor → New query → Run
-- ============================================================

-- 1. Tabla de servicios (Capping, Esmaltado semi, Soft gel, etc.)
create table if not exists servicios (
  id text primary key,
  nombre text not null,
  duracion integer not null,       -- minutos
  precio numeric not null,
  activo boolean default true,
  orden integer default 0
);

insert into servicios (id, nombre, duracion, precio, orden) values
  ('capping', 'Capping', 90, 900, 1),
  ('esmaltado_semi', 'Esmaltado semi', 60, 800, 2),
  ('soft_gel', 'Soft gel', 120, 1300, 3)
on conflict (id) do nothing;

-- 2. Tabla de turnos
create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  telefono text not null,
  servicio text not null references servicios(id),
  fecha date not null,
  hora time not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado','completado','cancelado')),
  nota text default '',
  recordatorio_enviado boolean default false,
  origen text default 'interno' check (origen in ('interno','publico')),
  creado_en timestamptz default now()
);

create index if not exists idx_turnos_fecha on turnos(fecha);

-- ============================================================
-- 3. SEGURIDAD (Row Level Security)
-- ============================================================
-- Esto es lo que hace que las clientas (web pública) NUNCA vean
-- nombres, teléfonos ni notas de otras personas — solo qué
-- horarios están ocupados, sin datos sensibles.

alter table turnos enable row level security;
alter table servicios enable row level security;

-- Cualquiera puede leer los servicios activos (para elegir en el form)
create policy "servicios publicos visibles"
  on servicios for select
  using (activo = true);

-- Cualquiera puede INSERTAR un turno (reservar), pero siempre como "pendiente"
create policy "publico puede reservar"
  on turnos for insert
  with check (estado = 'pendiente' and origen = 'publico');

-- IMPORTANTE: no hay policy de "select" pública sobre turnos completos.
-- La web pública NO lee la tabla turnos directamente para mostrar
-- disponibilidad: usa la función de abajo, que solo devuelve horarios
-- ocupados (sin nombres ni teléfonos).

create or replace function horarios_ocupados(fecha_consulta date)
returns table(hora time, duracion integer) as $$
  select t.hora, s.duracion
  from turnos t
  join servicios s on s.id = t.servicio
  where t.fecha = fecha_consulta
    and t.estado != 'cancelado';
$$ language sql security definer stable;

grant execute on function horarios_ocupados(date) to anon;

-- ============================================================
-- 4. Acceso del panel interno (vos / tu equipo)
-- ============================================================
-- Para simplificar (sin sistema de usuarios/login complejo),
-- el panel interno se protege con una CLAVE en la propia app
-- (ver guía paso a paso) y usa una "service role key" de Supabase
-- que tiene permiso total. Esa clave NUNCA se expone en la web
-- pública de reservas, solo en el panel interno.
-- ============================================================
