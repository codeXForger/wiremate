import type { Workspace, WorkspaceContent } from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import { createSeedContent } from './mock-seed'
import type { CreateWorkspaceInput, WorkspaceRepository } from './workspace-repository'

const EMPTY_CONTENT: WorkspaceContent = { nodes: [], requests: {}, environments: [] }

export class MockWorkspaceRepository implements WorkspaceRepository {
  private readonly workspaces: Workspace[]

  public constructor(private readonly now: () => number = Date.now) {
    this.workspaces = [{ id: 'ws_demo', name: 'Demo workspace', path: '~/WireMate/demo', lastOpenedAt: now() }]
  }

  public listWorkspaces(): Promise<Workspace[]> {
    return Promise.resolve([...this.workspaces])
  }

  public createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = { id: createId('ws'), ...input, lastOpenedAt: this.now() }
    this.workspaces.push(workspace)
    return Promise.resolve(workspace)
  }

  public loadContent(workspaceId: string): Promise<WorkspaceContent> {
    const content = workspaceId === 'ws_demo' ? createSeedContent() : structuredClone(EMPTY_CONTENT)
    return Promise.resolve(content)
  }
}
