-- ============================================================
-- MIGRASI SUPABASE — TOKO SEMBAKO MBAH WIN
-- Jalankan seluruh script ini di Supabase SQL Editor
-- PERHATIAN: DROP tabel lama. Backup data dulu jika perlu!
-- ============================================================

-- 0. Enable pgcrypto untuk hash password
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. DROP tabel lama (urut karena ada foreign key)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS admin_profiles CASCADE;

-- Drop custom types jika sudah ada
DROP TYPE IF EXISTS sale_type_enum CASCADE;
DROP TYPE IF EXISTS delivery_method_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum CASCADE;

-- ============================================================
-- 2. CREATE ENUM TYPES
-- ============================================================
CREATE TYPE sale_type_enum AS ENUM ('online_wa', 'pos');
CREATE TYPE delivery_method_enum AS ENUM ('diantar', 'ambil');
CREATE TYPE payment_method_enum AS ENUM ('tunai', 'qris');
CREATE TYPE order_status_enum AS ENUM (
  'Pending',
  'Sedang Disiapkan',
  'Sedang Dikirim',
  'Siap Diambil',
  'Selesai',
  'Ditolak'
);

-- ============================================================
-- 3. CREATE TABLES
-- ============================================================

-- 3a. categories
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 3b. products
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT REFERENCES categories(name) ON UPDATE CASCADE,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3c. product_variants
CREATE TABLE product_variants (
  id           SERIAL PRIMARY KEY,
  product_id   INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  cost_price   NUMERIC(12,2) DEFAULT 0,
  sell_price   NUMERIC(12,2) DEFAULT 0,
  stock        INT DEFAULT 0,
  min_stock    INT DEFAULT 5
);

-- 3d. customers (no Supabase Auth — custom login via pgcrypto)
CREATE TABLE customers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3e. customer_addresses
CREATE TABLE customer_addresses (
  id          SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT DEFAULT 'Rumah',
  address     TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE
);

-- 3f. admin_profiles (linked to Supabase Auth)
CREATE TABLE admin_profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  email TEXT NOT NULL
);

