import type { KeyValue } from '@shared/types/protocol'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { KeyValueTable } from '../../request/components/KeyValueTable'
import { useConfigBinder, type Bound } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { AuthPanel } from './AuthPanel'
import { BodyPanel } from './BodyPanel'

function countLabel(label: string, rows: KeyValue[]): string {
  return rows.length > 0 ? `${label} ${rows.length}` : label
}

function rowsTab(value: string, label: string, rows: Bound<KeyValue[]>): PanelTab {
  return {
    value,
    label: countLabel(label, rows.value),
    content: <KeyValueTable label={label.slice(0, -1)} {...rows} />
  }
}

export function HttpTabs({ requestId }: EditorProps) {
  const rows = useConfigBinder<'http', KeyValue[]>(requestId)
  const tabs: PanelTab[] = [
    rowsTab('params', 'Params', rows('params')),
    rowsTab('headers', 'Headers', rows('headers')),
    { value: 'body', label: 'Body', className: 'flex flex-col', content: <BodyPanel requestId={requestId} /> },
    { value: 'auth', label: 'Auth', content: <AuthPanel requestId={requestId} /> }
  ]
  return <PanelTabs tabs={tabs} />
}
