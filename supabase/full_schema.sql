-- Tiny Tamer complete Supabase schema
-- Copy and paste this entire file into the Supabase SQL Editor.

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
  email text,
  display_name text,
  player_color text default '#7dd3fc',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists player_color text default '#7dd3fc';
alter table public.profiles add column if not exists approved boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.player_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  save_version integer not null default 1,
  active_creature_id text,
  save_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.player_saves add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.player_saves add column if not exists save_version integer not null default 1;
alter table public.player_saves add column if not exists active_creature_id text;
alter table public.player_saves add column if not exists save_data jsonb not null default '{}'::jsonb;
alter table public.player_saves add column if not exists created_at timestamptz not null default now();
alter table public.player_saves add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_player_saves_user_id on public.player_saves(user_id);
create index if not exists idx_profiles_email on public.profiles(email);

create or replace function public.protect_profile_approval_and_private_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and auth.uid() is not null then
    if tg_op = 'INSERT' and new.approved is distinct from false then
      raise exception 'Users cannot approve themselves';
    end if;

    if tg_op = 'UPDATE' then
      if old.id is distinct from new.id then raise exception 'Users cannot change profile id'; end if;
      if old.email is distinct from new.email then raise exception 'Users cannot change profile email'; end if;
      if old.approved is distinct from new.approved then raise exception 'Users cannot change approval status'; end if;
      if old.created_at is distinct from new.created_at then raise exception 'Users cannot change profile creation time'; end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, approved)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists protect_profile_approval_and_private_fields on public.profiles;
create trigger protect_profile_approval_and_private_fields before insert or update on public.profiles for each row execute function public.protect_profile_approval_and_private_fields();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_player_saves_updated_at on public.player_saves;
create trigger set_player_saves_updated_at before update on public.player_saves for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (id = auth.uid() and approved = false);

drop policy if exists "Users can update safe profile fields" on public.profiles;
create policy "Users can update safe profile fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and approved = false);

drop policy if exists "Users can read their own save" on public.player_saves;
create policy "Users can read their own save" on public.player_saves for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users can insert their own save" on public.player_saves;
create policy "Users can insert their own save" on public.player_saves for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users can update their own save" on public.player_saves;
create policy "Users can update their own save" on public.player_saves for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can delete their own save" on public.player_saves;
create policy "Users can delete their own save" on public.player_saves for delete to authenticated using (user_id = auth.uid());

-- Manual approval is intentionally admin-only.
-- Run this in the Supabase SQL Editor or table editor as the project owner:
--
-- update public.profiles
-- set approved = true
-- where email = 'friend@example.com';
