import { CircleCheck, CircleX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type Toast } from '@/stores/toast-store'
import { IconButton } from './IconButton'

/** Where toasts appear: the bottom right corner, above the status bar. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  return (
    <ol
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-10 z-50 flex w-96 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  )
}

const ITEM_CLASS = 'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-panel p-3 text-xs shadow-lg'

const TONE = {
  success: { icon: CircleCheck, colour: 'text-success', role: 'status' },
  error: { icon: CircleX, colour: 'text-destructive', role: 'alert' }
} as const

function ToastItem({ toast }: { toast: Toast }) {
  const { icon: Icon, colour, role } = TONE[toast.tone]
  return (
    <li role={role} className={ITEM_CLASS}>
      <Icon aria-hidden className={cn('mt-px size-4 shrink-0', colour)} />
      <div className="min-w-0 flex-1 select-text">
        <p className="font-medium">{toast.title}</p>
        {toast.detail && <p className="mt-0.5 font-mono break-all text-muted-foreground">{toast.detail}</p>}
      </div>
      <IconButton label="Dismiss" icon={X} onClick={() => useToastStore.getState().dismiss(toast.id)} />
    </li>
  )
}
