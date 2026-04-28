-- Tiny Tamer multiplayer/auth approval additions.
-- Movement is NOT stored in the database. The game uses Supabase Realtime
-- Presence + Broadcast on channel "tiny-tamer-world" for live movement.

alter table public.profiles
add column if not exists player_color text default '#72d6c9';

-- Users may read basic public profile info for approved players so names/colors
-- can be shown in multiplayer. Do not expose private fields here.
drop policy if exists "Approved users can read approved public profiles" on public.profiles;
create policy "Approved users can read approved public profiles"
on public.profiles for select
using (
  approved = true
  and exists (
    select 1 from public.profiles viewer
    where viewer.id = auth.uid() and viewer.approved = true
  )
);

-- Allow signed-in users to read their own approval status even before approval.
drop policy if exists "Users can read their own approval status" on public.profiles;
create policy "Users can read their own approval status"
on public.profiles for select
using (auth.uid() = id);

-- Users can update display fields, but not approval. Approval remains manual/admin.
-- Manual approval example:
-- update public.profiles set approved = true where id = 'USER_ID';
create or replace function public.prevent_profile_approval_self_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and new.approved is distinct from old.approved then
    raise exception 'Users cannot approve themselves';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_approval_self_update on public.profiles;
create trigger prevent_profile_approval_self_update
before update on public.profiles
for each row execute function public.prevent_profile_approval_self_update();
