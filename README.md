# NutriScan AI

Scan a photo of food, confirm what the AI found, and get an estimated nutrition report.
Built with Next.js 15 (App Router) + TypeScript, Tailwind CSS, Supabase, Recharts,
a Claude vision model for recognition and USDA FoodData Central for nutrition values.

## How it works

1. `POST /api/analyze` takes a photo (JPG/PNG/WEBP, 5 MB max, type checked by file signature) and asks a
   vision model for foods, estimated grams, confidence and follow-up questions. It never returns nutrition numbers.
2. The user confirms or corrects names and portions in the scanner.
3. `POST /api/nutrition` looks each food up in USDA FoodData Central (per 100 g), scales by grams, and
   sums the items into the meal total. Missing nutrients stay `null` and display as "Not available". They are never treated as 0.
4. Signed-in users save the meal (`/api/meals`). Totals are recomputed on the server before saving.

Measured vs estimated: per-100 g values come from the database; portions come from the photo (or the user)
and are always labelled as estimates.

## Setup

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run dev                     # http://localhost:3000
```

| Variable | Where to get it |
| --- | --- |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | console.anthropic.com (any current vision-capable Claude model) |
| `USDA_API_KEY` | free at fdc.nal.usda.gov/api-key-signup |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only; used just for "Delete account" |

Then open the Supabase SQL Editor and run `supabase/schema.sql` (tables + Row Level Security).
In Supabase > Authentication you can turn email confirmation on or off; the sign-up form handles both.

If a key is missing, the app shows a setup message instead of fake results.

## Project structure

```
supabase/schema.sql           tables, indexes, RLS policies
src/middleware.ts             refreshes sessions, protects /dashboard /history /profile
src/lib/nutrients.ts          the nutrient list, USDA IDs, daily references, scale/sum maths
src/lib/usda.ts               USDA FoodData Central lookup (server)
src/lib/vision.ts             vision model call with a forced structured output (server)
src/app/api/analyze           photo -> foods + portions
src/app/api/nutrition         foods + grams -> per-item and total nutrition
src/app/api/meals[/id]        diary CRUD (RLS-protected)
src/app/api/profile           goals
src/app/api/account           delete account + data
src/app/page.tsx              landing page
src/app/scan                  scanner, confirmation and results (components/ScanFlow.tsx)
src/app/dashboard             today: calories, macro goals, meals by category
src/app/history               day picker, weekly charts, edit/delete
src/app/profile               goals, goal estimator, account deletion
```

## Security notes

- API keys are read only in server code. Only the Supabase anon key is public (RLS protects the data).
- Uploads: size limit, signature-based type check, in-memory only (photos are never stored).
- `/api/analyze` has a small in-memory rate limit. Use a shared store (e.g. Upstash Redis) when running several instances.
- Security headers are set in `next.config.mjs`.

## Manual test checklist

1. `/scan` with no keys: you should see the setup message, not results.
2. Add keys, upload a meal photo, confirm foods, calculate; check totals equal the sum of items.
3. Rename a food to nonsense: it shows "No database match" and "Not available".
4. Sign up, save a meal, find it on Today and History; edit portion (0.5x) and delete.
5. Profile: save goals, then delete the account.
6. Repeat on a phone (camera button, bottom navigation).
