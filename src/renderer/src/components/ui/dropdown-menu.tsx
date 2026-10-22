import type { ComponentProps } from 'react'
import { DropdownMenu as Menu } from 'radix-ui'
import { cn } from '@/lib/utils'
import { menuContentClass, menuItemClass, menuSeparatorClass } from './menu-styles'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content sideOffset={4} className={cn(menuContentClass, className)} {...props} />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(menuItemClass, className)} {...props} />
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className={menuSeparatorClass} />
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2 py-1 text-xs text-muted-foreground', className)} {...props} />
}
