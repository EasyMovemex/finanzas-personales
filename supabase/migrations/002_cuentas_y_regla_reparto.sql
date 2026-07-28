-- Migración: cuentas configurables + regla de reparto configurable por mes.
-- Correr esto en el SQL editor de tu proyecto Supabase (el mismo que ya usa
-- la app: no crea nada que reemplace tablas existentes, solo agrega lo nuevo).

-- 1) Cuentas configurables (antes era un array hardcodeado en el JS).
create table if not exists public.cuentas (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cuentas enable row level security;

create policy "cuentas: select propias" on public.cuentas
  for select using (auth.uid() = uid);
create policy "cuentas: insert propias" on public.cuentas
  for insert with check (auth.uid() = uid);
create policy "cuentas: update propias" on public.cuentas
  for update using (auth.uid() = uid);
create policy "cuentas: delete propias" on public.cuentas
  for delete using (auth.uid() = uid);

-- 2) Regla de reparto (%) configurable por mes, sobre la tabla que ya existía.
alter table public.objetivos_personal
  add column if not exists pct_gastos numeric,
  add column if not exists pct_fijos numeric,
  add column if not exists pct_ahorro numeric;

-- Nota: si tu tabla objetivos_personal no tiene un unique constraint sobre
-- (uid, ano, mes), agregalo para que el upsert con onConflict funcione:
-- alter table public.objetivos_personal add constraint objetivos_personal_uid_ano_mes_key unique (uid, ano, mes);
