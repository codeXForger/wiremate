import type { ComponentProps } from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { menuContentClass, menuItemClass } from './menu-styles'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-8 items-center justify-between gap-2 rounded-md border bg-surface px-2.5 text-[13px] outline-none focus-visible:border-ring',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ className, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content position="popper" sideOffset={4} className={cn(menuContentClass, className)}>
        <SelectPrimitive.Viewport>{props.children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn(menuItemClass, className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
