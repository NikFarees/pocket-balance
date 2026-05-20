CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('i_owe', 'they_owe')),
  person_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their debts" ON debts FOR ALL USING (auth.uid() = user_id);
