create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_item_id text,
  name text not null,
  brand text,
  category text not null,
  subcategory text,
  size text,
  fit text,
  primary_colour text,
  secondary_colours text[] not null default '{}',
  pattern text,
  material text,
  seasons text[] not null default '{}',
  occasions text[] not null default '{}',
  image_url text,
  status text not null default 'available',
  wear_count integer not null default 0,
  last_worn_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_item_id)
);

create table if not exists public.outfit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion text,
  item_ids uuid[] not null default '{}',
  action text not null check (action in ('recommended','worn','liked','disliked','saved')),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  retailer text not null,
  product_name text not null,
  product_url text,
  price_eur numeric,
  wardrobe_fit integer,
  utility_score integer,
  duplicate_risk integer,
  estimated_new_outfits integer,
  verdict text check (verdict in ('BUY','WAIT','SKIP')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfit_events enable row level security;
alter table public.purchase_checks enable row level security;

create policy "profiles own rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "wardrobe own rows" on public.wardrobe_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "outfit events own rows" on public.outfit_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "purchase checks own rows" on public.purchase_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
