create table if not exists public.bazaar_shop_profiles (
  user_id text primary key,
  merchant_id text not null unique,
  area text not null,
  description text not null,
  photo text,
  updated_at timestamptz not null default now()
);

create table if not exists public.bazaar_product_details (
  product_id text primary key,
  description text not null,
  stock integer not null check (stock > 0),
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bazaar_product_details_created_at_idx
  on public.bazaar_product_details (created_at desc);
