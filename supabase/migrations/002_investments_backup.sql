-- Investment accounts (e.g. Maybank Migagold, Public Gold, TNG Go+)
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- e.g. "Gold", "Unit Trust", "E-wallet"
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buy/sell transactions per investment
CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount DECIMAL(12,2) NOT NULL,         -- RM amount
  quantity DECIMAL(14,6),                -- e.g. grams of gold (optional)
  price_per_unit DECIMAL(14,4),          -- price at time (optional)
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup / emergency fund transactions
CREATE TABLE backup_fund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_fund_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their investments" ON investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their investment_transactions" ON investment_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their backup_fund_transactions" ON backup_fund_transactions FOR ALL USING (auth.uid() = user_id);
