import { getDeductions } from '@/app/actions/deductions'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { DeductionForm } from './DeductionForm'
import { DeductionList } from './DeductionList'

export default async function DeductionsPage() {
  const deductions = await getDeductions()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Dashboard
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-lg font-semibold">Deductions</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <DeductionForm />

        <Card>
          <CardHeader>
            <CardTitle>All Deductions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DeductionList deductions={deductions} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
