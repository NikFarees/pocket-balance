-- Remaining unindexed foreign keys / user_id filters flagged by the performance advisor,
-- matching the actual query shapes used by the app (server actions filter by user_id
-- plus an order/lookup column; child tables also need their parent FK indexed).

CREATE INDEX IF NOT EXISTS idx_daily_targets_user_effective
  ON daily_targets (user_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_deductions_user_active
  ON deductions (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_deduction_payments_user_month
  ON deduction_payments (user_id, month);

CREATE INDEX IF NOT EXISTS idx_deduction_payments_deduction
  ON deduction_payments (deduction_id);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON expenses (user_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment
  ON investment_transactions (investment_id);

CREATE INDEX IF NOT EXISTS idx_investments_user_name
  ON investments (user_id, name);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt
  ON debt_payments (debt_id);

CREATE INDEX IF NOT EXISTS idx_subscription_renewals_user
  ON subscription_renewals (user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_renewals_subscription
  ON subscription_renewals (subscription_id);
