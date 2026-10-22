import { describe, expect, it } from 'vitest'
import { MockWorkspaceRepository } from '@/services/mock-workspace-repository'
import { createWorkspaceStore } from './workspace-store'

function setup() {
  return createWorkspaceStore(new MockWorkspaceRepository(() => 1000))
}

describe('workspace store', () => {
  it('loads workspaces and opens the demo content', async () => {
    const store = setup()
    await store.getState().loadWorkspaces()
    expect(store.getState().workspaces).toHaveLength(1)
    await store.getState().openWorkspace('ws_demo')
    const state = store.getState()
    expect(state.activeWorkspaceId).toBe('ws_demo')
    expect(Object.keys(state.requests)).toHaveLength(5)
    expect(state.activeEnvironmentId).toBe('env_local')
  })

  it('creates a workspace and switches to it', async () => {
    const store = setup()
    await store.getState().createWorkspace({ name: 'Payments', path: '/tmp/payments' })
    const state = store.getState()
    expect(state.workspaces.at(-1)).toMatchObject({ name: 'Payments', lastOpenedAt: 1000 })
    expect(state.nodes).toEqual([])
    expect(state.activeEnvironmentId).toBeNull()
  })

  it('edits the tree through its actions', () => {
    const store = setup()
    const folderId = store.getState().addFolder(null)
    const requestId = store.getState().addRequest(folderId, 'graphql')
    store.getState().renameNode(requestId, 'Countries')
    store.getState().updateConfig<'graphql'>(requestId, { url: 'https://api.dev/graphql' })
    expect(store.getState().requests[requestId]).toMatchObject({
      name: 'Countries',
      config: { url: 'https://api.dev/graphql' }
    })
    store.getState().removeNode(folderId)
    expect(store.getState().nodes).toEqual([])
  })

  it('manages environments', () => {
    const store = setup()
    store.getState().addEnvironment('Prod')
    const env = store.getState().environments[0]!
    expect(store.getState().activeEnvironmentId).toBe(env.id)
    store.getState().updateEnvironment(env.id, { name: 'Production' })
    store.getState().updateEnvironment('other', { name: 'ignored' })
    expect(store.getState().environments[0]!.name).toBe('Production')
    store.getState().setActiveEnvironment(null)
    expect(store.getState().activeEnvironmentId).toBeNull()
  })
})
