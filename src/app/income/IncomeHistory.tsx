'use client'

import { deleteIncome, updateIncome } from '@/app/actions/income'
import { calcNet, calcStatutory, StatutoryContributions } from '@/lib/statutory'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10
const fmtRM = (n: number) => `RM ${Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtAmt = (amount: number) => (amount < 0 ? `-${fmtRM(amount)}` : fmtRM(amount))

type Income = {
  id: string
  amount: number
  source: string
  income_date: string
  notes: string | null
  gross_amount: number | null
  epf_employee: number | null
  epf_employer: number | null
  socso_employee: number | null
  socso_employer: number | null
  eis_employee: number | null
  eis_employer: number | null
  tax_pcb: number | null
}

function PayslipTable({ item }: { item: Income }) {
  if (!item.gross_amount) return null
  const g = Number(item.gross_amount)
  const ee = Number(item.epf_employee ?? 0)
  const er = Number(item.epf_employer ?? 0)
  const se = Number(item.socso_employee ?? 0)
  const sr = Number(item.socso_employer ?? 0)
  const ie = Number(item.eis_employee ?? 0)
  const ir = Number(item.eis_employer ?? 0)
  const pcb = Number(item.tax_pcb ?? 0)
  const totalEmpDeductions = ee + se + ie + pcb
  const rows = [
    { label: 'KWSP (EPF)', employer: er, employee: ee, total: ee + er },
    { label: 'PERKESO (SOCSO)', employer: sr, employee: se, total: se + sr },
    { label: 'SIP (EIS)', employer: ir, employee: ie, total: ie + ir },
    { label: 'PCB (Tax)', employer: null, employee: pcb, total: pcb },
  ]
  return (
    <div className="mt-3 rounded-md border overflow-hidden text-sm">
      <div className="flex justify-between px-3 py-2 bg-muted/50 font-medium">
        <span>Basic Salary</span>
        <span>{fmtRM(g)}</span>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground flex justify-between border-b">
        <span>Statutory Deductions</span>
        <span>({fmtRM(totalEmpDeductions)})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Item</th>
              <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Employer</th>
              <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Employee</th>
              <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="px-3 py-1.5">{r.label}</td>
                <td className="px-3 py-1.5 text-right">{r.employer !== null ? r.employer.toFixed(2) : '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.employee.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right">{r.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between px-3 py-2 bg-muted/50 font-semibold border-t">
        <span>Net Salary</span>
        <span>{fmtRM(Number(item.amount))}</span>
      </div>
    </div>
  )
}

export function IncomeHistory({ incomes }: { incomes: Income[] }) {
  const [viewItem, setViewItem] = useState<Income | null>(null)
  const [editItem, setEditItem] = useState<Income | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editType, setEditType] = useState<'income' | 'adjustment'>('income')
  const [editShowStatutory, setEditShowStatutory] = useState(false)
  const [editGross, setEditGross] = useState('')
  const [editContributions, setEditContributions] = useState<StatutoryContributions>({
    epf_employee: 0, epf_employer: 0, socso_employee: 0, socso_employer: 0,
    eis_employee: 0, eis_employer: 0, tax_pcb: 0,
  })
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(incomes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = incomes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function openEdit(item: Income) {
    const isAdj = Number(item.amount) < 0 && !item.gross_amount
    setEditType(isAdj ? 'adjustment' : 'income')
    const hasStatutory = !!item.gross_amount
    setEditShowStatutory(hasStatutory)
    setEditGross(hasStatutory ? String(item.gross_amount) : '')
    setEditContributions({
      epf_employee:   Number(item.epf_employee ?? 0),
      epf_employer:   Number(item.epf_employer ?? 0),
      socso_employee: Number(item.socso_employee ?? 0),
      socso_employer: Number(item.socso_employer ?? 0),
      eis_employee:   Number(item.eis_employee ?? 0),
      eis_employer:   Number(item.eis_employer ?? 0),
      tax_pcb:        Number(item.tax_pcb ?? 0),
    })
    setEditItem(item)
  }

  function handleEditGrossChange(val: string) {
    setEditGross(val)
    const g = parseFloat(val)
    if (!isNaN(g) && g > 0) setEditContributions(calcStatutory(g))
  }

  function handleEditContributionChange(field: keyof StatutoryContributions, val: string) {
    setEditContributions(prev => ({ ...prev, [field]: parseFloat(val) || 0 }))
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteIncome(id)
    if (result.error) toast.error(result.error)
    else { toast.success('Entry deleted'); router.refresh() }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    if (editType === 'adjustment') {
      const rawAmount = parseFloat(formData.get('amount') as string)
      formData.set('amount', String(-Math.abs(rawAmount)))
    }
    const result = await updateIncome(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else { toast.success('Entry updated'); setEditItem(null); router.refresh() }
    setEditLoading(false)
  }

  const editGrossNum = parseFloat(editGross) || 0
  const editNetPreview = editShowStatutory && editGrossNum > 0
    ? calcNet(editGrossNum, editContributions)
    : null

  if (incomes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No entries yet. Add one above.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setViewItem(item)}>
            <div className="min-w-0">
              <p className="font-medium text-sm">{item.source}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(item.income_date), 'd MMM yyyy')}</p>
              {item.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                {item.gross_amount ? (
                  <>
                    <p className="font-semibold text-sm">{fmtRM(Number(item.gross_amount))}</p>
                    <p className="text-xs text-muted-foreground">Net: {fmtRM(Number(item.amount))}</p>
                  </>
                ) : (
                  <p className={cn('font-semibold text-sm', Number(item.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(item.amount))}</p>
                )}
              </div>
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                    <Settings2 className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item.id)} disabled={loadingId === item.id}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => setViewItem(item)}>
                <TableCell className="font-medium">{format(parseISO(item.income_date), 'd MMM yyyy')}</TableCell>
                <TableCell>{item.source}</TableCell>
                <TableCell className="text-right">
                  {item.gross_amount ? (
                    <div>
                      <p>{fmtRM(Number(item.gross_amount))}</p>
                      <p className="text-xs text-muted-foreground">Net: {fmtRM(Number(item.amount))}</p>
                    </div>
                  ) : (
                    <span className={cn(Number(item.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(item.amount))}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.notes ?? '—'}</TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger onClick={(ev) => ev.stopPropagation()} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                      <Settings2 className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item.id)} disabled={loadingId === item.id}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* View dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Income Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm font-medium">{format(parseISO(viewItem.income_date), 'd MMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Source</span><span className="text-sm font-medium">{viewItem.source}</span></div>
              {!viewItem.gross_amount && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className={cn('text-sm font-semibold', Number(viewItem.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(viewItem.amount))}</span></div>
              )}
              {viewItem.notes && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes}</span></div>}
              <PayslipTable item={viewItem} />
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Entry</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <input type="hidden" name="gross_amount" value={editShowStatutory ? editGross : ''} />
              {/* Type toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditType('income') }}
                  className={cn('flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors', editType === 'income' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted')}>
                  Income
                </button>
                <button type="button" onClick={() => { setEditType('adjustment'); setEditShowStatutory(false) }}
                  className={cn('flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors', editType === 'adjustment' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-input bg-background text-muted-foreground hover:bg-muted')}>
                  Adjustment
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">{editShowStatutory ? 'Gross Salary (RM)' : 'Amount (RM)'}</Label>
                  {editShowStatutory ? (
                    <Input id="edit_amount" name="amount" type="number" step="0.01" min="0.01"
                      value={editGross} onChange={e => handleEditGrossChange(e.target.value)} required />
                  ) : (
                    <Input id="edit_amount" name="amount" type="number" step="0.01" min="0.01"
                      defaultValue={Math.abs(Number(editItem.amount)).toFixed(2)} required />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_income_date">Date</Label>
                  <Input id="edit_income_date" name="income_date" type="date" defaultValue={editItem.income_date} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_source">Source</Label>
                <Input id="edit_source" name="source" defaultValue={editItem.source} required />
              </div>

              {editType === 'income' && (
                <button type="button" onClick={() => setEditShowStatutory(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                  {editShowStatutory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  Statutory Contributions (Optional)
                </button>
              )}

              {editShowStatutory && (
                <div className="rounded-md border p-4 space-y-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Edit any field to match your payslip.</p>
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
                          <Label htmlFor={`edit_${key}_employer`} className="text-xs text-muted-foreground">Employer</Label>
                          <Input id={`edit_${key}_employer`} name={erKey} type="number" step="0.01" min="0"
                            value={editContributions[erKey].toFixed(2)} onChange={e => handleEditContributionChange(erKey, e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`edit_${key}_employee`} className="text-xs text-muted-foreground">Employee</Label>
                          <Input id={`edit_${key}_employee`} name={empKey} type="number" step="0.01" min="0"
                            value={editContributions[empKey].toFixed(2)} onChange={e => handleEditContributionChange(empKey, e.target.value)} />
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
                        <Label htmlFor="edit_tax_pcb" className="text-xs text-muted-foreground">Employee</Label>
                        <Input id="edit_tax_pcb" name="tax_pcb" type="number" step="0.01" min="0"
                          value={editContributions.tax_pcb.toFixed(2)} onChange={e => handleEditContributionChange('tax_pcb', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  {editNetPreview !== null && (
                    <div className="flex justify-between items-center pt-2 border-t font-semibold text-sm">
                      <span>Net Salary</span>
                      <span>{fmtRM(editNetPreview)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea id="edit_notes" name="notes" defaultValue={editItem.notes ?? ''} rows={2} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
