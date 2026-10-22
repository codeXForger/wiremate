import type { ReactNode } from 'react'

export function SidebarHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b pr-1.5 pl-3">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="flex">{children}</div>
    </div>
  )
}
