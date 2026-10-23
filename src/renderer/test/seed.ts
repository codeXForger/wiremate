import type { CategoryId } from '@shared/protocols/categories'
import { RequestFactory } from '@shared/protocols/request-factory'
import type { AnyRequest, ProtocolId } from '@shared/types/protocol'
import type { Environment, TreeNode, WorkspaceContent } from '@shared/types/workspace'
import type { WorkspaceSeed } from '@/services/workspace-repository'
import { createKeyValue } from '@shared/utils/key-value'

interface SeedCollection {
  id: string
  name: string
  category: CategoryId
  requests: [ProtocolId, string][]
}

const COLLECTIONS: SeedCollection[] = [
  { id: 'f_api', name: 'Public APIs', category: 'api', requests: [['http', 'List users']] },
  { id: 'f_graphql', name: 'Public GraphQL', category: 'graphql', requests: [['graphql', 'Countries']] },
  { id: 'f_realtime', name: 'Chat', category: 'realtime', requests: [['websocket', 'Echo socket']] },
  { id: 'f_ai', name: 'AI tools', category: 'mcp', requests: [['mcp', 'Everything server']] },
  { id: 'f_iot', name: 'Home sensors', category: 'mqtt', requests: [['mqtt', 'Sensor telemetry']] },
  { id: 'f_orders', name: 'Orders', category: 'kafka', requests: [['kafka', 'Orders topic']] },
  { id: 'f_events', name: 'Billing events', category: 'pubsub', requests: [['rabbitmq', 'Invoice created']] },
  { id: 'f_net', name: 'Local services', category: 'network', requests: [['tcp', 'Echo server']] }
]

function seedCollection({ id, name, category, requests }: SeedCollection): { nodes: TreeNode[]; docs: AnyRequest[] } {
  const docs = requests.map(
    ([protocol, title], index) => ({ ...RequestFactory.create(protocol, title), id: `r_${id}_${index}` }) as AnyRequest
  )
  const folder: TreeNode = { id, parentId: null, kind: 'folder', name, category }
  const children = docs.map((doc): TreeNode => ({
    id: doc.id,
    parentId: id,
    kind: 'request',
    name: doc.name,
    protocol: doc.protocol
  }))
  return { nodes: [folder, ...children], docs }
}

function seedEnvironments(): Environment[] {
  return [
    { id: 'env_local', name: 'Local', variables: [createKeyValue('baseUrl', 'http://localhost:3000')] },
    { id: 'env_staging', name: 'Staging', variables: [createKeyValue('baseUrl', 'https://staging.example.com')] }
  ]
}

/** Test fixture: one collection per section and two environments. The app itself starts empty. */
export function createSeedContent(): WorkspaceContent {
  const seeded = COLLECTIONS.map(seedCollection)
  const docs = seeded.flatMap((entry) => entry.docs)
  return {
    nodes: seeded.flatMap((entry) => entry.nodes),
    requests: Object.fromEntries(docs.map((doc) => [doc.id, doc])),
    environments: seedEnvironments(),
    settings: { theme: 'dark', activeEnvironmentId: 'env_local' }
  }
}

export const DEMO_WORKSPACE = { id: 'ws_demo', name: 'Demo workspace', path: '~/WireMate/demo', lastOpenedAt: 1 }

export function demoSeed(): WorkspaceSeed {
  return { workspace: { ...DEMO_WORKSPACE }, content: createSeedContent() }
}
