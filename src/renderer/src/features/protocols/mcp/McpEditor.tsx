import type { McpMode, McpTransport } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { OptionSelect } from '../../request/components/OptionSelect'
import { useConfigBinder, type Bound } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { McpClientPanel } from './McpClientPanel'

const MODES: readonly McpMode[] = ['client', 'server']
const TRANSPORTS: readonly McpTransport[] = ['stdio', 'http']
const MODE_LABEL: Record<McpMode, string> = { client: 'Connect to a server', server: 'Host a mock server' }

export function McpEditor({ requestId }: EditorProps) {
  const mode = useConfigBinder<'mcp', McpMode>(requestId)('mode')
  const transport = useConfigBinder<'mcp', McpTransport>(requestId)('transport')
  return (
    <Column>
      <McpToolbar mode={mode} transport={transport} />
      {mode.value === 'client' ? <McpClientPanel requestId={requestId} /> : <McpServerPlaceholder />}
    </Column>
  )
}

function McpToolbar({ mode, transport }: { mode: Bound<McpMode>; transport: Bound<McpTransport> }) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <OptionSelect label="Mode" className="w-48 text-xs" options={MODES} format={(m) => MODE_LABEL[m]} {...mode} />
      <OptionSelect label="Transport" className="w-28 text-xs" options={TRANSPORTS} {...transport} />
    </div>
  )
}

function McpServerPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-start gap-1 p-6">
      <p className="font-medium">Mock server mode</p>
      <p className="max-w-md text-xs text-muted-foreground">
        Define tools, resources and prompts that a client can call. This mode arrives with the MCP feature branch.
      </p>
    </div>
  )
}
