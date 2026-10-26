import { CircleCheck, CircleMinus, CircleX, type LucideIcon } from 'lucide-react'
import type { RequestOutcome } from '@shared/types/suite'

/** Status colours mean status only; each comes with its icon and a label. */
export const OUTCOME_STYLE: Record<RequestOutcome, { label: string; icon: LucideIcon; tone: string; fill: string }> = {
  passed: { label: 'Passed', icon: CircleCheck, tone: 'text-success', fill: 'bg-success' },
  failed: { label: 'Failed', icon: CircleX, tone: 'text-destructive', fill: 'bg-destructive' },
  skipped: {
    label: 'Skipped',
    icon: CircleMinus,
    tone: 'text-[var(--chart-skipped)]',
    fill: 'bg-[var(--chart-skipped)]'
  }
}
