import type { WorkspaceStorageApi } from '@shared/ipc'
import type { AnyRequest } from '@shared/types/protocol'
import type {
  CreateWorkspaceInput,
  Environment,
  TreeNode,
  Workspace,
  WorkspaceContent,
  WorkspaceSettings
} from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import { DEFAULT_SETTINGS } from '@shared/workspace/workspace-files'

/** Storage boundary for workspaces. In the app it is the preload bridge, which writes files in the workspace folder. */
export type WorkspaceRepository = WorkspaceStorageApi

export interface WorkspaceSeed {
  workspace: Workspace
  content: WorkspaceContent
}

const emptyContent = (): WorkspaceContent => ({ nodes: [], requests: {}, environments: [], settings: DEFAULT_SETTINGS })

/** Keeps workspaces in memory, for tests and for running the renderer in a plain browser. Mirrors the main process. */
export class MemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly workspaces = new Map<string, Workspace>()
  private readonly contents = new Map<string, WorkspaceContent>()

  public constructor(
    seeds: WorkspaceSeed[] = [],
    private readonly now: () => number = Date.now
  ) {
    seeds.forEach(({ workspace, content }) => {
      this.workspaces.set(workspace.id, workspace)
      this.contents.set(workspace.id, structuredClone(content))
    })
  }

  public async listWorkspaces(): Promise<Workspace[]> {
    if (this.workspaces.size === 0) await this.createWorkspace({ name: 'Default', path: '~/WireMate/Default' })
    return [...this.workspaces.values()].map((workspace) => ({ ...workspace }))
  }

  public createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const existing = [...this.workspaces.values()].find((workspace) => workspace.path === input.path)
    const workspace = { id: existing?.id ?? createId('ws'), ...input, lastOpenedAt: this.now() }
    this.workspaces.set(workspace.id, workspace)
    if (!existing) this.contents.set(workspace.id, emptyContent())
    return Promise.resolve({ ...workspace })
  }

  public openWorkspace(workspaceId: string): Promise<WorkspaceContent> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) return Promise.reject(new Error(`Unknown workspace ${workspaceId}`))
    this.workspaces.set(workspaceId, { ...workspace, lastOpenedAt: this.now() })
    return Promise.resolve(structuredClone(this.content(workspaceId)))
  }

  public saveTree(workspaceId: string, nodes: TreeNode[]): Promise<void> {
    return this.change(workspaceId, (content) => ({ ...content, nodes }))
  }

  public saveRequest(workspaceId: string, request: AnyRequest): Promise<void> {
    return this.change(workspaceId, (content) => ({
      ...content,
      requests: { ...content.requests, [request.id]: request }
    }))
  }

  public deleteRequest(workspaceId: string, requestId: string): Promise<void> {
    return this.change(workspaceId, (content) => {
      const { [requestId]: _removed, ...requests } = content.requests
      return { ...content, requests }
    })
  }

  public saveEnvironment(workspaceId: string, environment: Environment): Promise<void> {
    return this.change(workspaceId, (content) => {
      const others = content.environments.filter((env) => env.id !== environment.id)
      return { ...content, environments: [...others, environment] }
    })
  }

  public deleteEnvironment(workspaceId: string, environmentId: string): Promise<void> {
    return this.change(workspaceId, (content) => ({
      ...content,
      environments: content.environments.filter((env) => env.id !== environmentId)
    }))
  }

  public saveSettings(workspaceId: string, settings: WorkspaceSettings): Promise<void> {
    return this.change(workspaceId, (content) => ({ ...content, settings }))
  }

  private content(workspaceId: string): WorkspaceContent {
    return this.contents.get(workspaceId) ?? emptyContent()
  }

  private change(workspaceId: string, update: (content: WorkspaceContent) => WorkspaceContent): Promise<void> {
    this.contents.set(workspaceId, structuredClone(update(this.content(workspaceId))))
    return Promise.resolve()
  }
}
