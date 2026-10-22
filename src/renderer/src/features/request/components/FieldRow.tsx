import type { ReactNode } from 'react'

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 border-b p-3">{children}</div>
}