-- 3g. orders
CREATE TABLE orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT UNIQUE NOT NULL,
  sale_type        sale_type_enum DEFAULT 'online_wa',
  customer_id      UUID REFERENCES customers(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  address          TEXT,
  delivery_method  delivery_method_enum DEFAULT 'diantar',
  payment_method   payment_method_enum DEFAULT 'tunai',
  payment_proof_url TEXT,
  note             TEXT,
  status           order_status_enum DEFAULT 'Pending',
  subtotal         NUMERIC(14,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3h. order_items
CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   INT REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  qty          INT NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL
);

-- 3i. stock_movements
CREATE TABLE stock_movements (
  id         SERIAL PRIMARY KEY,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  change     INT NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RPC FUNCTIONS (SECURITY DEFINER = bypass RLS)
-- ============================================================

-- 4a. register_customer
CREATE OR REPLACE FUNCTION register_customer(
  p_name    TEXT,
  p_phone   TEXT,
  p_password TEXT,
  p_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- cek apakah nomor HP sudah terdaftar
  IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone) THEN
    RETURN json_build_object('error', 'Nomor HP sudah terdaftar');
  END IF;

  -- insert customer
  INSERT INTO customers (name, phone, password_hash)
  VALUES (p_name, p_phone, crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_customer_id;

  -- insert alamat default
  IF p_address IS NOT NULL AND p_address != '' THEN
    INSERT INTO customer_addresses (customer_id, label, address, is_default)
    VALUES (v_customer_id, 'Rumah', p_address, TRUE);
  END IF;

  RETURN json_build_object(
    'id',    v_customer_id,
    'name',  p_name,
    'phone', p_phone
  );
END;
$$;

-- 4b. login_customer
CREATE OR REPLACE FUNCTION login_customer(
  p_phone    TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_customer
  FROM customers
  WHERE phone = p_phone
    AND password_hash = crypt(p_password, password_hash);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Nomor HP atau password salah');
  END IF;

  RETURN json_build_object(
    'id',    v_customer.id,
    'name',  v_customer.name,
    'phone', v_customer.phone
  );
END;
$$;

-- 4c. get_customer_orders
CREATE OR REPLACE FUNCTION get_customer_orders(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',              o.id,
      'order_number',    o.order_number,
      'status',          o.status,
      'sale_type',       o.sale_type,
      'delivery_method', o.delivery_method,
      'payment_method',  o.payment_method,
      'subtotal',        o.subtotal,
      'note',            o.note,
      'address',         o.address,
      'created_at',      o.created_at,
      'items', (
        SELECT json_agg(
          json_build_object(
            'product_name', oi.product_name,
            'variant_name', oi.variant_name,
            'qty',          oi.qty,
            'unit_price',   oi.unit_price
          )
        )
        FROM order_items oi
        WHERE oi.order_id = o.id
      )
    )
    ORDER BY o.created_at DESC
  )
  INTO v_result
  FROM orders o
  WHERE o.customer_id = p_customer_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 4d. get_customer_addresses
CREATE OR REPLACE FUNCTION get_customer_addresses(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',         ca.id,
      'label',      ca.label,
      'address',    ca.address,
      'is_default', ca.is_default
    )
    ORDER BY ca.is_default DESC, ca.id ASC
  )
  INTO v_result
  FROM customer_addresses ca
  WHERE ca.customer_id = p_customer_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 4e. add_customer_address
CREATE OR REPLACE FUNCTION add_customer_address(
  p_customer_id UUID,
  p_label       TEXT,
  p_address     TEXT,
  p_is_default  BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id INT;
BEGIN
  -- kalau default, reset semua dulu
  IF p_is_default THEN
    UPDATE customer_addresses SET is_default = FALSE
    WHERE customer_id = p_customer_id;
  END IF;

  INSERT INTO customer_addresses (customer_id, label, address, is_default)
  VALUES (p_customer_id, p_label, p_address, p_is_default)
  RETURNING id INTO v_new_id;

  RETURN json_build_object('id', v_new_id, 'success', true);
END;
$$;

-- 4f. delete_customer_address
CREATE OR REPLACE FUNCTION delete_customer_address(
  p_customer_id UUID,
  p_address_id  INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM customer_addresses
  WHERE id = p_address_id AND customer_id = p_customer_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4g. create_order (ATOMIK: insert orders + order_items + kurangi stok)
CREATE OR REPLACE FUNCTION create_order(
  p_order_number     TEXT,
  p_sale_type        TEXT,
  p_customer_id      UUID,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_address          TEXT,
  p_delivery_method  TEXT,
  p_payment_method   TEXT,
  p_payment_proof_url TEXT,
  p_note             TEXT,
  p_status           TEXT,
  p_subtotal         NUMERIC,
  p_items            JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item     JSON;
  v_variant_id INT;
  v_qty      INT;
  v_current_stock INT;
BEGIN
  -- 1. Insert order
  INSERT INTO orders (
    order_number, sale_type, customer_id, customer_name, customer_phone,
    address, delivery_method, payment_method, payment_proof_url,
    note, status, subtotal
  )
  VALUES (
    p_order_number,
    p_sale_type::sale_type_enum,
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_address,
    p_delivery_method::delivery_method_enum,
    p_payment_method::payment_method_enum,
    p_payment_proof_url,
    p_note,
    p_status::order_status_enum,
    p_subtotal
  )
  RETURNING id INTO v_order_id;

  -- 2. Loop item dan insert + kurangi stok
  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::INT;
    v_qty        := (v_item->>'qty')::INT;

    -- Cek stok cukup
    SELECT stock INTO v_current_stock
    FROM product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk varian id %', v_variant_id;
    END IF;

    -- Insert order item
    INSERT INTO order_items (order_id, variant_id, product_name, variant_name, qty, unit_price)
    VALUES (
      v_order_id,
      v_variant_id,
      v_item->>'product_name',
      v_item->>'variant_name',
      v_qty,
      (v_item->>'unit_price')::NUMERIC
    );

    -- Kurangi stok
    UPDATE product_variants
    SET stock = stock - v_qty
    WHERE id = v_variant_id;

    -- Catat di stock_movements
    INSERT INTO stock_movements (variant_id, change, reason)
    VALUES (v_variant_id, -v_qty, 'Terjual - Order ' || p_order_number);
  END LOOP;

  RETURN json_build_object(
    'order_id',     v_order_id,
    'order_number', p_order_number,
    'success',      true
  );
END;
$$;

-- 4h. add_stock (untuk restock manual)
CREATE OR REPLACE FUNCTION add_stock(
  p_variant_id INT,
  p_qty        INT,
  p_reason     TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE product_variants
  SET stock = stock + p_qty
  WHERE id = p_variant_id;

  INSERT INTO stock_movements (variant_id, change, reason)
  VALUES (p_variant_id, p_qty, COALESCE(p_reason, 'Restock manual'));

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

-- 5a. categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- 5b. products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- 5c. product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_public_read" ON product_variants FOR SELECT USING (true);
CREATE POLICY "variants_admin_write" ON product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- 5d. customers (hanya via RPC)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_no_direct_access" ON customers FOR ALL USING (false);

-- 5e. customer_addresses (hanya via RPC)
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_no_direct_access" ON customer_addresses FOR ALL USING (false);

-- 5f. admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_profiles_self_read" ON admin_profiles FOR SELECT
  USING (auth.uid() = id);

-- 5g. orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_admin_all" ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
-- Note: customer insert/read lewat RPC (SECURITY DEFINER)

-- 5h. order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- 5i. stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_admin_all" ON stock_movements FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- ============================================================
-- 6. STORAGE BUCKET
-- ============================================================
-- Jalankan ini SETELAH bucket ada (bisa juga buat via Dashboard):
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "payment_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

-- ============================================================
-- 7. SAMPLE DATA (opsional — hapus kalau tidak mau)
-- ============================================================

-- Kategori
INSERT INTO categories (name) VALUES
  ('Beras & Tepung'),
  ('Minyak & Lemak'),
  ('Gula & Pemanis'),
  ('Bumbu & Rempah'),
  ('Minuman'),
  ('Snack & Lain-lain');

-- Produk + Varian
INSERT INTO products (name, category, description, image_url) VALUES
  ('Beras Premium', 'Beras & Tepung', 'Beras putih kualitas premium, pulen dan wangi', null),
  ('Tepung Terigu', 'Beras & Tepung', 'Tepung terigu serbaguna untuk masak & kue', null),
  ('Minyak Goreng', 'Minyak & Lemak', 'Minyak goreng sawit jernih berkualitas', null),
  ('Gula Pasir', 'Gula & Pemanis', 'Gula pasir putih bersih', null),
  ('Garam Halus', 'Bumbu & Rempah', 'Garam halus beryodium', null),
  ('Kecap Manis', 'Bumbu & Rempah', 'Kecap manis legit untuk masakan', null),
  ('Teh Celup', 'Minuman', 'Teh celup wangi, cocok untuk keluarga', null),
  ('Kopi Bubuk', 'Minuman', 'Kopi bubuk robusta pilihan', null);

-- Varian Produk
-- Beras (id=1)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (1, '2 Kg',  28000,  32000, 50, 10),
  (1, '5 Kg',  68000,  75000, 30, 5),
  (1, '10 Kg', 130000, 145000, 20, 5);

-- Tepung (id=2)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (2, '500 gram', 7000,  9000, 40, 10),
  (2, '1 Kg',    13000, 16000, 35, 10);

-- Minyak (id=3)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (3, '1 Liter',  16000, 19000, 60, 15),
  (3, '2 Liter',  30000, 35000, 40, 10),
  (3, '5 Liter',  70000, 80000, 20, 5);

-- Gula (id=4)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (4, '500 gram', 7500,  9500, 50, 10),
  (4, '1 Kg',    14000, 17000, 45, 10);

-- Garam (id=5)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (5, '250 gram', 2500, 3500, 80, 20),
  (5, '500 gram', 4500, 6000, 60, 15);

-- Kecap (id=6)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (6, '135 ml',  6500,  8500, 40, 10),
  (6, '275 ml', 12000, 15000, 35, 8);

-- Teh (id=7)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (7, '25 Sachet', 8000, 10500, 50, 10),
  (7, '50 Sachet', 15000, 19000, 30, 8);

-- Kopi (id=8)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (8, '100 gram', 18000, 23000, 30, 8),
  (8, '200 gram', 34000, 43000, 20, 5);

-- ============================================================
-- SELESAI!
-- 
-- Langkah selanjutnya:
-- 1. Buka Supabase Dashboard → Authentication → Users
-- 2. Klik "Add User" → isi email + password admin
-- 3. Copy UUID user baru tersebut
-- 4. Jalankan query ini (ganti UUID & data sesuai):
--
--    INSERT INTO admin_profiles (id, name, email)
--    VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Nama Admin', 'admin@email.com');
--
-- ============================================================
