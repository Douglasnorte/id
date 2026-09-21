-- Ponto de colaboradores — schema Supabase (Postgres)
-- Execute este arquivo no SQL editor do seu projeto Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Colaboradores
-- ---------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  -- número extraído do crachá/LMS: {12345} -> "12345". Fica nulo para
  -- colaboradores importados via CSV que ainda não tiveram o crachá lido.
  badge_code text unique,
  name text not null,
  department text,
  role text,
  -- dados de escala vindos da planilha de escalas (texto livre por ora —
  -- a tabela employee_schedules abaixo é para quando isso virar estruturado).
  shift_group text,   -- ex.: grupo/turno "A", "B", "C", "D"
  shift_label text,   -- ex.: "5x2 - 01:30 as 10:48"
  employment_type text, -- ex.: "Efetivo", "Temporário", "Operador TP"
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reexecutar em um banco já existente: garante que essas colunas/ajustes existam.
alter table public.employees alter column badge_code drop not null;
alter table public.employees add column if not exists shift_group text;
alter table public.employees add column if not exists shift_label text;
alter table public.employees add column if not exists employment_type text;

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
-- Calendário de escalas (quem tem DSR/folga em cada dia)
-- Uma linha por combinação (data, departamento, grupo de escala).
-- department/shift_group usam os mesmos valores de employees.department
-- e employees.shift_group (ex.: "SVC AM" + "A"), para cruzar direto com
-- o colaborador na tela de pendências.
-- ---------------------------------------------------------------------
create table if not exists public.shift_calendar (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  department text not null,
  shift_group text not null,
  is_dsr boolean not null default false,
  created_at timestamptz not null default now(),
  unique (work_date, department, shift_group)
);

create index if not exists shift_calendar_date_idx on public.shift_calendar (work_date);

-- ---------------------------------------------------------------------
-- Login por usuário (o Supabase Auth exige e-mail; isso traduz um nome
-- de usuário simples para o e-mail cadastrado, só para a tela de login).
-- Cadastre cada login com:
--   insert into public.login_usernames (username, email) values ('douglas', 'nortedouglas@gmail.com');
-- ---------------------------------------------------------------------
create table if not exists public.login_usernames (
  username text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists login_usernames_lower_idx on public.login_usernames (lower(username));

-- SECURITY DEFINER: roda com o dono da função (não o usuário anônimo que
-- ainda não fez login), então funciona na tela de login antes de autenticar,
-- sem expor a tabela inteira — só devolve o e-mail de um usuário por vez.
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.login_usernames where lower(username) = lower(trim(p_username)) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

alter table public.login_usernames enable row level security;
-- Sem políticas: ninguém lê a tabela direto, só através da função acima.

-- ---------------------------------------------------------------------
-- Row Level Security — acesso apenas para usuários autenticados
-- (a equipe que opera o ponto faz login com uma conta Supabase Auth)
-- ---------------------------------------------------------------------
alter table public.employees enable row level security;
alter table public.time_events enable row level security;
alter table public.employee_schedules enable row level security;
alter table public.shift_calendar enable row level security;

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

-- Permite corrigir uma batida errada (desfazer um registro específico ou
-- limpar as batidas do dia).
drop policy if exists "time_events_delete_authenticated" on public.time_events;
create policy "time_events_delete_authenticated" on public.time_events
  for delete to authenticated using (true);

drop policy if exists "employee_schedules_all_authenticated" on public.employee_schedules;
create policy "employee_schedules_all_authenticated" on public.employee_schedules
  for all to authenticated using (true) with check (true);

drop policy if exists "shift_calendar_all_authenticated" on public.shift_calendar;
create policy "shift_calendar_all_authenticated" on public.shift_calendar
  for all to authenticated using (true) with check (true);

-- Garante que a API (PostgREST) enxergue imediatamente colunas/tabelas novas
-- criadas acima, sem esperar o refresh automático do cache de schema.
notify pgrst, 'reload schema';
