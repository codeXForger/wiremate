import type { ReactNode } from 'react'
import { Hint } from '@/components/Hint'

export function OptionsPanel({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="h-full overflow-auto">
      {children}
      <Hint>Options apply when the socket opens. {hint}</Hint>
    </div>
  )
}
