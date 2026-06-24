-- Add composite indexes matching real query shapes on growing tables.
-- Each query filters by user_id (RLS) and orders/filters by a date or status column.

CREATE INDEX IF NOT EXISTS idx_investment_transactions_user_date
  ON investment_transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_debts_user_settled
  ON debts (user_id, is_settled);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_renewal
  ON subscriptions (user_id, next_renewal);

CREATE INDEX IF NOT EXISTS idx_backup_fund_transactions_user_date
  ON backup_fund_transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_debt_payments_user_date
  ON debt_payments (user_id, paid_date DESC);
