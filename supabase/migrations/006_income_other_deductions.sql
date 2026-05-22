ALTER TABLE incomes ADD COLUMN other_deductions JSONB DEFAULT '[]'::jsonb;
