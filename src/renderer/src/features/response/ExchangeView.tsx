import type { ExchangeResponse } from '@shared/types/response'
import { formatBytes, formatDuration } from '@shared/utils/format'
import { CodeEditor } from '@/components/CodeEditor'
import { Column } from '@/components/Column'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { cn } from '@/lib/utils'
import { TestResults, TestsLabel } from './TestResults'

function exchangeTabs(response: ExchangeResponse): PanelTab[] {
  const tabs: PanelTab[] = [
    { value: 'body', label: 'Body', content: <ResponseBody response={response} /> },
    { value: 'headers', label: `Headers ${response.headers.length}`, content: <HeaderList response={response} /> }
  ]
  if (response.simulated) return tabs
  return [
    ...tabs,
    { value: 'tests', label: <TestsLabel tests={response.tests} />, content: <TestResults tests={response.tests} /> }
  ]
}

export function ExchangeView({ response }: { response: ExchangeResponse }) {
  return (
    <Column>
      <PanelTabs tabs={exchangeTabs(response)} trailing={<ResponseMeta response={response} />} />
    </Column>
  )
}

function ResponseBody({ response }: { response: ExchangeResponse }) {
  if (!response.error) return <CodeEditor ariaLabel="Response body" readOnly value={response.body} />
  return (
    <div role="alert" className="p-3 text-xs">
      <p className="font-medium text-destructive">Could not get a response</p>
      <p className="mt-1 font-mono break-all text-muted-foreground">{response.error}</p>
    </div>
  )
}

function ResponseMeta({ response }: { response: ExchangeResponse }) {
  const statusTone = response.status > 0 && response.status < 400 ? 'text-success' : 'text-destructive'
  return (
    <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
      <span className={cn(statusTone)}>{response.error ? 'Failed' : `${response.status} ${response.statusText}`}</span>
      <ResponseTime response={response} />
      <span>{formatBytes(response.sizeBytes)}</span>
      {response.simulated && <span className="rounded border px-1.5">simulated</span>}
    </div>
  )
}

function ResponseTime({ response: { durationMs, firstByteMs } }: { response: ExchangeResponse }) {
  const title = firstByteMs === undefined ? undefined : `Time to first byte: ${formatDuration(firstByteMs)}`
  return (
    <span title={title} aria-label={`Response time ${formatDuration(durationMs)}`}>
      {formatDuration(durationMs)}
    </span>
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
