-- ============================================================
-- Cookbook — invites (Phase 3, Chunk 1)
-- Paste this into the Supabase SQL editor and run it.
-- ============================================================

create table invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  invited_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

alter table invites enable row level security;

-- Owner can read / insert / update / delete all rows.
create policy invites_owner_full on invites
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Any authenticated user can check whether their own email is in the list.
-- Used by the auth callback to gate access without needing a service-role key.
create policy invites_self_check on invites
  for select using (email = auth.email());
