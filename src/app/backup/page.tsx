import { getBackupData } from '@/app/actions/backup'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { BackupForm } from './BackupForm'
import { BackupHistory } from './BackupHistory'

export default async function BackupFundPage() {
  const data = await getBackupData()
  if (!data) return null

  const { transactions, totalDeposited, totalWithdrawn, balance } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Backup Fund</h2>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Total Deposited</p>
              <p className="text-2xl font-bold text-green-600 mt-1">RM {totalDeposited.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Total Withdrawn</p>
              <p className="text-2xl font-bold text-destructive mt-1">RM {totalWithdrawn.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className={cn(balance > 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : '')}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className={cn('text-2xl font-bold mt-1', balance > 0 ? 'text-green-600' : balance < 0 ? 'text-destructive' : '')}>
                RM {balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <BackupForm />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Transaction History</span>
              <span className="text-sm font-normal text-muted-foreground">{transactions.length} records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BackupHistory transactions={transactions} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
