# Sportas — Mobile-First Fitness Tracker

A lightweight, mobile-first fitness tracking app: gym attendance, workouts &
exercise logging, cardio, body measurements, a food diary, and AI food-photo
recognition. Multi-user with `client` / `trainer` / `admin` roles — trainers can
view their assigned clients' progress (read-only).

**Stack:** React + TypeScript + Vite · Tailwind CSS · Supabase (auth / Postgres /
storage) · Recharts · Vercel-ready (serverless `/api` route for OpenAI).

---

## 1. Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see step 2 below)

# 3. Run
npm run dev          # http://localhost:5173
```

If `.env` is missing, the app renders a friendly **setup screen** instead of
crashing, so you always know what's left to configure.

Useful scripts:

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                     |
| `npm run build`     | Type-check (`tsc -b`) + production build       |
| `npm run preview`   | Preview the production build locally          |
| `npm run typecheck` | Type-check only                               |

---

## 2. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. **Database** → **SQL Editor** → paste & run [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, enums, triggers, **Row Level Security** policies, the
   `food-photos` storage bucket, and the `add_client_by_email` helper.
3. **Project Settings** → **API** → copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. (Optional) **Auth** → **Providers** → Email: turn *Confirm email* off for the
   fastest local testing, or leave on (the app handles the "check your email"
   flow).
5. (Optional) Register a user in the app, then run
   [`supabase/seed.sql`](supabase/seed.sql) (set the email inside it first) to get
   sample routines, sessions, measurements and food entries.

### Data model

`profiles` · `trainer_clients` · `workout_routines` · `routine_exercises` ·
`workout_sessions` · `workout_sets` · `cardio_sessions` · `body_measurements` ·
`food_entries` · `food_photos`.

### Security model (RLS)

- Every data table: **owners have full access** to their own rows
  (`user_id = auth.uid()`).
- **Trainers get read-only** access to a client's rows once a
  `trainer_clients` link exists. This is enforced by the `is_trainer_of()`
  SECURITY DEFINER function so policies stay simple and non-recursive.
- A new `profiles` row is created automatically on signup via the
  `handle_new_user` trigger (role + name come from signup metadata).
- Storage objects in `food-photos` are scoped to `&lt;user_id&gt;/...` paths.

---

## 3. Roles & the trainer flow

- On registration the user picks **Client** or **Trainer**.
- A **client** shares their account email (see Profile screen → "Connect with a
  trainer").
- A **trainer** opens the Trainer dashboard → **Add** → enters that email. This
  calls the `add_client_by_email` RPC, which verifies the caller is a trainer and
  links the accounts. The trainer can then open each client to see workouts,
  attendance, weight trend and today's calories — **read-only** in this MVP.

---

## 4. AI food-photo recognition

The flow is fully wired and works **today** with mock data, so the OpenAI key is
optional:

1. **Food → Scan** → take/upload a photo.
2. The image uploads to Supabase Storage; the app calls
   [`/api/analyze-food`](api/analyze-food.ts).
3. Detected foods come back and are shown in an **editable** review list.
4. User adjusts and saves them into the food diary.

To enable real recognition, set `OPENAI_API_KEY` (server-side only — **never**
prefix with `VITE_`) in your Vercel project. The serverless route already calls
`gpt-4o-mini` vision and parses the JSON response; no code change needed.

> Locally, `vite dev` does not run `/api`, so the app automatically falls back to
> deterministic mock detection (clearly labelled "Demo data" in the UI).

---

## 5. Deploy to Vercel

1. Push this repo to GitHub/GitLab.
2. In Vercel: **Add New… → Project** → import the repo. Framework preset is
   auto-detected as **Vite** (config is in [`vercel.json`](vercel.json)).
3. **Settings → Environment Variables**, add:

   | Name                     | Scope            | Notes                              |
   | ------------------------ | ---------------- | ---------------------------------- |
   | `VITE_SUPABASE_URL`      | Production+Preview| Supabase project URL               |
   | `VITE_SUPABASE_ANON_KEY` | Production+Preview| Supabase anon public key           |
   | `OPENAI_API_KEY`         | Production+Preview| *(optional)* enables real AI scans |

4. **Deploy.** SPA routing and the `/api/*` function are handled by `vercel.json`.
5. In Supabase **Auth → URL Configuration**, add your Vercel domain to the
   allowed redirect/site URLs.

---

## 6. Project structure

```
api/
  analyze-food.ts        Vercel serverless route (OpenAI-ready, mock fallback)
supabase/
  schema.sql             Tables, enums, triggers, RLS, storage, RPCs
  seed.sql               Optional sample data
src/
  components/
    charts/              Recharts wrappers (MetricChart)
    layout/              AppLayout, BottomNav, PageHeader
    ui/                  Card, Button, Field, Sheet, StatCard, Misc
    RequireAuth.tsx      Auth + trainer route guards
    SetupNotice.tsx      Shown when env vars are missing
  hooks/
    useAuth.tsx          Auth context (session, profile, sign in/up/out)
  lib/
    supabase.ts          Typed Supabase client
    foodAnalysis.ts      Calls /api/analyze-food with mock fallback
  pages/                 Login, Register, Dashboard, Calendar, Workouts,
                         RoutineDetail, ActiveWorkout, Cardio, Measurements,
                         FoodDiary, FoodPhoto, TrainerDashboard,
                         ClientProgress, Settings
  types/                 database.ts (schema types) + labels/constants
  utils/                 date, format, cn helpers
  App.tsx                Routes
  main.tsx               Entry (Router + AuthProvider)
```

---

## 7. Notes & next steps

This is intentionally a simple, expandable MVP. Natural follow-ups:

- Replace `src/types/database.ts` with `supabase gen types typescript`.
- Code-split heavy routes / charts to shrink the initial bundle.
- Add edit-in-place for routines from the trainer side (behind a flag).
- Per-exercise progress charts (data is already captured in `workout_sets`).
- PWA manifest + offline support for true "app-like" mobile use.
