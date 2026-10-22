import type { ComponentProps } from 'react'
import { ContextMenu as Menu } from 'radix-ui'
import { cn } from '@/lib/utils'
import { menuContentClass, menuItemClass, menuSeparatorClass } from './menu-styles'

export const ContextMenu = Menu.Root
export const ContextMenuTrigger = Menu.Trigger

export function ContextMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content className={cn(menuContentClass, className)} {...props} />
    </Menu.Portal>
  )
}

export function ContextMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(menuItemClass, className)} {...props} />
}

export function ContextMenuSeparator() {
  return <Menu.Separator className={menuSeparatorClass} />
}
