import { getSalaries } from '@/app/actions/salary'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { SalaryForm } from './SalaryForm'
import { SalaryHistory } from './SalaryHistory'

export default async function SalaryPage() {
  const salaries = await getSalaries()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Dashboard
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-lg font-semibold">Salary Management</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <SalaryForm />

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SalaryHistory salaries={salaries} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
