import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { AnyRequest } from '@shared/types/protocol'
import type {
  CreateWorkspaceInput,
  Environment,
  TreeNode,
  Workspace,
  WorkspaceContent,
  WorkspaceSettings
} from '@shared/types/workspace'
import type { WorkspaceFileStore } from './workspace-file-store'
import type { WorkspaceRegistry } from './workspace-registry'

export interface WorkspaceServiceOptions {
  registry: WorkspaceRegistry
  files: WorkspaceFileStore
  home?: string
  now?: () => number
}

export const DEFAULT_WORKSPACE = { name: 'Default', folder: join('WireMate', 'Default') }

/**
 * Workspaces by id. The renderer only ever names a workspace by its id, and this service turns it into the folder
 * registered for it, so the renderer cannot read or write anywhere else.
 */
export class WorkspaceService {
  private readonly home: string
  private readonly now: () => number

  public constructor(private readonly options: WorkspaceServiceOptions) {
    this.home = options.home ?? homedir()
    this.now = options.now ?? Date.now
  }

  /** Lists the known workspaces, creating the default one on first launch. */
  public async list(): Promise<Workspace[]> {
    const workspaces = await this.options.registry.list()
    if (workspaces.length > 0) return workspaces
    return [await this.create({ name: DEFAULT_WORKSPACE.name, path: join(this.home, DEFAULT_WORKSPACE.folder) })]
  }

  public async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const path = this.resolvePath(input.path)
    const manifest = await this.options.files.init(path, input.name)
    return this.options.registry.put({ id: manifest.id, name: manifest.name, path, lastOpenedAt: this.now() })
  }

  /** Loads a workspace's content and remembers it as the most recently opened. */
  public async open(id: string): Promise<WorkspaceContent> {
    const workspace = await this.workspace(id)
    await this.options.registry.put({ ...workspace, lastOpenedAt: this.now() })
    return this.options.files.load(workspace.path)
  }

  public async pathOf(id: string): Promise<string> {
    return (await this.workspace(id)).path
  }

  public async saveTree(id: string, nodes: TreeNode[]): Promise<void> {
    await this.options.files.saveTree(await this.pathOf(id), nodes)
  }

  public async saveRequest(id: string, request: AnyRequest): Promise<void> {
    await this.options.files.saveRequest(await this.pathOf(id), request)
  }

  public async deleteRequest(id: string, requestId: string): Promise<void> {
    await this.options.files.deleteRequest(await this.pathOf(id), requestId)
  }

  public async saveEnvironment(id: string, environment: Environment): Promise<void> {
    await this.options.files.saveEnvironment(await this.pathOf(id), environment)
  }

  public async deleteEnvironment(id: string, environmentId: string): Promise<void> {
    await this.options.files.deleteEnvironment(await this.pathOf(id), environmentId)
  }

  public async saveSettings(id: string, settings: WorkspaceSettings): Promise<void> {
    await this.options.files.saveSettings(await this.pathOf(id), settings)
  }

  private async workspace(id: string): Promise<Workspace> {
    const workspace = await this.options.registry.find(id)
    if (!workspace) throw new Error(`Unknown workspace ${id}`)
    return workspace
  }

  private resolvePath(path: string): string {
    const trimmed = path.trim()
    return resolve(trimmed.startsWith('~') ? join(this.home, trimmed.slice(1)) : trimmed)
  }
}
