import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  detail?: ReactNode
}

/** One headline number: a sentence-case label, the value, and a line of context under it. */
export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1 rounded-lg border bg-panel px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
      {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
    </div>
  )
}
