import { getDashboardData } from '@/app/actions/dashboard'
import { logout } from '@/app/actions/auth'
import { DeductionRow } from '@/components/dashboard/DeductionRow'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) return null

  const { salary, currentMonth, deductionsWithStatus, summary } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">PocketBalance</h1>
            <p className="text-sm text-muted-foreground">{currentMonth}</p>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/salary" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Salary</Link>
            <Link href="/deductions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Deductions</Link>
            <Link href="/expenses" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Expenses</Link>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Salary</CardTitle>
            </CardHeader>
            <CardContent>
              {salary ? (
                <p className="text-2xl font-bold">RM {Number(salary.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                  <Link href="/salary" className="text-xs underline text-muted-foreground hover:text-foreground">
                    Add salary
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">RM {summary.totalExpected.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">RM {summary.totalPaid.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.remainingBalance !== null ? (
                <p className={`text-2xl font-bold ${summary.remainingBalance < 0 ? 'text-destructive' : ''}`}>
                  RM {summary.remainingBalance.toFixed(2)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-muted-foreground">—</p>
              )}
              {summary.totalUnpaid > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  RM {summary.totalUnpaid.toFixed(2)} unpaid
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deductions table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Deductions — {currentMonth}</CardTitle>
            <Link href="/deductions" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Manage
            </Link>
          </CardHeader>
          <CardContent className="p-0">
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
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
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

        {/* Quick links */}
        <div className="flex gap-3">
          <Link href="/expenses" className={cn(buttonVariants({ variant: 'default' }))}>
            View Today&apos;s Expenses
          </Link>
          <Link href="/settings" className={cn(buttonVariants({ variant: 'outline' }))}>
            Daily Target
          </Link>
        </div>
      </main>
    </div>
  )
}
