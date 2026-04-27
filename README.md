# Cookbook

A personal digital cookbook. Built with Next.js 15, Supabase, and a print-editorial design language.

## Stack

- **Framework** — Next.js 15 (App Router, React 19, TypeScript)
- **Styling** — Tailwind CSS 4, custom design tokens (light/dark themes)
- **UI** — shadcn/ui components
- **Database** — Supabase Postgres with Row Level Security
- **Auth** — Supabase Auth (magic link)
- **Storage** — Supabase Storage
- **Hosting** — Vercel

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd cookbook
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com). Region: **eu-central-1**.
2. In the Supabase SQL editor, run **`supabase/migrations/0001_init.sql`** — this creates all tables, RLS policies, triggers, and storage buckets.
3. In Supabase → Authentication → URL Configuration, set:
   - **Site URL**: `http://localhost:3000` (dev) / your Vercel URL (prod)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project URL and anon key (Settings → API).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with your email via magic link. The first user to sign up becomes the owner.

## Project structure

```
src/
  app/
    (auth)/         # Login + callback (public)
    (app)/          # Protected app routes
    r/              # Public guest share routes (Phase 2)
  components/
    ui/             # shadcn primitives
    recipe/         # Recipe-specific components
    editor/         # Tiptap + ingredients editor (Chunk 3)
    layout/         # App shell, theme toggle
  lib/
    auth/           # Auth abstraction + Supabase implementation
    db/             # Supabase clients (browser + server)
    utils/          # Helpers
  types/
    db.ts           # Supabase-generated types
    recipe.ts       # Domain types
  middleware.ts     # Session refresh + route protection
supabase/
  migrations/       # SQL migration files
ProjectDocs/        # Planning documents (PRD, schema, design system, etc.)
```

## Regenerate database types

After schema changes:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/db.ts
```

## Phase plan

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Core | In progress | Auth, CRUD, editor, search, ratings, cook log |
| 2 — AI + Sharing | Planned | URL/photo import, AI suggestions, guest links |
| 3 — Family + Polish | Planned | Family invites, cooking mode, print/PDF export |
