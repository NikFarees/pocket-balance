import { getDeductions } from '@/app/actions/deductions'
import { getDeductionHistoryForMonth } from '@/app/actions/dashboard'
import { AppHeader } from '@/components/AppHeader'
import { MonthNav } from '@/components/MonthNav'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { DeductionForm } from './DeductionForm'
import { DeductionList } from './DeductionList'

export default async function DeductionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const defaultMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  const historyMonth = monthParam ?? defaultMonth

  const [deductions, history] = await Promise.all([
    getDeductions(),
    getDeductionHistoryForMonth(historyMonth),
  ])

  const historyItems = history ?? []
  const paidCount = historyItems.filter(d => d.isPaid).length

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Deductions</h2>
        <DeductionForm />
        <Card>
          <CardHeader><CardTitle>All Deductions</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <DeductionList deductions={deductions} />
          </CardContent>
        </Card>

        {/* Payment history by month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-4">
            <div>
              <CardTitle className="text-base">Payment History</CardTitle>
              {historyItems.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{paidCount} of {historyItems.length} paid</p>
              )}
            </div>
            <MonthNav month={historyMonth} />
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No deductions set up.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Paid Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Date Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyItems.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.name}
                        {!d.is_active && <span className="ml-1.5 text-xs text-muted-foreground">(inactive)</span>}
                      </TableCell>
                      <TableCell className="text-right">RM {Number(d.expected_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={d.isPaid ? 'default' : 'outline'} className={d.isPaid ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {d.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-sm">
                        {d.payment ? `RM ${Number(d.payment.paid_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {d.payment ? format(parseISO(d.payment.payment_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
