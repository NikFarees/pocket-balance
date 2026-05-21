import { getIncomes } from '@/app/actions/income'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IncomeForm } from './IncomeForm'
import { IncomeHistory } from './IncomeHistory'

const fmtRM = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function IncomePage() {
  const incomes = await getIncomes()

  const epfEmployee = incomes.reduce((s, i) => s + Number(i.epf_employee ?? 0), 0)
  const epfEmployer = incomes.reduce((s, i) => s + Number(i.epf_employer ?? 0), 0)
  const epfTotal = epfEmployee + epfEmployer
  const hasEpf = epfTotal > 0

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Income</h2>
        <IncomeForm />

        {hasEpf && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EPF / KWSP Accumulated</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your contribution (employee)</span>
                <span>{fmtRM(epfEmployee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employer&apos;s contribution</span>
                <span>{fmtRM(epfEmployer)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                <span>Total</span>
                <span>{fmtRM(epfTotal)}</span>
              </div>
            </CardContent>
          </Card>
        )}

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
