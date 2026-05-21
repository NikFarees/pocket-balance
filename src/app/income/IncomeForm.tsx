'use client'

import { createIncome } from '@/app/actions/income'
import { calcNet, calcStatutory, StatutoryContributions } from '@/lib/statutory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const fmtRM = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function IncomeForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'income' | 'adjustment'>('income')
  const [showStatutory, setShowStatutory] = useState(false)
  const [gross, setGross] = useState('')
  const [contributions, setContributions] = useState<StatutoryContributions>({
    epf_employee: 0, epf_employer: 0,
    socso_employee: 0, socso_employer: 0,
    eis_employee: 0, eis_employer: 0,
    tax_pcb: 0,
  })
  const router = useRouter()
  const today = format(new Date(), 'yyyy-MM-dd')

  function handleGrossChange(val: string) {
    setGross(val)
    const g = parseFloat(val)
    if (!isNaN(g) && g > 0) setContributions(calcStatutory(g))
  }

  function handleContributionChange(field: keyof StatutoryContributions, val: string) {
    setContributions(prev => ({ ...prev, [field]: parseFloat(val) || 0 }))
  }

  function resetForm() {
    setOpen(false)
    setType('income')
    setShowStatutory(false)
    setGross('')
    setContributions({ epf_employee: 0, epf_employer: 0, socso_employee: 0, socso_employer: 0, eis_employee: 0, eis_employer: 0, tax_pcb: 0 })
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    if (type === 'adjustment') {
      const rawAmount = parseFloat(formData.get('amount') as string)
      formData.set('amount', String(-Math.abs(rawAmount)))
    }
    const result = await createIncome(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(type === 'adjustment' ? 'Adjustment added' : 'Income added')
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  const grossNum = parseFloat(gross) || 0
  const netPreview = showStatutory && grossNum > 0
    ? calcNet(grossNum, contributions)
    : null

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Income / Adjustment
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Entry</CardTitle>
        <Button variant="ghost" size="icon" onClick={resetForm}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => { setType('income'); setShowStatutory(false) }}
            className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${type === 'income' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
            Income
          </button>
          <button type="button" onClick={() => { setType('adjustment'); setShowStatutory(false) }}
            className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${type === 'adjustment' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
            Adjustment (deduct)
          </button>
        </div>
        {type === 'adjustment' && (
          <p className="text-xs text-muted-foreground mb-4">Use this to subtract pre-tracking spending or other deductions from your monthly total.</p>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          {/* Hidden gross_amount — empty string = no contributions */}
          <input type="hidden" name="gross_amount" value={showStatutory ? gross : ''} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{showStatutory ? 'Gross Salary (RM)' : 'Amount (RM)'}</Label>
              {showStatutory ? (
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 3500.00"
                  value={gross}
                  onChange={e => handleGrossChange(e.target.value)}
                  required
                />
              ) : (
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 3500.00"
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="income_date">Date</Label>
              <Input id="income_date" name="income_date" type="date" defaultValue={today} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" type="text"
              placeholder={type === 'adjustment' ? 'e.g. Pre-app spending' : 'e.g. Salary, Shopee, Gift'} required />
          </div>

          {/* Statutory contributions toggle — only for income type */}
          {type === 'income' && (
            <button
              type="button"
              onClick={() => setShowStatutory(v => !v)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              {showStatutory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Statutory Contributions (Optional)
            </button>
          )}

          {showStatutory && (
            <div className="rounded-md border p-4 space-y-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Auto-calculated from gross. Edit any field to match your exact payslip.</p>
              {(
                [
                  { key: 'epf', label: 'KWSP (EPF)', empKey: 'epf_employee', erKey: 'epf_employer' },
                  { key: 'socso', label: 'PERKESO (SOCSO)', empKey: 'socso_employee', erKey: 'socso_employer' },
                  { key: 'eis', label: 'SIP (EIS)', empKey: 'eis_employee', erKey: 'eis_employer' },
                ] as const
              ).map(({ key, label, empKey, erKey }) => (
                <div key={key}>
                  <p className="text-xs font-medium mb-1.5">{label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`${key}_employer`} className="text-xs text-muted-foreground">Employer</Label>
                      <Input
                        id={`${key}_employer`}
                        name={erKey}
                        type="number"
                        step="0.01"
                        min="0"
                        value={contributions[erKey].toFixed(2)}
                        onChange={e => handleContributionChange(erKey, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${key}_employee`} className="text-xs text-muted-foreground">Employee</Label>
                      <Input
                        id={`${key}_employee`}
                        name={empKey}
                        type="number"
                        step="0.01"
                        min="0"
                        value={contributions[empKey].toFixed(2)}
                        onChange={e => handleContributionChange(empKey, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {/* PCB — employee only */}
              <div>
                <p className="text-xs font-medium mb-1.5">PCB (Tax)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Employer</Label>
                    <div className="h-10 flex items-center px-3 text-sm text-muted-foreground border rounded-md bg-muted">—</div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tax_pcb" className="text-xs text-muted-foreground">Employee</Label>
                    <Input
                      id="tax_pcb"
                      name="tax_pcb"
                      type="number"
                      step="0.01"
                      min="0"
                      value={contributions.tax_pcb.toFixed(2)}
                      onChange={e => handleContributionChange('tax_pcb', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* Net preview */}
              {netPreview !== null && (
                <div className="flex justify-between items-center pt-2 border-t font-semibold text-sm">
                  <span>Net Salary</span>
                  <span>{fmtRM(netPreview)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" name="notes"
              placeholder={type === 'adjustment' ? 'e.g. First 15 days before I started the app' : 'e.g. May salary including bonus'}
              rows={2} />
          </div>

          <Button type="submit" disabled={loading} variant={type === 'adjustment' ? 'destructive' : 'default'}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : type === 'adjustment' ? 'Add Adjustment' : 'Add Income'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
