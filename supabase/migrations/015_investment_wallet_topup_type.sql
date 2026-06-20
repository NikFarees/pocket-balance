ALTER TABLE investment_transactions
  DROP CONSTRAINT IF EXISTS investment_transactions_type_check,
  ADD CONSTRAINT investment_transactions_type_check
    CHECK (type IN ('buy', 'sell', 'dividend', 'wallet_topup'));
