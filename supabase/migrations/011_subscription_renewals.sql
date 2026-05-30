CREATE TABLE subscription_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renewed_on DATE NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription renewals"
  ON subscription_renewals FOR ALL USING (auth.uid() = user_id);
