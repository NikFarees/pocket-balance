'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const fmt = (v: number) =>
  'RM ' + v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{payload[0].name}</p>
      <p className="text-muted-foreground">{fmt(payload[0].value)}</p>
    </div>
  )
}

export function CategoryBreakdownChart({ data }: { data: { category: string; total: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        No expenses this month
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-center">
      <div className="shrink-0">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={72}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0">
        {data.slice(0, 7).map((item, i) => (
          <li key={item.category} className="flex items-center gap-2 text-xs min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="truncate text-muted-foreground flex-1">{item.category}</span>
            <span className="font-medium tabular-nums shrink-0">
              {fmt(item.total)}
            </span>
          </li>
        ))}
        {data.length > 7 && (
          <li className="text-xs text-muted-foreground pl-4">+{data.length - 7} more</li>
        )}
      </ul>
    </div>
  )
}
