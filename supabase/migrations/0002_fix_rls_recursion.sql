-- ============================================================
-- Fix: infinite recursion in profiles RLS
--
-- Several policies do `select 1 from profiles where ... = auth.uid() and
-- role = '…'` from inside a `profiles` policy, which makes Postgres
-- recurse into the same policy and abort with:
--   "infinite recursion detected in policy for relation \"profiles\""
--
-- The recursion also poisons every query that joins profiles via RLS
-- (e.g. recipes_family_read), so list/detail pages return zero rows
-- with an error and the UI shows 404s and empty grids.
--
-- Fix: replace every "is owner / is family" check with SECURITY DEFINER
-- helper functions that read profiles with elevated privileges,
-- bypassing RLS for the role lookup.
-- ============================================================

-- ─── Drop recursive policies ────────────────────────────────
drop policy if exists profiles_owner_read_all on profiles;
drop policy if exists recipes_family_read on recipes;
drop policy if exists owner_ratings_family_read on owner_ratings;
drop policy if exists "owner uploads recipe images" on storage.objects;
drop policy if exists "owner manages imports" on storage.objects;

-- ─── Helper functions (run as the function owner — bypass RLS) ─
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(role = 'owner', false) from profiles where id = auth.uid()
$$;

create or replace function public.is_family()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(role = 'family', false) from profiles where id = auth.uid()
$$;

-- Lock down execution to authenticated callers only
revoke all on function public.current_user_role() from public;
revoke all on function public.is_owner()           from public;
revoke all on function public.is_family()          from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_owner()           to authenticated;
grant execute on function public.is_family()          to authenticated;

-- ─── Re-create policies using the helper functions ──────────
create policy profiles_owner_read_all on profiles
  for select using (public.is_owner());

create policy recipes_family_read on recipes
  for select using (public.is_family());

create policy owner_ratings_family_read on owner_ratings
  for select using (public.is_family());

create policy "owner uploads recipe images" on storage.objects
  for insert with check (
    bucket_id = 'recipes-images' and public.is_owner()
  );

create policy "owner manages imports" on storage.objects
  for all using (
    bucket_id = 'recipes-imports' and public.is_owner()
  );
