import { getDebts } from '@/app/actions/debts'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DebtForm } from './DebtForm'
import { DebtList } from './DebtList'

export default async function DebtsPage() {
  const data = await getDebts()
  if (!data) return null

  const { iOwe, theyOwe } = data

  const totalIOwe = iOwe.filter(d => !d.is_settled).reduce((s, d) => s + Number(d.amount), 0)
  const totalTheyOwe = theyOwe.filter(d => !d.is_settled).reduce((s, d) => s + Number(d.amount), 0)
  const netPosition = totalTheyOwe - totalIOwe

  const fmt = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Debts</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Owed to Me</p>
              <p className="text-xl font-bold text-green-600 mt-1">RM {fmt(totalTheyOwe)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{theyOwe.filter(d => !d.is_settled).length} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">I Owe</p>
              <p className="text-xl font-bold text-destructive mt-1">RM {fmt(totalIOwe)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{iOwe.filter(d => !d.is_settled).length} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Position</p>
              <p className={`text-xl font-bold mt-1 ${netPosition >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {netPosition >= 0 ? '+' : '−'}RM {fmt(Math.abs(netPosition))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{netPosition >= 0 ? 'in your favour' : 'you owe more'}</p>
            </CardContent>
          </Card>
        </div>

        <DebtForm />

        {/* Owed to Me */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Owed to Me</span>
              <span className="text-sm font-normal text-muted-foreground">{theyOwe.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <DebtList debts={theyOwe} emptyMessage="No one owes you anything yet." />
          </CardContent>
        </Card>

        {/* I Owe */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>I Owe</span>
              <span className="text-sm font-normal text-muted-foreground">{iOwe.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <DebtList debts={iOwe} emptyMessage="You don't owe anyone anything." />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
