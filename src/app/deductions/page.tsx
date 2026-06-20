import { getDeductions } from '@/app/actions/deductions'
import { getDeductionHistoryForMonth } from '@/app/actions/dashboard'
import { Amount } from '@/components/Amount'
import { AppHeader } from '@/components/AppHeader'
import { MonthNav } from '@/components/MonthNav'
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
  const paidItems = historyItems.filter(d => d.isPaid)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Liabilities</h2>
        <DeductionForm />
        <Card>
          <CardHeader><CardTitle>All Liabilities</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <DeductionList deductions={deductions} />
          </CardContent>
        </Card>

        {/* Payment history by month */}
        <Card>
          <CardHeader className="py-4 px-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Payment History</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {paidItems.length} {paidItems.length === 1 ? 'entry' : 'entries'} recorded
                </p>
              </div>
              <MonthNav month={historyMonth} />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {paidItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payments recorded for this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Date Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidItems.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.name}
                        {!d.is_active && <span className="ml-1.5 text-xs text-muted-foreground">(inactive)</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        <Amount value={Number(d.expected_amount)} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <Amount value={Number(d.payment!.paid_amount)} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(parseISO(d.payment!.payment_date), 'dd MMM yyyy')}
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
