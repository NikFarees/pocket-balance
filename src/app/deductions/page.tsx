import { getDeductions } from '@/app/actions/deductions'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeductionForm } from './DeductionForm'
import { DeductionList } from './DeductionList'

export default async function DeductionsPage() {
  const deductions = await getDeductions()

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
      </main>
    </div>
  )
}
