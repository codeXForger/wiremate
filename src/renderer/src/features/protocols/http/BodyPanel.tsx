import type { BodyMode, HttpConfig } from '@shared/types/protocol'
import { CodeEditor } from '@/components/CodeEditor'
import { Hint } from '@/components/Hint'
import { OptionSelect } from '../../request/components/OptionSelect'
import { useConfigBinder, type Bound } from '../../request/use-field-binder'
import type { EditorProps } from '../types'

type HttpBody = HttpConfig['body']

const BODY_MODES: readonly BodyMode[] = ['none', 'json', 'text']
const LANGUAGE: Record<BodyMode, string> = { none: 'plaintext', json: 'json', text: 'plaintext' }

export function BodyPanel({ requestId }: EditorProps) {
  const body = useConfigBinder<'http', HttpBody>(requestId)('body')
  return (
    <>
      <BodyModeSelect {...body} />
      {body.value.mode === 'none' ? <Hint className="pt-0">This request has no body.</Hint> : <BodyEditor {...body} />}
    </>
  )
}

function BodyModeSelect({ value, onChange }: Bound<HttpBody>) {
  const setMode = (mode: BodyMode): void => onChange({ ...value, mode })
  return (
    <div className="px-3 py-2">
      <OptionSelect
        label="Body type"
        className="w-28 text-xs"
        options={BODY_MODES}
        value={value.mode}
        onChange={setMode}
      />
    </div>
  )
}

function BodyEditor({ value, onChange }: Bound<HttpBody>) {
  const setContent = (content: string): void => onChange({ ...value, content })
  return (
    <div className="min-h-0 flex-1">
      <CodeEditor
        ariaLabel="Request body"
        highlightVariables
        language={LANGUAGE[value.mode]}
        value={value.content}
        onChange={setContent}
      />
    </div>
  )
}
