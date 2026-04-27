# RLS Smoke Test

**Purpose:** Confirm that Row Level Security policies prevent any user from reading or writing another user's data.

**Frequency:** Run after any schema change or before each Phase ship.

**Time required:** ~10 minutes.

---

## Pre-requisites

- Access to the Supabase project dashboard.
- The owner account (Niri's email) is already set up.
- The app is deployed to a Vercel URL.

---

## Step 1 — Create a second test user

1. Open the Supabase dashboard → **Authentication → Users**.
2. Click **Invite user** and enter a disposable email address (e.g. `test-intruder@example.com`).  
   Alternatively, sign up via magic link from the `/login` page using that address.
3. Note the new user's **UUID** from the Users table — you will need it for the SQL checks.

---

## Step 2 — Confirm data isolation via the Supabase SQL editor

Run the following queries in the **Supabase SQL editor** (Dashboard → SQL Editor).

Replace `<INTRUDER_UUID>` with the test user's UUID and `<OWNER_UUID>` with Niri's UUID.

### 2a — Recipes: intruder cannot read owner's recipes

```sql
-- Switch RLS context to the intruder
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<INTRUDER_UUID>', 'role', 'authenticated')::text, true);
SET LOCAL role TO authenticated;

SELECT id, title FROM recipes WHERE owner_id = '<OWNER_UUID>';
-- Expected: 0 rows
```

### 2b — Recipes: intruder cannot insert a recipe claiming owner's ID

```sql
INSERT INTO recipes (owner_id, slug, title, category, instructions, ingredients)
VALUES ('<OWNER_UUID>', 'test-intrusion', 'Hacked Recipe', 'other', '{}', '[]');
-- Expected: ERROR — new row violates row-level security policy
```

### 2c — owner_ratings: intruder cannot insert a rating for owner's recipe

First get a real recipe ID owned by Niri:

```sql
SELECT id FROM recipes WHERE owner_id = '<OWNER_UUID>' LIMIT 1;
-- Copy the returned <RECIPE_ID>
```

Then attempt the insert as intruder:

```sql
SET LOCAL role TO authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<INTRUDER_UUID>', 'role', 'authenticated')::text, true);

INSERT INTO owner_ratings (recipe_id, stars)
VALUES ('<RECIPE_ID>', 5);
-- Expected: ERROR — new row violates row-level security policy
```

### 2d — cook_log: intruder cannot insert a cook event for owner's recipe

```sql
INSERT INTO cook_log (recipe_id, user_id)
VALUES ('<RECIPE_ID>', '<INTRUDER_UUID>');
-- Expected: ERROR — new row violates row-level security policy
```

### 2e — Intruder cannot update owner's recipe

```sql
UPDATE recipes SET title = 'Pwned' WHERE owner_id = '<OWNER_UUID>';
-- Expected: 0 rows affected (UPDATE returns silently due to RLS filter)
```

### 2f — Intruder cannot delete owner's recipe

```sql
DELETE FROM recipes WHERE owner_id = '<OWNER_UUID>';
-- Expected: 0 rows affected
```

---

## Step 3 — Confirm isolation via the deployed app

1. Sign in to the app as the **intruder** email.
2. The **My Recipes** page should show zero recipes (not Niri's).
3. Manually navigate to a known recipe URL (e.g. `/recipes/lemon-cake`).  
   Expected: **404 Not Found** page (the read query enforces `owner_id = auth.uid()`).
4. Attempt `POST /api/...` or equivalent if any public API routes exist — all should 401 or 404.

---

## Step 4 — Clean up

Delete the intruder test account from the Supabase dashboard → **Authentication → Users → Delete**.

---

## Pass/Fail criteria

| Check | Expected |
|---|---|
| 2a: intruder reads owner recipes | 0 rows |
| 2b: intruder inserts as owner | RLS error |
| 2c: intruder rates owner recipe | RLS error |
| 2d: intruder logs cook for owner | RLS error |
| 2e: intruder updates owner recipe | 0 rows affected |
| 2f: intruder deletes owner recipe | 0 rows affected |
| Step 3: intruder sees My Recipes | 0 recipes |
| Step 3: intruder opens `/recipes/<slug>` | 404 |

All eight checks must pass before Phase 1 is considered hardened.
