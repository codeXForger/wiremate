import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, type TooltipSide } from '@/components/ui/tooltip'

interface IconButtonProps extends ComponentProps<'button'> {
  label: string
  icon: LucideIcon
  side?: TooltipSide
}

export function IconButton({ label, icon: Icon, side = 'bottom', ...props }: IconButtonProps) {
  return (
    <Tooltip label={label} side={side}>
      <Button variant="ghost" size="icon" aria-label={label} {...props}>
        <Icon />
      </Button>
    </Tooltip>
  )
}
