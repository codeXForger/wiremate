import { RequestFactory } from '@shared/protocols/request-factory'
import type { AnyRequest } from '@shared/types/protocol'
import type { Environment, TreeNode, WorkspaceContent } from '@shared/types/workspace'
import { createKeyValue } from '@shared/utils/key-value'

function folder(id: string, name: string, parentId: string | null = null): TreeNode {
  return { id, parentId, kind: 'folder', name }
}

function requestNode(request: AnyRequest, parentId: string): TreeNode {
  return {
    id: request.id,
    parentId,
    kind: 'request',
    name: request.name,
    protocol: request.protocol
  }
}

function seedRequests(): AnyRequest[] {
  return [
    RequestFactory.create('http', 'List users'),
    RequestFactory.create('graphql', 'Countries'),
    RequestFactory.create('websocket', 'Echo socket'),
    RequestFactory.create('kafka', 'Orders topic'),
    RequestFactory.create('mcp', 'Everything server')
  ]
}

const PARENTS = ['f_api', 'f_api', 'f_realtime', 'f_realtime', 'f_ai'] as const

function seedEnvironments(): Environment[] {
  return [
    {
      id: 'env_local',
      name: 'Local',
      variables: [createKeyValue('baseUrl', 'http://localhost:3000')]
    },
    {
      id: 'env_staging',
      name: 'Staging',
      variables: [createKeyValue('baseUrl', 'https://staging.example.com')]
    }
  ]
}

export function createSeedContent(): WorkspaceContent {
  const requests = seedRequests()
  const folders = [folder('f_api', 'Public APIs'), folder('f_realtime', 'Realtime'), folder('f_ai', 'AI tools')]
  const nodes = [...folders, ...requests.map((req, i) => requestNode(req, PARENTS[i] ?? 'f_api'))]
  const byId = Object.fromEntries(requests.map((request) => [request.id, request]))
  return { nodes, requests: byId, environments: seedEnvironments() }
}
