-- ============================================================
-- SQL Schema — Eternal Myth Studio / Payout Community
-- Run this in the Supabase SQL Editor.
-- All statements are safe to run multiple times (idempotent).
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- staff_members
-- NOTE: roblox_username_lower is a GENERATED column.
-- Never insert this column from the application layer.
CREATE TABLE IF NOT EXISTS staff_members (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    roblox_username       TEXT        NOT NULL,
    roblox_username_lower TEXT        GENERATED ALWAYS AS (lower(roblox_username)) STORED UNIQUE,
    display_name          TEXT,
    active                BOOLEAN     DEFAULT TRUE,
    note                  TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code           TEXT        UNIQUE NOT NULL,
    roblox_username      TEXT        NOT NULL,
    roblox_username_lower TEXT       NOT NULL,
    display_name         TEXT        NOT NULL,
    robux_amount         INTEGER     NOT NULL,
    verification_status  TEXT        NOT NULL,
    category             TEXT        NOT NULL,
    price_per_robux      INTEGER     NOT NULL,
    total_price          INTEGER     NOT NULL,
    notes                TEXT,
    chat_channel         TEXT        NOT NULL DEFAULT 'whatsapp',
    payment_proof_path   TEXT,
    payment_proof_url    TEXT,
    admin_status         TEXT        DEFAULT 'pending',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    completed_at         TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ
);

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role       TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- app_settings
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DEFAULT SETTINGS
-- Discord URL is a direct DM link to the admin profile.
-- ============================================================
INSERT INTO app_settings (key, value) VALUES
    ('brand_name',     'Eternal Myth Studio'),
    ('subtitle',       'Payout Community'),
    ('whatsapp_number','6281234567890'),
    ('discord_url',    'https://discord.com/users/459376386671509505'),
    ('tiktok_url',     'https://www.tiktok.com/@eternalmyth')
ON CONFLICT (key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE staff_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ADMIN CHECK HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- staff_members
DROP POLICY IF EXISTS "Public read active staff members"  ON staff_members;
DROP POLICY IF EXISTS "Admins can modify staff_members"   ON staff_members;

CREATE POLICY "Public read active staff members" ON staff_members
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can modify staff_members" ON staff_members
    FOR ALL TO authenticated USING (public.is_admin());

-- transactions
DROP POLICY IF EXISTS "Anonymous customer insert transactions"        ON transactions;
DROP POLICY IF EXISTS "Public read transactions by id or order_code"  ON transactions;
DROP POLICY IF EXISTS "Admins can modify transactions"                 ON transactions;

CREATE POLICY "Anonymous customer insert transactions" ON transactions
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public read transactions by id or order_code" ON transactions
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can modify transactions" ON transactions
    FOR ALL TO authenticated USING (public.is_admin());

-- admin_users
DROP POLICY IF EXISTS "Admins read write own admin profile" ON admin_users;

CREATE POLICY "Admins read write own admin profile" ON admin_users
    FOR ALL TO authenticated USING (auth.uid() = id);

-- app_settings
DROP POLICY IF EXISTS "Public read app_settings"    ON app_settings;
DROP POLICY IF EXISTS "Admins can update settings"  ON app_settings;

CREATE POLICY "Public read app_settings" ON app_settings
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can update settings" ON app_settings
    FOR ALL TO authenticated USING (public.is_admin());

-- ============================================================
-- 6. SUPABASE STORAGE — payment-proofs bucket
-- Private bucket: customers upload, admins can read/delete.
-- ============================================================

-- Create / update bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-proofs',
    'payment-proofs',
    false,
    5242880,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public             = false,
    file_size_limit    = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop old / conflicting policies
DROP POLICY IF EXISTS "payment_proofs_anon_insert"        ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_public_insert"       ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload payment proofs"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment proofs"    ON storage.objects;
DROP POLICY IF EXISTS "Admins can read payment proofs"     ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment proofs"   ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_admin_select"        ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_admin_delete"        ON storage.objects;

-- Anyone (anon & authenticated) may upload proofs
CREATE POLICY "payment_proofs_anon_insert"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

-- Only admins may read proofs
CREATE POLICY "payment_proofs_admin_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'payment-proofs'
        AND EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

-- Only admins may delete proofs
CREATE POLICY "payment_proofs_admin_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'payment-proofs'
        AND EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

-- ============================================================
-- 7. RPC FUNCTIONS
-- ============================================================

-- get_order_quote: Estimate price based on customer history
-- Rules:
--   Staff (active)       → Rp100 / Robux
--   Returning customer   → Rp120 / Robux
--   First-time buyer     → Rp100 / Robux
CREATE OR REPLACE FUNCTION get_order_quote(
    p_roblox_username TEXT,
    p_robux_amount    INTEGER
)
RETURNS TABLE (
    category        TEXT,
    price_per_robux INTEGER,
    total_price     INTEGER
) AS $$
DECLARE
    v_category TEXT;
    v_price    INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM staff_members
        WHERE roblox_username_lower = LOWER(p_roblox_username) AND active = TRUE
    ) THEN
        v_category := 'Staff';
        v_price    := 100;
    ELSIF EXISTS (
        SELECT 1 FROM transactions
        WHERE roblox_username_lower = LOWER(p_roblox_username)
          AND admin_status = 'completed'
    ) THEN
        v_category := 'Normal';
        v_price    := 120;
    ELSE
        v_category := 'Pembelian Pertama';
        v_price    := 100;
    END IF;

    RETURN QUERY SELECT v_category, v_price, p_robux_amount * v_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- create_order: Securely insert a transaction.
-- Always recalculates price from DB state — never trusts frontend prices.
-- payment_proof_url may be NULL for private bucket uploads.
CREATE OR REPLACE FUNCTION create_order(
    p_roblox_username     TEXT,
    p_display_name        TEXT,
    p_robux_amount        INTEGER,
    p_verification_status TEXT,
    p_notes               TEXT,
    p_chat_channel        TEXT,
    p_payment_proof_path  TEXT,
    p_payment_proof_url   TEXT DEFAULT NULL
)
RETURNS SETOF transactions AS $$
DECLARE
    v_category  TEXT;
    v_price     INTEGER;
    v_total     INTEGER;
    v_order_code TEXT;
    v_record    transactions;
BEGIN
    -- 1. Get correct quote
    SELECT q.category, q.price_per_robux, q.total_price
    INTO v_category, v_price, v_total
    FROM get_order_quote(p_roblox_username, p_robux_amount) q;

    -- 2. Generate unique EM-XXXX code
    LOOP
        v_order_code := 'EM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM transactions WHERE order_code = v_order_code);
    END LOOP;

    -- 3. Insert
    INSERT INTO transactions (
        order_code,
        roblox_username,
        roblox_username_lower,
        display_name,
        robux_amount,
        verification_status,
        category,
        price_per_robux,
        total_price,
        notes,
        chat_channel,
        payment_proof_path,
        payment_proof_url,
        admin_status,
        created_at
    ) VALUES (
        v_order_code,
        p_roblox_username,
        LOWER(p_roblox_username),
        p_display_name,
        p_robux_amount,
        p_verification_status,
        v_category,
        v_price,
        v_total,
        p_notes,
        p_chat_channel,
        p_payment_proof_path,
        p_payment_proof_url,
        'pending',
        NOW()
    )
    RETURNING * INTO v_record;

    RETURN NEXT v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
