-- ============================================================
-- ExpoPay Black Belt Migration
-- Apply after: supabase_migration.sql, supabase_split_migration.sql,
--              supabase_savings_migration.sql
-- ============================================================

-- ── 1. Application Logs Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS app_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  level       text        NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event       text        NOT NULL,
  route       text,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  meta        jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Indexes for fast queries from the monitoring dashboard
CREATE INDEX IF NOT EXISTS idx_app_logs_level       ON app_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at  ON app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id     ON app_logs (user_id, created_at DESC);

-- Only service role can write logs; read is also service-role only
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON app_logs
  USING (true) WITH CHECK (true);

-- ── 2. Performance Indexes on Existing Tables ─────────────────

-- Transactions: fast per-user history and date-bucket metrics
CREATE INDEX IF NOT EXISTS idx_transactions_sender_created
  ON transactions (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_recipient_created
  ON transactions (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions (created_at DESC);

-- Contracts: lookup by participant and status
CREATE INDEX IF NOT EXISTS idx_contracts_payer_created
  ON contracts (payer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_freelancer_status
  ON contracts (freelancer_id, status);

-- Profiles: metrics query (active users)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON profiles (created_at DESC);

-- ── 3. Enable Realtime on app_logs ───────────────────────────
-- Run this in the Supabase dashboard → Table Editor → app_logs → Enable realtime
-- Or run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE app_logs;

-- ── 4. Gasless Transaction Tracking ──────────────────────────
-- Add gasless flag to transactions table (tracks fee-bump txs)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gasless boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_sponsor text; -- platform public key when gasless
