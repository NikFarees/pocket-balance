import { getInvestments } from '@/app/actions/investments'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InvestmentList } from './InvestmentList'
import { CreateInvestmentForm } from './CreateInvestmentForm'

export default async function InvestmentsPage() {
  const investments = await getInvestments()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Investments</h2>
        <CreateInvestmentForm />
        <Card>
          <CardHeader><CardTitle>All Accounts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <InvestmentList investments={investments} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
