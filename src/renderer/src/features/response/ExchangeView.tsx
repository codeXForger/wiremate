import type { ExchangeResponse } from '@shared/types/response'
import { formatBytes, formatDuration } from '@shared/utils/format'
import { CodeEditor } from '@/components/CodeEditor'
import { Column } from '@/components/Column'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { cn } from '@/lib/utils'

export function ExchangeView({ response }: { response: ExchangeResponse }) {
  const tabs: PanelTab[] = [
    { value: 'body', label: 'Body', content: <CodeEditor ariaLabel="Response body" readOnly value={response.body} /> },
    { value: 'headers', label: `Headers ${response.headers.length}`, content: <HeaderList response={response} /> }
  ]
  return (
    <Column>
      <PanelTabs tabs={tabs} trailing={<ResponseMeta response={response} />} />
    </Column>
  )
}

function ResponseMeta({ response }: { response: ExchangeResponse }) {
  const statusTone = response.status < 400 ? 'text-success' : 'text-destructive'
  return (
    <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
      <span className={cn(statusTone)}>
        {response.status} {response.statusText}
      </span>
      <span>{formatDuration(response.durationMs)}</span>
      <span>{formatBytes(response.sizeBytes)}</span>
      <span className="rounded border px-1.5">simulated</span>
    </div>
  )
}

function HeaderList({ response }: { response: ExchangeResponse }) {
  return (
    <dl className="grid h-full grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-1 overflow-auto p-3 font-mono text-xs">
      {response.headers.map((header) => [
        <dt key={`${header.id}-key`} className="text-muted-foreground">
          {header.key}
        </dt>,
        <dd key={`${header.id}-value`} className="break-all">
          {header.value}
        </dd>
      ])}
    </dl>
  )
}
