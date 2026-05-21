import { getIncomes } from '@/app/actions/income'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IncomeForm } from './IncomeForm'
import { IncomeHistory } from './IncomeHistory'

export default async function IncomePage() {
  const incomes = await getIncomes()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Income</h2>
        <IncomeForm />
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <IncomeHistory incomes={incomes} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
