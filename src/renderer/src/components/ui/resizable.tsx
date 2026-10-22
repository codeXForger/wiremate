import type { ComponentProps } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

export const ResizablePanel = Panel

export function ResizableGroup({ className, ...props }: ComponentProps<typeof Group>) {
  return <Group className={cn('h-full w-full', className)} {...props} />
}

export function ResizableHandle({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn(
        'bg-border transition-colors hover:bg-primary aria-[orientation=horizontal]:h-px aria-[orientation=vertical]:w-px data-[separator=active]:bg-primary',
        className
      )}
      {...props}
    />
  )
}
