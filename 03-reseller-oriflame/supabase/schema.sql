-- Jalankan seluruh file ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- Ini akan membuat tabel `products` & `promos` beserta Row Level Security (RLS):
-- siapa saja bisa membaca (read), tapi hanya user yang login (admin) yang bisa
-- menambah/mengubah/menghapus data. Setara dengan firestore.rules di versi Firebase.

create extension if not exists "pgcrypto";

-- ============ PRODUCTS ============
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric not null,
  discount_price numeric,
  description text,
  image_url text,
  status text default 'Ready Stock',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;

create policy "Public can read products"
  on products for select
  using (true);

create policy "Authenticated users can insert products"
  on products for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update products"
  on products for update
  to authenticated
  using (true);

create policy "Authenticated users can delete products"
  on products for delete
  to authenticated
  using (true);

-- ============ PROMOS ============
create table if not exists promos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount numeric,
  valid_until timestamptz,
  image_url text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table promos enable row level security;

create policy "Public can read promos"
  on promos for select
  using (true);

create policy "Authenticated users can insert promos"
  on promos for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update promos"
  on promos for update
  to authenticated
  using (true);

create policy "Authenticated users can delete promos"
  on promos for delete
  to authenticated
  using (true);

-- ============ AUTO-UPDATE updated_at ============
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger promos_set_updated_at
  before update on promos
  for each row execute function set_updated_at();
