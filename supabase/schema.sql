-- =============================================================================
-- Sportas — Fitness Tracker : Database schema
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent-ish: enums/tables use IF NOT EXISTS where possible.
-- Order matters: enums -> tables -> functions -> triggers -> RLS -> storage.
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('client', 'trainer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_type as enum ('gym', 'cardio', 'rest', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cardio_type as enum ('running', 'cycling', 'walking', 'rowing', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.photo_status as enum ('uploaded', 'analyzing', 'analyzed', 'saved', 'error');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- profiles : 1:1 with auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'client',
  avatar_url  text,
  height_cm   numeric,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- trainer_clients : which trainer is assigned to which client
create table if not exists public.trainer_clients (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (trainer_id, client_id)
);

-- workout_routines : reusable templates ("Push day", "Legs", ...)
create table if not exists public.workout_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- routine_exercises : the planned exercises inside a routine
create table if not exists public.routine_exercises (
  id            uuid primary key default gen_random_uuid(),
  routine_id    uuid not null references public.workout_routines (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  target_sets   integer,
  target_reps   integer,
  target_weight numeric,
  notes         text,
  order_index   integer not null default 0
);

-- workout_sessions : an actual training day (gym / cardio / rest / other)
create table if not exists public.workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  routine_id  uuid references public.workout_routines (id) on delete set null,
  date        date not null default current_date,
  type        public.session_type not null default 'gym',
  notes       text,
  created_at  timestamptz not null default now()
);

-- workout_sets : individual performed sets, logged during a session
create table if not exists public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  exercise_name text not null,
  set_number    integer not null,
  reps          integer,
  weight        numeric,
  created_at    timestamptz not null default now()
);

-- cardio_sessions
create table if not exists public.cardio_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  date         date not null default current_date,
  type         public.cardio_type not null default 'running',
  duration_min integer not null,
  calories     integer,
  distance_km  numeric,
  notes        text,
  created_at   timestamptz not null default now()
);

-- body_measurements
create table if not exists public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  date         date not null default current_date,
  height_cm    numeric,
  weight_kg    numeric,
  waist_cm     numeric,
  shoulders_cm numeric,
  wrist_cm     numeric,
  chest_cm     numeric,
  arm_cm       numeric,
  hips_cm      numeric,
  created_at   timestamptz not null default now()
);

-- food_entries : food diary
create table if not exists public.food_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  date       date not null default current_date,
  meal_type  public.meal_type not null default 'breakfast',
  name       text not null,
  quantity   text,
  calories   numeric,
  protein    numeric,
  carbs      numeric,
  fat        numeric,
  photo_id   uuid,
  created_at timestamptz not null default now()
);

-- food_photos : uploaded images + AI detection payload
create table if not exists public.food_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  status       public.photo_status not null default 'uploaded',
  detected     jsonb,
  created_at   timestamptz not null default now()
);

-- food_recipes : reusable meals/templates (items stored as a JSONB array)
create table if not exists public.food_recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Late FK so food_entries can reference a photo
do $$ begin
  alter table public.food_entries
    add constraint food_entries_photo_id_fkey
    foreign key (photo_id) references public.food_photos (id) on delete set null;
exception when duplicate_object then null; end $$;

-- Helpful indexes for the common "by user, by date" queries
create index if not exists idx_sessions_user_date     on public.workout_sessions (user_id, date);
create index if not exists idx_sets_user_exercise      on public.workout_sets (user_id, exercise_name);
create index if not exists idx_sets_session            on public.workout_sets (session_id);
create index if not exists idx_cardio_user_date        on public.cardio_sessions (user_id, date);
create index if not exists idx_measure_user_date       on public.body_measurements (user_id, date);
create index if not exists idx_food_user_date          on public.food_entries (user_id, date);
create index if not exists idx_recipes_user            on public.food_recipes (user_id);
create index if not exists idx_routine_ex_routine      on public.routine_exercises (routine_id);
create index if not exists idx_trainer_clients_trainer on public.trainer_clients (trainer_id);
create index if not exists idx_trainer_clients_client  on public.trainer_clients (client_id);

-- -----------------------------------------------------------------------------
-- 3. Functions & triggers
-- -----------------------------------------------------------------------------

-- Keeps profiles.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
-- Reads optional full_name / role from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER helper: is the current user a trainer assigned to target_user?
-- Defined as SECURITY DEFINER so it can read trainer_clients without being
-- blocked by (or recursing through) that table's own RLS policies.
create or replace function public.is_trainer_of(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trainer_clients tc
    where tc.trainer_id = auth.uid()
      and tc.client_id = target_user
  );
$$;

