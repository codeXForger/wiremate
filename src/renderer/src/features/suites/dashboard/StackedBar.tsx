import type { LucideIcon } from 'lucide-react'

export interface BarSegment {
  label: string
  value: number
  /** A background colour class for the segment's fill. */
  fill: string
  /** A text colour class for the icon in the legend; the label itself stays in text colour. */
  tone: string
  icon: LucideIcon
}

interface StackedBarProps {
  title: string
  segments: BarSegment[]
  /** The whole the segments are part of; anything left over shows as the empty track (e.g. not run yet). */
  total: number
}

/**
 * Part-to-whole as one thin horizontal bar. Segments sit on a 2px gap; the legend carries an icon, label and count
 * for each, so the bar never relies on colour alone.
 */
export function StackedBar({ title, segments, total }: StackedBarProps) {
  const description = segments.map((segment) => `${segment.value} ${segment.label.toLowerCase()}`).join(', ')
  const visible = segments.filter((segment) => segment.value > 0)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{title}</span>
      <div role="img" aria-label={`${title}: ${description}`} className={TRACK_CLASS}>
        {visible.map((segment) => (
          <Segment key={segment.label} segment={segment} total={total} />
        ))}
      </div>
      <Legend segments={segments} />
    </div>
  )
}

const TRACK_CLASS = 'flex h-2.5 gap-0.5 overflow-hidden rounded bg-surface'

/** Rounded only at the bar's two ends; the 2px gap, not a border, separates neighbours. */
function Segment({ segment, total }: { segment: BarSegment; total: number }) {
  const width = `${(segment.value / Math.max(total, 1)) * 100}%`
  const className = `h-full first:rounded-l last:rounded-r ${segment.fill}`
  return <span title={`${segment.label}: ${segment.value}`} className={className} style={{ width }} />
}

function Legend({ segments }: { segments: BarSegment[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {segments.map(({ label, value, tone, icon: Icon }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon aria-hidden className={`size-3.5 ${tone}`} />
          <span>{label}</span>
          <span className="font-medium">{value}</span>
        </li>
      ))}
    </ul>
  )
}
