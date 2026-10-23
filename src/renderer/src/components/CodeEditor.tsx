import Editor from '@monaco-editor/react'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface CodeEditorProps {
  value: string
  language?: string
  readOnly?: boolean
  ariaLabel: string
  onChange?: (value: string) => void
}

const BASE_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  fontFamily: 'IBM Plex Mono',
  scrollBeyondLastLine: false,
  automaticLayout: true
}

export function CodeEditor({ value, language = 'json', readOnly, ariaLabel, onChange }: CodeEditorProps) {
  const theme = useWorkspaceStore((state) => (state.theme === 'dark' ? 'wiremate-dark' : 'light'))
  const options = { ...BASE_OPTIONS, readOnly, ariaLabel }
  const handleChange = (next: string | undefined): void => onChange?.(next ?? '')
  return <Editor value={value} language={language} theme={theme} options={options} onChange={handleChange} />
}
