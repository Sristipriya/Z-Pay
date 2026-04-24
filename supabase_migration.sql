-- ============================================================
-- ExpoPay — Complete Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  universal_id        TEXT        UNIQUE,
  display_name        TEXT,
  full_name           TEXT,
  stellar_address     TEXT,
  stellar_secret      TEXT,
  app_pin             TEXT,
  preferred_currency  TEXT        DEFAULT 'XLM',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns just in case the table already existed before this script
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stellar_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stellar_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_pin TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'XLM';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_universal_id_idx ON profiles(universal_id);
CREATE INDEX IF NOT EXISTS profiles_stellar_address_idx ON profiles(stellar_address);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id                UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sender_universal_id      TEXT,
  recipient_universal_id   TEXT,
  amount                   NUMERIC(20, 7) NOT NULL,
  currency                 TEXT        DEFAULT 'XLM',
  tx_hash                  TEXT        UNIQUE,
  status                   TEXT        DEFAULT 'pending'
                                         CHECK (status IN ('pending','completed','failed')),
  note                     TEXT,
  purpose                  TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS transactions_sender_idx    ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS transactions_recipient_idx ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS transactions_created_idx   ON transactions(created_at DESC);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);


-- ────────────────────────────────────────────────────────────
-- 3. CONTRACTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  payer_id                    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  freelancer_id               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  payer_universal_id          TEXT        NOT NULL,
  freelancer_universal_id     TEXT        NOT NULL,
  payer_stellar_address       TEXT,
  freelancer_stellar_address  TEXT,

  -- On-chain
  escrow_id                   BIGINT,
  tx_hash_create              TEXT,
  tx_hash_deliver             TEXT,
  tx_hash_release             TEXT,
  tx_hash_refund              TEXT,
  tx_hash_dispute             TEXT,

  -- Contract details
  title                       TEXT        NOT NULL,
  description                 TEXT,
  amount                      NUMERIC(20, 7) NOT NULL,
  currency                    TEXT        DEFAULT 'XLM',
  expiry_timestamp            BIGINT,      -- Unix seconds

  -- State machine
  status                      TEXT        DEFAULT 'funded'
                                            CHECK (status IN (
                                              'created','funded','delivered',
                                              'released','disputed','refunded','cancelled'
                                            )),

  -- Dispute tracking
  dispute_reason              TEXT,
  disputed_by                 TEXT        CHECK (disputed_by IN ('payer','freelancer')),
  -- TRUE when payer disputes a contract that was already in 'delivered' state.
  -- Blocks payer self-refund to prevent "get work for free" attack.
  dispute_after_delivery      BOOLEAN     DEFAULT FALSE,

  -- Timestamps
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  funded_at                   TIMESTAMPTZ,
  delivered_at                TIMESTAMPTZ,
  released_at                 TIMESTAMPTZ,
  disputed_at                 TIMESTAMPTZ,
  refunded_at                 TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS contracts_payer_idx      ON contracts(payer_id);
CREATE INDEX IF NOT EXISTS contracts_freelancer_idx ON contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx     ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_created_idx    ON contracts(created_at DESC);

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contract parties can view" ON contracts;
CREATE POLICY "Contract parties can view"
  ON contracts FOR SELECT
  USING (auth.uid() = payer_id OR auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Contract parties can update" ON contracts;
CREATE POLICY "Contract parties can update"
  ON contracts FOR UPDATE
  USING (auth.uid() = payer_id OR auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Authenticated users can create contracts" ON contracts;
CREATE POLICY "Authenticated users can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = payer_id);


-- ────────────────────────────────────────────────────────────
-- 4. SERVICE ROLE BYPASS (for server-side API using supabaseAdmin)
-- The supabaseAdmin client uses the service_role key which
-- bypasses RLS automatically — no additional policy needed.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 5. GRANT USAGE (standard Supabase setup)
-- ────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
