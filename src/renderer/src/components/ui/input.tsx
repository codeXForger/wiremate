import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'h-8 w-full min-w-0 rounded-md border bg-surface px-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}
