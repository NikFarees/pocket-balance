import { getInvestmentWithTransactions } from '@/app/actions/investments'
import { AppHeader } from '@/components/AppHeader'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'

export default async function InvestmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getInvestmentWithTransactions(id)
  if (!data) notFound()

  const { investment, transactions, summary } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{investment.name}</h2>
              {investment.type && <Badge variant="secondary">{investment.type}</Badge>}
              {!investment.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
            {investment.notes && <p className="text-sm text-muted-foreground mt-1">{investment.notes}</p>}
          </div>
          <Link href="/investments" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}>
            ← All Investments
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Total Bought</p>
              <p className="text-xl font-bold text-green-600 mt-1">RM {summary.totalBought.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Total Sold</p>
              <p className="text-xl font-bold text-destructive mt-1">RM {summary.totalSold.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Net Invested</p>
              <p className="text-xl font-bold mt-1">RM {summary.netInvested.toFixed(2)}</p>
            </CardContent>
          </Card>
          {summary.hasQuantity && (
            <>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-xs text-muted-foreground">Total Qty Bought</p>
                  <p className="text-xl font-bold mt-1">{summary.totalQtyBought.toFixed(4)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-xs text-muted-foreground">Total Qty Sold</p>
                  <p className="text-xl font-bold mt-1">{summary.totalQtySold.toFixed(4)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-xs text-muted-foreground">Net Holding</p>
                  <p className="text-xl font-bold mt-1">{summary.netQty.toFixed(4)}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <TransactionForm investmentId={id} />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Transaction History</span>
              <span className="text-sm font-normal text-muted-foreground">{transactions.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionList transactions={transactions} investmentId={id} hasQuantity={summary.hasQuantity} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
