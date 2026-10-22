import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Hint({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('p-3 text-xs text-muted-foreground', className)} {...props} />
}
