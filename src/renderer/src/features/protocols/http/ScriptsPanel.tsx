import type { HttpScripts } from '@shared/types/protocol'
import { CodePane } from '@/components/CodePane'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { useConfigBinder, type Bound } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { SCRIPT_PHASES, type ScriptPhaseInfo } from './script-phases'

export function ScriptsPanel({ requestId }: EditorProps) {
  const scripts = useConfigBinder<'http', HttpScripts>(requestId)('scripts')
  const tabs: PanelTab[] = SCRIPT_PHASES.map((phase) => ({
    value: phase.key,
    label: phase.label,
    className: 'flex flex-col',
    content: <ScriptEditor phase={phase} {...scripts} />
  }))
  return <PanelTabs tabs={tabs} />
}

function ScriptEditor({ phase, value, onChange }: Bound<HttpScripts> & { phase: ScriptPhaseInfo }) {
  const setCode = (code: string): void => onChange({ ...value, [phase.key]: code })
  return (
    <Column>
      <Hint className="py-1.5">{phase.hint} console.log output goes to the Console.</Hint>
      <CodePane title={`${phase.label} script`} language="javascript" value={value[phase.key]} onChange={setCode} />
    </Column>
  )
}
