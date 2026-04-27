-- ============================================================
-- Cookbook — initial schema
-- Run this against your Supabase project via the SQL editor
-- or the Supabase CLI: supabase db push
-- ============================================================

-- ─── profiles ───────────────────────────────────────────────
-- Mirrors auth.users with app-specific fields.
-- Created via trigger on auth signup.

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text,
  role          text not null default 'family'
                  check (role in ('owner', 'family')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);

-- ─── recipes ────────────────────────────────────────────────

create table recipes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  hero_image_url  text,
  category        text not null check (category in (
                    'breakfast', 'lunch', 'dinner', 'dessert', 'baking',
                    'soup', 'salad', 'sauce', 'drink', 'snack', 'other'
                  )),
  tags            text[] not null default '{}',
  source_type     text check (source_type in ('original', 'url', 'photo', 'family', 'cookbook')),
  source_value    text,
  prep_minutes    int,
  cook_minutes    int,
  servings        int,
  ingredients     jsonb not null default '[]',
  instructions    jsonb not null default '{}',
  notes           jsonb,
  is_public       boolean not null default false,
  public_share_id text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(owner_id, slug)
);

create index recipes_owner_idx       on recipes(owner_id);
create index recipes_category_idx    on recipes(category);
create index recipes_tags_idx        on recipes using gin(tags);
create index recipes_public_share_idx on recipes(public_share_id) where is_public = true;
create index recipes_search_idx      on recipes using gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ─── owner_ratings ──────────────────────────────────────────
-- One row per recipe; Niri's personal rating.

create table owner_ratings (
  recipe_id  uuid primary key references recipes(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  notes      text,
  updated_at timestamptz not null default now()
);

-- ─── guest_ratings ──────────────────────────────────────────

create table guest_ratings (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  fingerprint text not null,
  guest_name  text,
  stars       smallint not null check (stars between 1 and 5),
  comment     text,
  ip_hash     text,
  created_at  timestamptz not null default now(),
  unique(recipe_id, fingerprint)
);

create index guest_ratings_recipe_idx on guest_ratings(recipe_id);

-- ─── family_ratings ─────────────────────────────────────────
-- Phase 3 feature; schema ready now to avoid a migration later.

create table family_ratings (
  recipe_id  uuid not null references recipes(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

-- ─── cook_log ───────────────────────────────────────────────

create table cook_log (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  cooked_at     timestamptz not null default now(),
  note          text,
  result_rating smallint check (result_rating between 1 and 5)
);

create index cook_log_recipe_idx   on cook_log(recipe_id);
create index cook_log_user_date_idx on cook_log(user_id, cooked_at desc);

-- ─── ai_jobs ────────────────────────────────────────────────

create table ai_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  job_type      text not null check (job_type in ('url_import', 'photo_import', 'upgrade', 'swap')),
  input         jsonb not null,
  output        jsonb,
  status        text not null default 'pending'
                  check (status in ('pending', 'success', 'error')),
  error_message text,
  tokens_used   int,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index ai_jobs_user_idx on ai_jobs(user_id, created_at desc);

-- ─── Row level security ──────────────────────────────────────

alter table profiles      enable row level security;
alter table recipes        enable row level security;
alter table owner_ratings  enable row level security;
alter table guest_ratings  enable row level security;
alter table family_ratings enable row level security;
alter table cook_log       enable row level security;
alter table ai_jobs        enable row level security;

-- profiles
create policy profiles_self_read on profiles
  for select using (auth.uid() = id);

create policy profiles_owner_read_all on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy profiles_self_update on profiles
  for update using (auth.uid() = id);

-- recipes
create policy recipes_owner_full on recipes
  for all using (auth.uid() = owner_id);

create policy recipes_family_read on recipes
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'family')
  );

create policy recipes_public_read on recipes
  for select using (is_public = true);

-- owner_ratings
create policy owner_ratings_owner_full on owner_ratings
  for all using (
    exists (select 1 from recipes where id = recipe_id and owner_id = auth.uid())
  );

create policy owner_ratings_family_read on owner_ratings
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'family')
  );

create policy owner_ratings_public_read on owner_ratings
  for select using (
    exists (select 1 from recipes where id = recipe_id and is_public = true)
  );

-- guest_ratings
create policy guest_ratings_public_insert on guest_ratings
  for insert with check (
    exists (select 1 from recipes where id = recipe_id and is_public = true)
  );

create policy guest_ratings_public_read on guest_ratings
  for select using (
    exists (select 1 from recipes where id = recipe_id and is_public = true)
  );

create policy guest_ratings_owner_delete on guest_ratings
  for delete using (
    exists (select 1 from recipes where id = recipe_id and owner_id = auth.uid())
  );

-- family_ratings
create policy family_ratings_self on family_ratings
  for all using (auth.uid() = user_id);

create policy family_ratings_owner_read on family_ratings
  for select using (
    exists (select 1 from recipes where id = recipe_id and owner_id = auth.uid())
  );

-- cook_log
create policy cook_log_self on cook_log
  for all using (auth.uid() = user_id);

create policy cook_log_owner_read on cook_log
  for select using (
    exists (select 1 from recipes where id = recipe_id and owner_id = auth.uid())
  );

-- ai_jobs
create policy ai_jobs_self on ai_jobs
  for all using (auth.uid() = user_id);

-- ─── Triggers ───────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

create trigger recipes_updated before update on recipes
  for each row execute function set_updated_at();

create trigger owner_ratings_updated before update on owner_ratings
  for each row execute function set_updated_at();

create trigger family_ratings_updated before update on family_ratings
  for each row execute function set_updated_at();

-- Auto-create profile on signup.
-- First user to sign up becomes owner; everyone after is family.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when not exists (select 1 from profiles where role = 'owner')
      then 'owner'
      else 'family'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Storage buckets ─────────────────────────────────────────
-- Run these in the Supabase dashboard SQL editor if you prefer
-- to manage storage buckets via the UI instead.

insert into storage.buckets (id, name, public)
  values ('recipes-images', 'recipes-images', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('recipes-imports', 'recipes-imports', false)
  on conflict (id) do nothing;

create policy "owner uploads recipe images" on storage.objects
  for insert with check (
    bucket_id = 'recipes-images' and
    auth.uid() in (select id from profiles where role = 'owner')
  );

create policy "anyone reads recipe images" on storage.objects
  for select using (bucket_id = 'recipes-images');

create policy "owner manages imports" on storage.objects
  for all using (
    bucket_id = 'recipes-imports' and
    auth.uid() in (select id from profiles where role = 'owner')
  );
