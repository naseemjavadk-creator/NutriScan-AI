-- NutriScan AI schema. Run in Supabase: SQL Editor > New query > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  calorie_goal integer not null default 2000 check (calorie_goal between 800 and 6000),
  protein_goal integer not null default 100 check (protein_goal between 0 and 500),
  carbs_goal integer not null default 250 check (carbs_goal between 0 and 1000),
  fat_goal integer not null default 70 check (fat_goal between 0 and 400),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  eaten_at timestamptz not null default now(),
  -- Denormalised for fast daily/weekly sums:
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  -- Full detail (per-item breakdown and all nutrients, nulls = "Not available"):
  items jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_idx on public.meals (user_id, eaten_at desc);

alter table public.profiles enable row level security;
alter table public.meals enable row level security;

create policy "profiles: own row select" on public.profiles for select using (auth.uid() = id);
create policy "profiles: own row insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own row update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: own row delete" on public.profiles for delete using (auth.uid() = id);

create policy "meals: own rows select" on public.meals for select using (auth.uid() = user_id);
create policy "meals: own rows insert" on public.meals for insert with check (auth.uid() = user_id);
create policy "meals: own rows update" on public.meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meals: own rows delete" on public.meals for delete using (auth.uid() = user_id);
