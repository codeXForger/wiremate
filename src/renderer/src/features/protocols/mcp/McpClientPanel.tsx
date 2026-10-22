import { Hint } from '@/components/Hint'
import { ConnectBar } from '../../request/components/ConnectBar'
import { useFieldBinder } from '../../request/use-field-binder'
import { useRequestConfig } from '../../request/use-request'
import { useStreamSession } from '../../request/use-request-actions'

const SAMPLE_CAPABILITIES = [
  { group: 'Tools', items: ['echo', 'add', 'longRunningOperation'] },
  { group: 'Resources', items: ['test://static/resource/1'] },
  { group: 'Prompts', items: ['simple_prompt', 'complex_prompt'] }
]

const TARGET = {
  stdio: { key: 'command', label: 'Server command' },
  http: { key: 'url', label: 'Server URL' }
} as const

export function McpClientPanel({ requestId }: { requestId: string }) {
  const target = TARGET[useRequestConfig<'mcp'>(requestId)[0].transport]
  const field = useFieldBinder<'mcp'>(requestId)(target.key)
  const connected = useStreamSession(requestId)?.connected ?? false
  return (
    <>
      <ConnectBar requestId={requestId} label={target.label} {...field} />
      {connected ? <CapabilityList /> : <Hint>Connect to list the server&apos;s tools, resources and prompts.</Hint>}
    </>
  )
}

function CapabilityList() {
  return (
    <div className="grid grid-cols-3 gap-4 p-3">
      {SAMPLE_CAPABILITIES.map(({ group, items }) => (
        <CapabilityGroup key={group} group={group} items={items} />
      ))}
    </div>
  )
}

function CapabilityGroup({ group, items }: { group: string; items: string[] }) {
  return (
    <section aria-label={group}>
      <h3 className="mb-1 text-xs text-muted-foreground">{group}</h3>
      <ul className="font-mono text-xs">
        {items.map((item) => (
          <li key={item} className="truncate py-0.5">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
