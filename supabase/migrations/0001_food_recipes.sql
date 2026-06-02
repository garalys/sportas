-- =============================================================================
-- Migration: add food_recipes (reusable meal templates)
-- =============================================================================
-- Run this in the Supabase SQL Editor if you already created your database
-- from the original schema.sql. Fresh installs get this from schema.sql.
-- Safe to run more than once.
-- =============================================================================

create table if not exists public.food_recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipes_user on public.food_recipes (user_id);

alter table public.food_recipes enable row level security;

drop policy if exists "recipes_owner_all" on public.food_recipes;
create policy "recipes_owner_all" on public.food_recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "recipes_trainer_read" on public.food_recipes;
create policy "recipes_trainer_read" on public.food_recipes
  for select using (public.is_trainer_of(user_id));
