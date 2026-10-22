import type { ReactNode } from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

export const TooltipProvider = TooltipPrimitive.Provider

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

interface TooltipProps {
  label: string
  side?: TooltipSide
  children: ReactNode
}

const CONTENT_CLASS = 'z-50 rounded border bg-panel px-2 py-1 text-xs shadow-lg'

export function Tooltip({ label, side = 'right', children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className={CONTENT_CLASS}>
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
