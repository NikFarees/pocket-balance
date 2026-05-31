CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  source TEXT NOT NULL,
  income_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incomes_user_date ON incomes(user_id, income_date DESC);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incomes_user_access" ON incomes FOR ALL USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salaries') THEN
    INSERT INTO incomes (user_id, amount, source, income_date, notes, created_at, updated_at)
    SELECT user_id, amount, 'Salary', month, notes, created_at, COALESCE(updated_at, created_at)
    FROM salaries;
    DROP TABLE salaries;
  END IF;
END $$;
