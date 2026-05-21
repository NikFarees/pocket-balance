-- Add structured category to investments
ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'trading'
  CHECK (category IN ('trading', 'unit_trust', 'savings'));

-- Auto-map existing rows based on type string
UPDATE investments SET category = CASE
  WHEN lower(type) LIKE '%gold%'                                         THEN 'trading'
  WHEN lower(type) LIKE '%unit trust%' OR lower(type) LIKE '%unit_trust%' THEN 'unit_trust'
  WHEN lower(type) LIKE '%savings%' OR lower(type) LIKE '%tabung%'       THEN 'savings'
  ELSE 'trading'
END;
