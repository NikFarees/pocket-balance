'use client'

import { addTransaction } from '@/app/actions/investments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

type Category = 'trading' | 'unit_trust' | 'savings'
type TxType = 'buy' | 'sell' | 'dividend'

const TX_CONFIG: Record<Category, { types: TxType[]; labels: Record<TxType, string>; successLabel: Record<TxType, string> }> = {
  trading: {
    types: ['buy', 'sell'],
    labels: { buy: 'Buy', sell: 'Sell', dividend: 'Dividend' },
    successLabel: { buy: 'Purchase', sell: 'Sale', dividend: 'Dividend' },
  },
  unit_trust: {
    types: ['buy', 'sell', 'dividend'],
    labels: { buy: 'Save', sell: 'Redeem', dividend: 'Dividend' },
    successLabel: { buy: 'Saving', sell: 'Redemption', dividend: 'Dividend' },
  },
  savings: {
    types: ['buy', 'sell', 'dividend'],
    labels: { buy: 'Deposit', sell: 'Withdraw', dividend: 'Dividend' },
    successLabel: { buy: 'Deposit', sell: 'Withdrawal', dividend: 'Dividend' },
  },
}

function txButtonClass(type: TxType, active: TxType) {
  const isActive = type === active
  if (type === 'buy') return isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
  if (type === 'sell') return isActive ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'
  return isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
}

export function TransactionForm({ investmentId, category }: { investmentId: string; category: Category }) {
  const config = TX_CONFIG[category]
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TxType>('buy')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await addTransaction(investmentId, formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${config.successLabel[type]} recorded`)
      formRef.current?.reset()
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Transaction
      </Button>
    )
  }

  const showQtyPrice = category === 'trading'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Transaction</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="flex rounded-lg border overflow-hidden w-fit">
            {config.types.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${txButtonClass(t, type)}`}
              >
                {config.labels[t]}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />

          <div className={`grid gap-4 ${showQtyPrice ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input id="amount" name="amount" type="text" inputMode="decimal" placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date</Label>
              <Input id="transaction_date" name="transaction_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            {showQtyPrice && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity <span className="text-muted-foreground">(optional, e.g. grams)</span></Label>
                  <Input id="quantity" name="quantity" type="number" step="0.000001" min="0" placeholder="e.g. 1.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_unit">Price per unit <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="price_per_unit" name="price_per_unit" type="number" step="0.0001" min="0" placeholder="e.g. 380.00" />
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="notes" name="notes" placeholder="optional" />
          </div>
          <Button
            type="submit"
            disabled={loading}
            variant={type === 'sell' ? 'destructive' : 'default'}
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              : `Record ${config.successLabel[type]}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
