import type { ComponentProps } from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-4 w-7 shrink-0 items-center rounded-full border bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-3 data-[state=checked]:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  )
}
