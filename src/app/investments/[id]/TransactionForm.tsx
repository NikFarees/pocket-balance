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
type TxType = 'buy' | 'sell' | 'dividend' | 'wallet_topup'

const TX_CONFIG: Record<Category, { types: TxType[]; labels: Record<TxType, string>; successLabel: Record<TxType, string> }> = {
  trading: {
    types: ['wallet_topup', 'buy', 'sell'],
    labels: { wallet_topup: 'Top Up Wallet', buy: 'Buy', sell: 'Sell', dividend: 'Dividend' },
    successLabel: { wallet_topup: 'Wallet Top Up', buy: 'Purchase', sell: 'Sale', dividend: 'Dividend' },
  },
  unit_trust: {
    types: ['buy', 'sell', 'dividend'],
    labels: { wallet_topup: 'Top Up', buy: 'Save', sell: 'Redeem', dividend: 'Dividend' },
    successLabel: { wallet_topup: 'Top Up', buy: 'Saving', sell: 'Redemption', dividend: 'Dividend' },
  },
  savings: {
    types: ['buy', 'sell', 'dividend'],
    labels: { wallet_topup: 'Top Up', buy: 'Deposit', sell: 'Withdraw', dividend: 'Dividend' },
    successLabel: { wallet_topup: 'Top Up', buy: 'Deposit', sell: 'Withdrawal', dividend: 'Dividend' },
  },
}

function txButtonClass(type: TxType, active: TxType) {
  const isActive = type === active
  if (type === 'wallet_topup') return isActive ? 'bg-blue-600 text-white' : 'hover:bg-muted'
  if (type === 'buy') return isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
  if (type === 'sell') return isActive ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'
  return isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
}

export function TransactionForm({ investmentId, category }: { investmentId: string; category: Category }) {
  const config = TX_CONFIG[category]
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TxType>(config.types[0])
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [fees, setFees] = useState('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function net(a: string, f: string) {
    const av = parseFloat(a)
    const fv = parseFloat(f) || 0
    return isNaN(av) ? NaN : av - fv
  }

  function recalcFromNet(a: string, f: string, q: string, p: string) {
    const n = net(a, f)
    if (isNaN(n) || n <= 0) return
    const qv = parseFloat(q)
    const pv = parseFloat(p)
    if (!isNaN(qv) && qv > 0) setPrice(String(n / qv))
    else if (!isNaN(pv) && pv > 0) setQty(String(n / pv))
  }

  function handleAmountChange(val: string) {
    setAmount(val)
    recalcFromNet(val, fees, qty, price)
  }

  function handleFeesChange(val: string) {
    setFees(val)
    recalcFromNet(amount, val, qty, price)
  }

  function handleQtyChange(val: string) {
    setQty(val)
    const qv = parseFloat(val)
    const n = net(amount, fees)
    if (!isNaN(qv) && qv > 0 && !isNaN(n) && n > 0) setPrice(String(n / qv))
  }

  function handlePriceChange(val: string) {
    setPrice(val)
    const pv = parseFloat(val)
    const n = net(amount, fees)
    if (!isNaN(pv) && pv > 0 && !isNaN(n) && n > 0) setQty(String(n / pv))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await addTransaction(investmentId, formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${config.successLabel[type]} recorded`)
      formRef.current?.reset()
      setAmount('')
      setFees('')
      setQty('')
      setPrice('')
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

  const showQtyPrice = category === 'trading' && type !== 'wallet_topup'
  const showFees = type !== 'dividend'

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input
                id="amount" name="amount" type="text" inputMode="decimal"
                placeholder="0.00" required
                value={amount}
                onChange={e => handleAmountChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date</Label>
              <Input id="transaction_date" name="transaction_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            {showFees && (
              <div className="space-y-2">
                <Label htmlFor="fees">Fees Paid (RM) <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="fees" name="fees" type="text" inputMode="decimal"
                  placeholder="0.00"
                  value={fees}
                  onChange={e => handleFeesChange(e.target.value)}
                />
              </div>
            )}
            {showFees && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Net (after fees)</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm tabular-nums">
                  {(() => { const n = net(amount, fees); return (!isNaN(n) && amount) ? `RM ${n.toFixed(2)}` : '—' })()}
                </div>
              </div>
            )}
            {showQtyPrice && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="quantity" name="quantity" type="text" inputMode="decimal"
                    placeholder="e.g. 1.5"
                    value={qty}
                    onChange={e => handleQtyChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_unit">Price/unit <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="price_per_unit" name="price_per_unit" type="text" inputMode="decimal"
                    placeholder="e.g. 380.00"
                    value={price}
                    onChange={e => handlePriceChange(e.target.value)}
                  />
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
