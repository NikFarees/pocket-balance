'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const fmt = (v: number) =>
  'RM ' + v.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md space-y-1">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-muted-foreground">
          {p.name}: <span className="font-semibold" style={{ color: p.color }}>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function IncomeVsExpenseChart({
  data,
}: {
  data: { month: string; income: number; expense: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          axisLine={false}
          tickLine={false}
          tickFormatter={v => 'RM' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={v => <span className="text-muted-foreground">{v}</span>}
        />
        <Bar dataKey="income" name="Income" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Expense" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
