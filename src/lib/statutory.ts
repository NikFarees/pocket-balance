export type StatutoryContributions = {
  epf_employee: number
  epf_employer: number
  socso_employee: number
  socso_employer: number
  eis_employee: number
  eis_employer: number
  tax_pcb: number
}

/**
 * Auto-calculate Malaysian statutory contributions from gross salary.
 * Rates: EPF 11%/13%(≤5k) or 12%(>5k), SOCSO 0.5%/1.75%, EIS 0.2%/0.2%.
 * PCB always 0 — user enters manually from payslip.
 */
export function calcStatutory(gross: number): StatutoryContributions {
  const round2 = (n: number) => Math.round(n * 100) / 100
  return {
    epf_employee:   round2(gross * 0.11),
    epf_employer:   round2(gross * (gross <= 5000 ? 0.13 : 0.12)),
    socso_employee: round2(gross * 0.005),
    socso_employer: round2(gross * 0.0175),
    eis_employee:   round2(gross * 0.002),
    eis_employer:   round2(gross * 0.002),
    tax_pcb:        0,
  }
}

/**
 * Compute net take-home from gross minus employee-side deductions.
 */
export function calcNet(gross: number, c: Omit<StatutoryContributions, 'epf_employer' | 'socso_employer' | 'eis_employer'>): number {
  const round2 = (n: number) => Math.round(n * 100) / 100
  return round2(gross - c.epf_employee - c.socso_employee - c.eis_employee - c.tax_pcb)
}