-- Trainer-friendly way to assign a client by their email. Runs as SECURITY
-- DEFINER so it can look the user up in auth.users, but it verifies the caller
-- is actually a trainer/admin first. Returns the linked client's id.
create or replace function public.add_client_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_role   public.user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('trainer', 'admin') then
    raise exception 'Only trainers can add clients';
  end if;

  select id into v_client from auth.users where lower(email) = lower(p_email);
  if v_client is null then
    raise exception 'No user found with that email';
  end if;
  if v_client = auth.uid() then
    raise exception 'You cannot add yourself as a client';
  end if;

  insert into public.trainer_clients (trainer_id, client_id)
  values (auth.uid(), v_client)
  on conflict (trainer_id, client_id) do nothing;

  return v_client;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.trainer_clients   enable row level security;
alter table public.workout_routines  enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.cardio_sessions   enable row level security;
alter table public.body_measurements enable row level security;
alter table public.food_entries      enable row level security;
alter table public.food_photos       enable row level security;
alter table public.food_recipes      enable row level security;

-- ---- profiles --------------------------------------------------------------
drop policy if exists "profiles_select_own_or_client" on public.profiles;
create policy "profiles_select_own_or_client" on public.profiles
  for select using (
    id = auth.uid() or public.is_trainer_of(id)
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- trainer_clients -------------------------------------------------------
drop policy if exists "tc_select_party" on public.trainer_clients;
create policy "tc_select_party" on public.trainer_clients
  for select using (trainer_id = auth.uid() or client_id = auth.uid());

drop policy if exists "tc_trainer_insert" on public.trainer_clients;
create policy "tc_trainer_insert" on public.trainer_clients
  for insert with check (trainer_id = auth.uid());

drop policy if exists "tc_trainer_delete" on public.trainer_clients;
create policy "tc_trainer_delete" on public.trainer_clients
  for delete using (trainer_id = auth.uid());

-- ---- Generic pattern for the user-owned data tables ------------------------
-- Owner has full access; assigned trainer gets read-only (SELECT) access.

-- workout_routines
drop policy if exists "routines_owner_all" on public.workout_routines;
create policy "routines_owner_all" on public.workout_routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "routines_trainer_read" on public.workout_routines;
create policy "routines_trainer_read" on public.workout_routines
  for select using (public.is_trainer_of(user_id));

-- routine_exercises
drop policy if exists "rex_owner_all" on public.routine_exercises;
create policy "rex_owner_all" on public.routine_exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rex_trainer_read" on public.routine_exercises;
create policy "rex_trainer_read" on public.routine_exercises
  for select using (public.is_trainer_of(user_id));

-- workout_sessions
drop policy if exists "sessions_owner_all" on public.workout_sessions;
create policy "sessions_owner_all" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sessions_trainer_read" on public.workout_sessions;
create policy "sessions_trainer_read" on public.workout_sessions
  for select using (public.is_trainer_of(user_id));

-- workout_sets
drop policy if exists "sets_owner_all" on public.workout_sets;
create policy "sets_owner_all" on public.workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sets_trainer_read" on public.workout_sets;
create policy "sets_trainer_read" on public.workout_sets
  for select using (public.is_trainer_of(user_id));

-- cardio_sessions
drop policy if exists "cardio_owner_all" on public.cardio_sessions;
create policy "cardio_owner_all" on public.cardio_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cardio_trainer_read" on public.cardio_sessions;
create policy "cardio_trainer_read" on public.cardio_sessions
  for select using (public.is_trainer_of(user_id));

-- body_measurements
drop policy if exists "measure_owner_all" on public.body_measurements;
create policy "measure_owner_all" on public.body_measurements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "measure_trainer_read" on public.body_measurements;
create policy "measure_trainer_read" on public.body_measurements
  for select using (public.is_trainer_of(user_id));

-- food_entries
drop policy if exists "food_owner_all" on public.food_entries;
create policy "food_owner_all" on public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "food_trainer_read" on public.food_entries;
create policy "food_trainer_read" on public.food_entries
  for select using (public.is_trainer_of(user_id));

-- food_photos
drop policy if exists "photos_owner_all" on public.food_photos;
create policy "photos_owner_all" on public.food_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "photos_trainer_read" on public.food_photos;
create policy "photos_trainer_read" on public.food_photos
  for select using (public.is_trainer_of(user_id));

-- food_recipes
drop policy if exists "recipes_owner_all" on public.food_recipes;
create policy "recipes_owner_all" on public.food_recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "recipes_trainer_read" on public.food_recipes;
create policy "recipes_trainer_read" on public.food_recipes
  for select using (public.is_trainer_of(user_id));

-- -----------------------------------------------------------------------------
-- 5. Storage bucket for food photos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

-- Path convention: <user_id>/<filename>. The first folder must equal the uid.
drop policy if exists "food_photos_read_own" on storage.objects;
create policy "food_photos_read_own" on storage.objects
  for select using (
    bucket_id = 'food-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_trainer_of(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "food_photos_write_own" on storage.objects;
create policy "food_photos_write_own" on storage.objects
  for insert with check (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "food_photos_delete_own" on storage.objects;
create policy "food_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Done. See seed.sql for optional sample data.
-- =============================================================================
