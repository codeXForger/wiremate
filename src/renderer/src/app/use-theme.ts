import { useEffect } from 'react'
import { useUiStore } from '@/stores/ui-store'

export function useApplyTheme(): void {
  const theme = useUiStore((state) => state.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
