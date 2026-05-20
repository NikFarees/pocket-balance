import { getDashboardData } from '@/app/actions/dashboard'
import { AppHeader } from '@/components/AppHeader'
import { DeductionRow } from '@/components/dashboard/DeductionRow'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()
  if (!data) return null

  const { salary, currentMonth, deductionsWithStatus, summary } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{currentMonth}</h2>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Salary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {salary ? (
                <p className="text-xl font-bold">RM {Number(salary.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xl font-bold text-muted-foreground">—</p>
                  <Link href="/salary" className="text-xs underline text-muted-foreground hover:text-foreground">Add salary</Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold">RM {summary.totalExpected.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Paid</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-green-600">RM {summary.totalPaid.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {summary.remainingBalance !== null ? (
                <p className={`text-xl font-bold ${summary.remainingBalance < 0 ? 'text-destructive' : ''}`}>
                  RM {summary.remainingBalance.toFixed(2)}
                </p>
              ) : (
                <p className="text-xl font-bold text-muted-foreground">—</p>
              )}
              {summary.totalUnpaid > 0 && (
                <p className="text-xs text-muted-foreground mt-1">RM {summary.totalUnpaid.toFixed(2)} unpaid</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deductions table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Deductions — {currentMonth}</CardTitle>
            <Link href="/deductions" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Manage</Link>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {deductionsWithStatus.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No deductions set up yet.{' '}
                <Link href="/deductions" className="underline">Add one</Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Paid</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionsWithStatus.map((d) => (
                    <DeductionRow key={d.id} deduction={d} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/expenses" className={cn(buttonVariants({ variant: 'default' }))}>Today&apos;s Expenses</Link>
          <Link href="/investments" className={cn(buttonVariants({ variant: 'outline' }))}>Investments</Link>
          <Link href="/backup" className={cn(buttonVariants({ variant: 'outline' }))}>Backup Fund</Link>
        </div>
      </main>
    </div>
  )
}
