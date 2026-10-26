import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useApplyTheme(): void {
  const theme = useWorkspaceStore((state) => state.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
