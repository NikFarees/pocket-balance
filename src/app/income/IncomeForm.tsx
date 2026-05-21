'use client'

import { createIncome } from '@/app/actions/income'
import { calcNet, calcStatutory } from '@/lib/statutory'
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

type ContribStrings = {
  epf_employee: string; epf_employer: string
  socso_employee: string; socso_employer: string
  eis_employee: string; eis_employer: string
  tax_pcb: string
}
type OtherDeduction = { id: string; label: string; amount: string }

const initContribs = (): ContribStrings => ({
  epf_employee: '0', epf_employer: '0',
  socso_employee: '0', socso_employer: '0',
  eis_employee: '0', eis_employer: '0',
  tax_pcb: '0',
})

export function IncomeForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'income' | 'adjustment'>('income')
  const [showStatutory, setShowStatutory] = useState(false)
  const [gross, setGross] = useState('')
  const [contributions, setContributions] = useState<ContribStrings>(initContribs)
  const [otherDeductions, setOtherDeductions] = useState<OtherDeduction[]>([])
  const router = useRouter()
  const today = format(new Date(), 'yyyy-MM-dd')

  function handleGrossChange(val: string) {
    setGross(val)
    const g = parseFloat(val)
    if (!isNaN(g) && g > 0) {
      const c = calcStatutory(g)
      setContributions({
        epf_employee:   String(c.epf_employee),
        epf_employer:   String(c.epf_employer),
        socso_employee: String(c.socso_employee),
        socso_employer: String(c.socso_employer),
        eis_employee:   String(c.eis_employee),
        eis_employer:   String(c.eis_employer),
        tax_pcb:        String(c.tax_pcb),
      })
    }
  }

  function addOtherDeduction() {
    setOtherDeductions(prev => [...prev, { id: crypto.randomUUID(), label: '', amount: '' }])
  }
  function updateOtherDeduction(id: string, field: 'label' | 'amount', val: string) {
    setOtherDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d))
  }
  function removeOtherDeduction(id: string) {
    setOtherDeductions(prev => prev.filter(d => d.id !== id))
  }

  function resetForm() {
    setOpen(false)
    setType('income')
    setShowStatutory(false)
    setGross('')
    setContributions(initContribs())
    setOtherDeductions([])
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    if (type === 'adjustment') {
      const rawAmount = parseFloat(formData.get('amount') as string)
      formData.set('amount', String(-Math.abs(rawAmount)))
    }
    // Serialize other deductions to JSON
    const validOther = otherDeductions
      .map(d => ({ label: d.label.trim(), amount: parseFloat(d.amount) || 0 }))
      .filter(d => d.label && d.amount > 0)
    formData.set('other_deductions', JSON.stringify(validOther))

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
  const parsedC = {
    epf_employee:   parseFloat(contributions.epf_employee) || 0,
    socso_employee: parseFloat(contributions.socso_employee) || 0,
    eis_employee:   parseFloat(contributions.eis_employee) || 0,
    tax_pcb:        parseFloat(contributions.tax_pcb) || 0,
  }
  const otherTotal = otherDeductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
  const netPreview = showStatutory && grossNum > 0 ? calcNet(grossNum, parsedC, otherTotal) : null

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
          <input type="hidden" name="gross_amount" value={showStatutory ? gross : ''} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{showStatutory ? 'Gross Salary (RM)' : 'Amount (RM)'}</Label>
              {showStatutory ? (
                <Input id="amount" name="amount" type="text" inputMode="decimal"
                  placeholder="e.g. 3500.00" value={gross}
                  onChange={e => handleGrossChange(e.target.value)} required />
              ) : (
                <Input id="amount" name="amount" type="text" inputMode="decimal"
                  placeholder="e.g. 3500.00" required />
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

          {type === 'income' && (
            <button type="button" onClick={() => setShowStatutory(v => !v)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              {showStatutory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Statutory Contributions (Optional)
            </button>
          )}

          {showStatutory && (
            <div className="rounded-md border p-4 space-y-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Auto-calculated from gross. Edit any field to match your exact payslip.</p>

              {([
                { key: 'epf',   label: 'KWSP (EPF)',        empKey: 'epf_employee',   erKey: 'epf_employer'   },
                { key: 'socso', label: 'PERKESO (SOCSO)',   empKey: 'socso_employee', erKey: 'socso_employer' },
                { key: 'eis',   label: 'SIP (EIS)',         empKey: 'eis_employee',   erKey: 'eis_employer'   },
              ] as const).map(({ key, label, empKey, erKey }) => (
                <div key={key}>
                  <p className="text-xs font-medium mb-1.5">{label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Employer</Label>
                      <Input name={erKey} type="text" inputMode="decimal"
                        value={contributions[erKey]}
                        onChange={e => setContributions(prev => ({ ...prev, [erKey]: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Employee</Label>
                      <Input name={empKey} type="text" inputMode="decimal"
                        value={contributions[empKey]}
                        onChange={e => setContributions(prev => ({ ...prev, [empKey]: e.target.value }))} />
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <p className="text-xs font-medium mb-1.5">PCB (Tax)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Employer</Label>
                    <div className="h-10 flex items-center px-3 text-sm text-muted-foreground border rounded-md bg-muted">—</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Employee</Label>
                    <Input name="tax_pcb" type="text" inputMode="decimal"
                      value={contributions.tax_pcb}
                      onChange={e => setContributions(prev => ({ ...prev, tax_pcb: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Other deductions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Other Deductions</p>
                  <button type="button" onClick={addOtherDeduction}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="size-3" /> Add
                  </button>
                </div>
                {otherDeductions.length === 0 && (
                  <p className="text-xs text-muted-foreground">e.g. Unpaid leave, salary advance</p>
                )}
                <div className="space-y-2">
                  {otherDeductions.map(d => (
                    <div key={d.id} className="flex gap-2 items-center">
                      <Input type="text" placeholder="Description" value={d.label}
                        onChange={e => updateOtherDeduction(d.id, 'label', e.target.value)}
                        className="flex-1 text-sm" />
                      <Input type="text" inputMode="decimal" placeholder="0.00" value={d.amount}
                        onChange={e => updateOtherDeduction(d.id, 'amount', e.target.value)}
                        className="w-24 text-sm" />
                      <button type="button" onClick={() => removeOtherDeduction(d.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

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
