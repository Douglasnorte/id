-- Ponto de colaboradores — schema Supabase (Postgres)
-- Execute este arquivo no SQL editor do seu projeto Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Colaboradores
-- ---------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  badge_code text not null unique,        -- número extraído do crachá/LMS: {12345} -> "12345"
  name text not null,
  department text,
  role text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_active_idx on public.employees (active);
create index if not exists employees_badge_code_idx on public.employees (badge_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Eventos de ponto (registro imutável de cada batida)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_event_type') then
    create type public.time_event_type as enum (
      'check_in',    -- entrada
      'lunch_out',   -- saída para almoço
      'lunch_in',    -- volta do almoço
      'check_out'    -- saída
    );
  end if;
end $$;

create table if not exists public.time_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete restrict,
  event_type public.time_event_type not null,
  event_time timestamptz not null default now(),
  source text not null default 'manual',  -- 'scanner' | 'camera' | 'manual'
  created_at timestamptz not null default now()
);

create index if not exists time_events_employee_idx on public.time_events (employee_id, event_time desc);
create index if not exists time_events_event_time_idx on public.time_events (event_time);

-- ---------------------------------------------------------------------
-- Escalas dos colaboradores (uso futuro — sem UI ainda)
-- ---------------------------------------------------------------------
create table if not exists public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time,
  end_time time,
  lunch_start_time time,
  lunch_end_time time,
  created_at timestamptz not null default now()
);

create index if not exists employee_schedules_employee_idx on public.employee_schedules (employee_id);

-- ---------------------------------------------------------------------
-- Row Level Security — acesso apenas para usuários autenticados
-- (a equipe que opera o ponto faz login com uma conta Supabase Auth)
-- ---------------------------------------------------------------------
alter table public.employees enable row level security;
alter table public.time_events enable row level security;
alter table public.employee_schedules enable row level security;

drop policy if exists "employees_select_authenticated" on public.employees;
create policy "employees_select_authenticated" on public.employees
  for select to authenticated using (true);

drop policy if exists "employees_write_authenticated" on public.employees;
create policy "employees_write_authenticated" on public.employees
  for all to authenticated using (true) with check (true);

drop policy if exists "time_events_select_authenticated" on public.time_events;
create policy "time_events_select_authenticated" on public.time_events
  for select to authenticated using (true);

drop policy if exists "time_events_insert_authenticated" on public.time_events;
create policy "time_events_insert_authenticated" on public.time_events
  for insert to authenticated with check (true);

drop policy if exists "employee_schedules_all_authenticated" on public.employee_schedules;
create policy "employee_schedules_all_authenticated" on public.employee_schedules
  for all to authenticated using (true) with check (true);
