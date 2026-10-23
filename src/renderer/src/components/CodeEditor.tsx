import { useId } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useEditorVariables } from '@/features/variables/use-editor-variables'
import { VariablePopover } from '@/features/variables/VariablePopover'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface CodeEditorProps {
  value: string
  language?: string
  readOnly?: boolean
  ariaLabel: string
  onChange?: (value: string) => void
  /** Colour `{{variables}}` and show their values on hover or click. */
  highlightVariables?: boolean
}

const BASE_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  fontFamily: 'IBM Plex Mono',
  scrollBeyondLastLine: false,
  automaticLayout: true
}

export function CodeEditor({ highlightVariables = false, ...props }: CodeEditorProps) {
  const variables = useEditorVariables(highlightVariables)
  const owner = useId()
  return (
    <div data-variable-field={owner} className="h-full">
      <MonacoEditor {...props} onMount={variables.onMount} />
      {highlightVariables && <VariablePopover popover={variables.popover} owner={owner} />}
    </div>
  )
}

type MonacoProps = CodeEditorProps & { onMount?: OnMount }

function MonacoEditor({ language = 'json', readOnly, ariaLabel, onChange, ...rest }: MonacoProps) {
  const theme = useWorkspaceStore((state) => (state.theme === 'dark' ? 'wiremate-dark' : 'light'))
  const options = { ...BASE_OPTIONS, readOnly, ariaLabel }
  const handleChange = (next: string | undefined): void => onChange?.(next ?? '')
  return <Editor {...rest} language={language} theme={theme} options={options} onChange={handleChange} />
}
