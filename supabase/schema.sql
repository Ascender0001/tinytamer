-- Tiny Tamer Supabase schema
-- Copy/paste this file into the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  save_version integer not null default 1,
  active_creature_id text,
  save_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Optional allow-list table for future manual approval workflows.
-- You can insert emails here manually, then use an auth webhook/edge function later
-- to update profiles.approved when a matching user signs up.
create table if not exists public.approved_users (
  email text primary key,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_player_saves_user_id on public.player_saves(user_id);
create index if not exists idx_profiles_approved on public.profiles(approved);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_player_saves_updated_at on public.player_saves;
create trigger set_player_saves_updated_at
before update on public.player_saves
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;
alter table public.approved_users enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read their own save" on public.player_saves;
create policy "Users can read their own save"
on public.player_saves for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own save" on public.player_saves;
create policy "Users can insert their own save"
on public.player_saves for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own save" on public.player_saves;
create policy "Users can update their own save"
on public.player_saves for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own save" on public.player_saves;
create policy "Users can delete their own save"
on public.player_saves for delete
using (auth.uid() = user_id);

-- approved_users is intentionally locked down by default.
-- Manage it from the Supabase dashboard/service role, or add admin-only policies later.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    exists(select 1 from public.approved_users where email = new.email and approved = true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
