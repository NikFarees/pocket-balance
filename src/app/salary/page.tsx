import { getSalaries } from '@/app/actions/salary'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SalaryForm } from './SalaryForm'
import { SalaryHistory } from './SalaryHistory'

export default async function SalaryPage() {
  const salaries = await getSalaries()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Salary Management</h2>
        <SalaryForm />
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <SalaryHistory salaries={salaries} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
