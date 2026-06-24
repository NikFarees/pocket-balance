import { getDebts } from '@/app/actions/debts'
import { Amount } from '@/components/Amount'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DebtForm } from './DebtForm'
import { DebtList } from './DebtList'

export default async function DebtsPage() {
  const data = await getDebts()
  if (!data) return null

  const { iOwe, theyOwe } = data

  const totalIOwe = iOwe.filter(d => !d.is_settled).reduce((s, d) => s + d.remaining, 0)
  const totalTheyOwe = theyOwe.filter(d => !d.is_settled).reduce((s, d) => s + d.remaining, 0)
  const netPosition = totalTheyOwe - totalIOwe

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Debts</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-success/30 bg-success/10 dark:bg-success/12 dark:border-success/22">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-success/80 uppercase tracking-wider">Owed to Me</p>
              <p className="font-heading text-2xl font-bold tabular-nums text-success text-glow mt-1"><Amount value={totalTheyOwe} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">{theyOwe.filter(d => !d.is_settled).length} pending</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/25 bg-destructive/8 dark:bg-destructive/12 dark:border-destructive/22">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-destructive/80 uppercase tracking-wider">I Owe</p>
              <p className="font-heading text-2xl font-bold tabular-nums text-destructive text-glow mt-1"><Amount value={totalIOwe} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">{iOwe.filter(d => !d.is_settled).length} pending</p>
            </CardContent>
          </Card>
          <Card className={netPosition >= 0 ? 'border-success/30 bg-success/10 dark:bg-success/12 dark:border-success/22' : 'border-destructive/25 bg-destructive/8 dark:bg-destructive/12 dark:border-destructive/22'}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className={`text-xs font-medium uppercase tracking-wider ${netPosition >= 0 ? 'text-success/80' : 'text-destructive/80'}`}>Net Position</p>
              <p className={`font-heading text-2xl font-bold tabular-nums text-glow mt-1 ${netPosition >= 0 ? 'text-success' : 'text-destructive'}`}>
                <Amount value={netPosition >= 0 ? netPosition : -netPosition} sign={netPosition >= 0 ? '+' : '−'} />
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
