-- ============================================================
-- MIGRASI SUPABASE — BAKOEL UMPLUK
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
DROP TABLE IF EXISTS store_settings CASCADE;

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
CREATE TYPE payment_method_enum AS ENUM ('tunai', 'qris', 'transfer_bank');
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
  email TEXT NOT NULL,
  role  TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee'))
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
-- 6. STORE SETTINGS TABLE (QRIS image, bank info, WA number)
-- ============================================================
CREATE TABLE store_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_settings_public_read" ON store_settings FOR SELECT USING (true);
CREATE POLICY "store_settings_admin_write" ON store_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

INSERT INTO store_settings (key, value) VALUES
  ('qris_image_url', ''),
  ('bank_name', 'BNI'),
  ('bank_number', '0244501044'),
  ('bank_holder', 'Silvia'),
  ('wa_number', '6285742860240')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. RPC: get_best_sellers — untuk badge "Terlaris" di katalog
-- ============================================================
CREATE OR REPLACE FUNCTION get_best_sellers(p_limit INT DEFAULT 6)
RETURNS TABLE (product_id INT, total_qty BIGINT)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS product_id, SUM(oi.qty)::BIGINT AS total_qty
  FROM order_items oi
  JOIN product_variants pv ON pv.id = oi.variant_id
  JOIN products p ON p.id = pv.product_id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status <> 'Ditolak'
  GROUP BY p.id
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_best_sellers(INT) TO anon, authenticated;

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================
-- Bukti pembayaran pelanggan (QRIS/Transfer)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "payment_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

-- Gambar produk (diupload admin lewat dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "product_images_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "product_images_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- Aset toko: gambar QRIS, dll (diupload admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "store_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "store_assets_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-assets' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "store_assets_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-assets' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- ============================================================
-- 9. SAMPLE DATA (opsional — hapus kalau tidak mau)
-- ============================================================

-- Kategori
INSERT INTO categories (name) VALUES
  ('Deterjen Cuci'),
  ('Sabun Cuci Piring'),
  ('Pelembut & Pewangi Pakaian'),
  ('Pembersih Lantai & Kamar Mandi'),
  ('Sabun & Perawatan Tubuh'),
  ('Lain-lain');

-- Produk + Varian
INSERT INTO products (name, category, description, image_url) VALUES
  ('Deterjen Bubuk',        'Deterjen Cuci',                  'Deterjen bubuk daya cuci kuat, wangi tahan lama', null),
  ('Deterjen Cair',         'Deterjen Cuci',                  'Deterjen cair konsentrat untuk mesin cuci & manual', null),
  ('Sabun Cuci Piring Cair','Sabun Cuci Piring',              'Sabun cuci piring cair, ampuh angkat lemak & bau amis', null),
  ('Sabun Colek',           'Sabun Cuci Piring',              'Sabun colek serbaguna untuk cuci piring & perkakas dapur', null),
  ('Pelembut & Pewangi Pakaian', 'Pelembut & Pewangi Pakaian','Pelembut pakaian dengan wangi tahan lama seharian', null),
  ('Pewangi Laundry',       'Pelembut & Pewangi Pakaian',     'Pewangi pakaian konsentrat, cukup sedikit sudah wangi', null),
  ('Pembersih Lantai',      'Pembersih Lantai & Kamar Mandi', 'Cairan pel lantai, membunuh kuman & wangi segar', null),
  ('Pembersih Kamar Mandi', 'Pembersih Lantai & Kamar Mandi', 'Pembersih & pewangi kamar mandi, angkat kerak & noda', null),
  ('Sabun Mandi Batang',    'Sabun & Perawatan Tubuh',        'Sabun mandi batang untuk kulit bersih & segar', null),
  ('Sabun Mandi Cair',      'Sabun & Perawatan Tubuh',        'Sabun mandi cair melembutkan & melembabkan kulit', null);

-- Varian Produk
-- Deterjen Bubuk (id=1)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (1, '800 gram', 12000, 15000, 50, 10),
  (1, '1.8 Kg',   24000, 29000, 30, 5);

-- Deterjen Cair (id=2)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (2, '800 ml', 16000, 20000, 40, 10),
  (2, '1.8 L',  32000, 39000, 25, 5);

-- Sabun Cuci Piring Cair (id=3)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (3, '400 ml', 6500,  8500, 60, 15),
  (3, '800 ml', 12000, 15500, 35, 10);

-- Sabun Colek (id=4)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (4, '500 gram', 5000, 6500, 50, 10);

-- Pelembut & Pewangi Pakaian (id=5)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (5, '300 ml', 9000,  11500, 45, 10),
  (5, '750 ml', 18000, 23000, 30, 8);

-- Pewangi Laundry (id=6)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (6, '300 ml', 10000, 13000, 35, 8);

-- Pembersih Lantai (id=7)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (7, '750 ml', 10000, 13500, 40, 10),
  (7, '1.5 L',  18000, 24000, 25, 5);

-- Pembersih Kamar Mandi (id=8)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (8, '500 ml', 9500,  12500, 30, 8);

-- Sabun Mandi Batang (id=9)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (9, '1 pcs (85g)', 2500, 3500, 100, 20),
  (9, '3 pcs Pak',   7000, 9500,  50, 10);

-- Sabun Mandi Cair (id=10)
INSERT INTO product_variants (product_id, variant_name, cost_price, sell_price, stock, min_stock) VALUES
  (10, '250 ml', 9000,  12000, 40, 10),
  (10, '450 ml', 15000, 19500, 25, 5);

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
