-- ExpoPay SPLIT Feature Migration
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS split_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_universal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  total_amount DECIMAL(18, 7) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XLM',
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID REFERENCES split_bills(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  universal_id TEXT NOT NULL,
  stellar_address TEXT NOT NULL,
  amount_owed DECIMAL(18, 7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  tx_hash TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_split_bills_creator ON split_bills(creator_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_split ON split_participants(split_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_user ON split_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_status ON split_participants(status);

-- RLS Policies
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_participants ENABLE ROW LEVEL SECURITY;

-- Anyone who is creator OR participant can view the split
CREATE POLICY "split_bills_select" ON split_bills FOR SELECT
  USING (
    auth.uid() = creator_id OR
    id IN (SELECT split_id FROM split_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "split_bills_insert" ON split_bills FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "split_bills_update" ON split_bills FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "split_participants_select" ON split_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    split_id IN (SELECT id FROM split_bills WHERE creator_id = auth.uid())
  );

CREATE POLICY "split_participants_update" ON split_participants FOR UPDATE
  USING (user_id = auth.uid());
