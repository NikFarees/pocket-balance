ALTER TABLE incomes
  ADD COLUMN gross_amount    NUMERIC(12, 2),
  ADD COLUMN epf_employee    NUMERIC(12, 2),
  ADD COLUMN epf_employer    NUMERIC(12, 2),
  ADD COLUMN socso_employee  NUMERIC(12, 2),
  ADD COLUMN socso_employer  NUMERIC(12, 2),
  ADD COLUMN eis_employee    NUMERIC(12, 2),
  ADD COLUMN eis_employer    NUMERIC(12, 2),
  ADD COLUMN tax_pcb         NUMERIC(12, 2);
