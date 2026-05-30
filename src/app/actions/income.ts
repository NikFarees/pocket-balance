'use server'

import { createClient } from '@/lib/supabase/server'
import { calcNet } from '@/lib/statutory'
import { exceedsLength, MAX_LONG_TEXT, MAX_SHORT_TEXT } from '@/lib/validation'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getIncomes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .order('income_date', { ascending: false })

  return data ?? []
}

export async function getIncomesForMonth(month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const monthStart = format(startOfMonth(parseISO(month)), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parseISO(month)), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .gte('income_date', monthStart)
    .lte('income_date', monthEnd)
    .order('income_date', { ascending: false })

  return data ?? []
}

export async function createIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const source = (formData.get('source') as string)?.trim()
  const income_date = formData.get('income_date') as string
  const notes = (formData.get('notes') as string) || null

  if (!source) return { error: 'Enter a source' }
  if (!income_date) return { error: 'Select a date' }
  if (exceedsLength(source, MAX_SHORT_TEXT)) return { error: 'Source is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const grossRaw = formData.get('gross_amount') as string | null
  const hasContributions = !!grossRaw && grossRaw !== ''

  let amount: number
  let contributionFields: Record<string, number | null> = {
    gross_amount: null, epf_employee: null, epf_employer: null,
    socso_employee: null, socso_employer: null,
    eis_employee: null, eis_employer: null, tax_pcb: null,
  }

  let other_deductions: { label: string; amount: number }[] = []
  try {
    const raw = formData.get('other_deductions') as string | null
    if (raw) other_deductions = JSON.parse(raw)
  } catch { /* ignore bad JSON */ }

  if (hasContributions) {
    const gross = parseFloat(grossRaw!)
    if (isNaN(gross) || gross <= 0) return { error: 'Enter a valid gross amount' }

    const epf_employee   = parseFloat(formData.get('epf_employee') as string) || 0
    const epf_employer   = parseFloat(formData.get('epf_employer') as string) || 0
    const socso_employee = parseFloat(formData.get('socso_employee') as string) || 0
    const socso_employer = parseFloat(formData.get('socso_employer') as string) || 0
    const eis_employee   = parseFloat(formData.get('eis_employee') as string) || 0
    const eis_employer   = parseFloat(formData.get('eis_employer') as string) || 0
    const tax_pcb        = parseFloat(formData.get('tax_pcb') as string) || 0
    const otherTotal     = other_deductions.reduce((s, d) => s + d.amount, 0)

    amount = calcNet(gross, { epf_employee, socso_employee, eis_employee, tax_pcb }, otherTotal)
    contributionFields = { gross_amount: gross, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, tax_pcb }
  } else {
    const amountRaw = parseFloat(formData.get('amount') as string)
    if (isNaN(amountRaw) || amountRaw === 0) return { error: 'Enter a valid amount' }
    amount = amountRaw
  }

  const { error } = await supabase.from('incomes').insert({
    user_id: user.id, amount, source, income_date, notes, other_deductions, ...contributionFields,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}

export async function updateIncome(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const source = (formData.get('source') as string)?.trim()
  const income_date = formData.get('income_date') as string
  const notes = (formData.get('notes') as string) || null

  if (!source) return { error: 'Enter a source' }
  if (!income_date) return { error: 'Select a date' }
  if (exceedsLength(source, MAX_SHORT_TEXT)) return { error: 'Source is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const grossRaw = formData.get('gross_amount') as string | null
  const hasContributions = !!grossRaw && grossRaw !== ''

  let amount: number
  let contributionFields: Record<string, number | null> = {
    gross_amount: null, epf_employee: null, epf_employer: null,
    socso_employee: null, socso_employer: null,
    eis_employee: null, eis_employer: null, tax_pcb: null,
  }

  let other_deductions: { label: string; amount: number }[] = []
  try {
    const raw = formData.get('other_deductions') as string | null
    if (raw) other_deductions = JSON.parse(raw)
  } catch { /* ignore bad JSON */ }

  if (hasContributions) {
    const gross = parseFloat(grossRaw!)
    if (isNaN(gross) || gross <= 0) return { error: 'Enter a valid gross amount' }

    const epf_employee   = parseFloat(formData.get('epf_employee') as string) || 0
    const epf_employer   = parseFloat(formData.get('epf_employer') as string) || 0
    const socso_employee = parseFloat(formData.get('socso_employee') as string) || 0
    const socso_employer = parseFloat(formData.get('socso_employer') as string) || 0
    const eis_employee   = parseFloat(formData.get('eis_employee') as string) || 0
    const eis_employer   = parseFloat(formData.get('eis_employer') as string) || 0
    const tax_pcb        = parseFloat(formData.get('tax_pcb') as string) || 0
    const otherTotal     = other_deductions.reduce((s, d) => s + d.amount, 0)

    amount = calcNet(gross, { epf_employee, socso_employee, eis_employee, tax_pcb }, otherTotal)
    contributionFields = { gross_amount: gross, epf_employee, epf_employer, socso_employee, socso_employer, eis_employee, eis_employer, tax_pcb }
  } else {
    const amountRaw = parseFloat(formData.get('amount') as string)
    if (isNaN(amountRaw) || amountRaw === 0) return { error: 'Enter a valid amount' }
    amount = amountRaw
  }

  const { error } = await supabase
    .from('incomes')
    .update({ amount, source, income_date, notes, other_deductions, updated_at: new Date().toISOString(), ...contributionFields })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}
