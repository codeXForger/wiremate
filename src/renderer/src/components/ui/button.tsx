import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border bg-surface text-foreground hover:bg-border/60',
        ghost: 'text-muted-foreground hover:bg-surface hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90'
      },
      size: { sm: 'h-7 px-2.5 text-xs', md: 'h-8 px-3 text-[13px]', icon: 'size-7' }
    },
    defaultVariants: { variant: 'secondary', size: 'md' }
  }
)

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
