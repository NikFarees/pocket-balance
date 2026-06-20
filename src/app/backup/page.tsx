import { getBackupData } from '@/app/actions/backup'
import { Amount } from '@/components/Amount'
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
          <Card className="border-success/25 bg-success/8 dark:bg-success/12 dark:border-success/22">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-success/80 uppercase tracking-wider">Total Deposited</p>
              <p className="font-heading text-2xl font-bold tabular-nums text-success text-glow mt-1"><Amount value={totalDeposited} /></p>
            </CardContent>
          </Card>
          <Card className="border-destructive/25 bg-destructive/6 dark:bg-destructive/12 dark:border-destructive/22">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-destructive/80 uppercase tracking-wider">Total Withdrawn</p>
              <p className="font-heading text-2xl font-bold tabular-nums text-destructive mt-1"><Amount value={totalWithdrawn} /></p>
            </CardContent>
          </Card>
          <Card className={cn(balance > 0 ? 'border-success/25 bg-success/8 dark:bg-success/12 dark:border-success/22' : '')}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Balance</p>
              <p className={cn('font-heading text-2xl font-bold tabular-nums mt-1', balance > 0 ? 'text-success text-glow' : balance < 0 ? 'text-destructive text-glow' : '')}>
                <Amount value={balance} />
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
