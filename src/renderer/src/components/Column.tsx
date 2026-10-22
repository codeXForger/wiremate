import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Full-height vertical stack: the basic layout unit of every pane. */
export function Column({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex h-full min-h-0 flex-col', className)} {...props} />
}
