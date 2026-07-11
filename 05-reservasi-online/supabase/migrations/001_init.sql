-- ============================================================
-- Tarasari Booking App — Initial Migration
-- File: supabase/migrations/001_init.sql
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. EXTENSION
-- ──────────────────────────────────────────────────────────
create extension if not exists btree_gist;


-- ──────────────────────────────────────────────────────────
-- 2. TABEL PROFILES
--    Menyimpan data tambahan user (customer & admin).
--    id = referensi ke auth.users bawaan Supabase.
-- ──────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'customer'
               check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- RLS profiles
alter table public.profiles enable row level security;

-- User hanya bisa lihat & update profil sendiri
create policy "profiles: user view own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: user update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Admin bisa lihat semua profil
create policy "profiles: admin view all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());


-- ──────────────────────────────────────────────────────────
-- 3. FUNGSI BANTU is_admin()
--    Dipakai di semua RLS policy yang butuh cek role admin.
--    PENTING: buat SEBELUM tabel bookings supaya bisa dipakai
--    saat membuat policy bookings.
-- ──────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$ language sql security definer stable;


-- ──────────────────────────────────────────────────────────
-- 4. TRIGGER — auto-insert ke profiles saat user baru daftar
-- ──────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    -- Sign up publik tidak kirim 'role' → default 'customer'
    -- Akun admin dibuat manual lewat Supabase Dashboard dengan
    -- metadata: { "role": "admin", "full_name": "Nama Admin" }
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ──────────────────────────────────────────────────────────
-- 5. TABEL BOOKINGS
-- ──────────────────────────────────────────────────────────
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),

  -- Nullable: booking manual oleh admin tidak punya customer_id.
  -- on delete set null: riwayat tidak hilang jika akun customer dihapus.
  customer_id      uuid references auth.users(id) on delete set null,

  customer_name    text not null,
  customer_phone   text not null,
  activity_name    text not null,
  participant_count int  not null default 1 check (participant_count >= 1),
  notes            text,

  booking_date     date not null,
  start_time       time not null,
  end_time         time not null check (end_time > start_time),

  status           text not null default 'pending'
                     check (status in ('pending','confirmed','rejected','cancelled','completed')),

  admin_notes      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index supaya query per tanggal cepat
create index idx_bookings_date on public.bookings (booking_date);

-- ──────────────────────────────────────────────────────────
-- 5a. EXCLUSION CONSTRAINT — cegah bentrok jam di level DB
--     Validasi ini adalah safety net terakhir — tidak boleh
--     hanya mengandalkan cek di frontend (race condition).
--     Berlaku untuk booking berstatus pending & confirmed.
-- ──────────────────────────────────────────────────────────
alter table public.bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    booking_date with =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp
    ) with &&
  )
  where (status in ('pending', 'confirmed'));

-- ──────────────────────────────────────────────────────────
-- 5b. TRIGGER — auto-update kolom updated_at
-- ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();


-- ──────────────────────────────────────────────────────────
-- 5c. ROW LEVEL SECURITY — bookings
-- ──────────────────────────────────────────────────────────
alter table public.bookings enable row level security;

-- INSERT: customer insert booking miliknya sendiri,
--         admin insert booking untuk siapa saja (booking manual).
create policy "bookings: customer insert own, admin insert any"
  on public.bookings for insert
  to authenticated
  with check (customer_id = auth.uid() or public.is_admin());

-- SELECT: customer hanya lihat booking miliknya sendiri,
--         admin lihat semua.
create policy "bookings: customer view own, admin view all"
  on public.bookings for select
  to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- UPDATE: hanya admin (V1 — customer belum bisa batalkan sendiri).
create policy "bookings: admin update"
  on public.bookings for update
  to authenticated
  using (public.is_admin());

-- DELETE: hanya admin.
create policy "bookings: admin delete"
  on public.bookings for delete
  to authenticated
  using (public.is_admin());


-- ──────────────────────────────────────────────────────────
-- 6. VIEW bookings_public — untuk halaman kalender publik
--    TIDAK menyertakan customer_name, customer_phone,
--    customer_id supaya aman diakses tanpa login.
-- ──────────────────────────────────────────────────────────
create view public.bookings_public as
  select
    id,
    activity_name,
    booking_date,
    start_time,
    end_time,
    status,
    created_at
  from public.bookings
  where status in ('pending', 'confirmed');

-- Beri akses SELECT ke anon (pengunjung belum login) dan authenticated
grant select on public.bookings_public to anon, authenticated;


-- ──────────────────────────────────────────────────────────
-- 7. TABEL CLOSED_DATES — jadwal tutup/libur
-- ──────────────────────────────────────────────────────────
create table public.closed_dates (
  id          uuid primary key default gen_random_uuid(),
  closed_date date not null unique,
  reason      text,
  created_at  timestamptz not null default now()
);

-- RLS closed_dates
alter table public.closed_dates enable row level security;

-- Siapa pun bisa lihat jadwal tutup (termasuk anon, untuk cek di kalender)
create policy "closed_dates: anyone can view"
  on public.closed_dates for select
  to anon, authenticated
  using (true);

-- Hanya admin yang bisa insert/update/delete
create policy "closed_dates: admin insert"
  on public.closed_dates for insert
  to authenticated
  with check (public.is_admin());

create policy "closed_dates: admin update"
  on public.closed_dates for update
  to authenticated
  using (public.is_admin());

create policy "closed_dates: admin delete"
  on public.closed_dates for delete
  to authenticated
  using (public.is_admin());


-- ──────────────────────────────────────────────────────────
-- CATATAN MEMBUAT AKUN ADMIN
-- ──────────────────────────────────────────────────────────
-- Cara 1 (lebih mudah — lewat Supabase Dashboard):
--   Authentication → Add User → isi email & password
--   → klik "User Metadata" → masukkan JSON:
--   { "role": "admin", "full_name": "Nama Admin" }
--
-- Cara 2 (jika akun sudah terlanjur dibuat tanpa metadata):
--   Pergi ke Table Editor → profiles → cari baris user tsb
--   → ubah kolom role dari 'customer' menjadi 'admin'
--
-- JANGAN simpan service role key di frontend.
-- Hanya anon key yang boleh ada di .env frontend.
-- ──────────────────────────────────────────────────────────
