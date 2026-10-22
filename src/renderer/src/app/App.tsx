import '@/features/protocols'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppDialogs } from './AppDialogs'
import { AppShell } from './AppShell'
import { useBootstrap } from './use-bootstrap'
import { useShortcuts } from './use-shortcuts'
import { useApplyTheme } from './use-theme'

export function App() {
  useBootstrap()
  useApplyTheme()
  useShortcuts()
  return (
    <TooltipProvider delayDuration={400}>
      <AppShell />
      <AppDialogs />
    </TooltipProvider>
  )
}
