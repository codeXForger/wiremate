import type { HttpScripts, KeyValue } from '@shared/types/protocol'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { KeyValueTable } from '../../request/components/KeyValueTable'
import { useConfigBinder, type Bound } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { AuthPanel } from './AuthPanel'
import { BodyPanel } from './BodyPanel'
import { scriptCount } from './script-phases'
import { ScriptsPanel } from './ScriptsPanel'
import { useUrlParams } from './use-url-params'

function countLabel(label: string, count: number): string {
  return count > 0 ? `${label} ${count}` : label
}

function rowsTab(value: string, label: string, rows: Bound<KeyValue[]>): PanelTab {
  return {
    value,
    label: countLabel(label, rows.value.length),
    content: <KeyValueTable label={label.slice(0, -1)} {...rows} />
  }
}

function scriptsTab(requestId: string, scripts: HttpScripts): PanelTab {
  const label = countLabel('Scripts', scriptCount(scripts))
  return { value: 'scripts', label, className: 'flex flex-col', content: <ScriptsPanel requestId={requestId} /> }
}

export function HttpTabs({ requestId }: EditorProps) {
  const rows = useConfigBinder<'http', KeyValue[]>(requestId)
  const { params } = useUrlParams(requestId)
  const scripts = useConfigBinder<'http', HttpScripts>(requestId)('scripts').value
  const tabs: PanelTab[] = [
    rowsTab('params', 'Params', params),
    rowsTab('headers', 'Headers', rows('headers')),
    { value: 'body', label: 'Body', className: 'flex flex-col', content: <BodyPanel requestId={requestId} /> },
    { value: 'auth', label: 'Auth', content: <AuthPanel requestId={requestId} /> },
    scriptsTab(requestId, scripts)
  ]
  return <PanelTabs tabs={tabs} />
}
