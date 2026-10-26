import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { SafeId } from '@shared/suites/suite-schema'
import type { AnyRequest } from '@shared/types/protocol'
import type { Environment, TreeNode, WorkspaceContent, WorkspaceSettings } from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import {
  DEFAULT_SETTINGS,
  EnvironmentSchema,
  ManifestSchema,
  RequestFileSchema,
  toRequestDocument,
  TreeFileSchema,
  WORKSPACE_FILES,
  type WorkspaceManifest
} from '@shared/workspace/workspace-files'
import { readJson, readJsonFolder, writeJson } from '../storage/json-files'

/** Request nodes need a request file; request files without a node are put back at the root so nothing is lost. */
function reconcileTree(nodes: TreeNode[], requests: Record<string, AnyRequest>): TreeNode[] {
  const kept = nodes.filter((node) => node.kind === 'folder' || requests[node.id] !== undefined)
  const placed = new Set(kept.map((node) => node.id))
  const orphans = Object.values(requests).filter((request) => !placed.has(request.id))
  const restored = orphans.map(({ id, name, protocol }): TreeNode => ({
    id,
    parentId: null,
    kind: 'request',
    name,
    protocol
  }))
  return [...kept, ...restored]
}

/** Reads and writes everything inside one workspace folder. See WORKSPACE_FILES for the layout. */
export class WorkspaceFileStore {
  /** Makes a folder a workspace, keeping the id, settings and content of one that is already there. */
  public async init(root: string, name: string): Promise<WorkspaceManifest> {
    const existing = await this.manifest(root)
    const manifest: WorkspaceManifest = {
      version: 1,
      id: existing?.id ?? createId('ws'),
      name,
      settings: existing?.settings ?? DEFAULT_SETTINGS
    }
    await writeJson(join(root, WORKSPACE_FILES.manifest), manifest)
    return manifest
  }

  public manifest(root: string): Promise<WorkspaceManifest | undefined> {
    return readJson(join(root, WORKSPACE_FILES.manifest), ManifestSchema)
  }

  public async load(root: string): Promise<WorkspaceContent> {
    const [manifest, tree, files, environments] = await Promise.all([
      this.manifest(root),
      readJson(join(root, WORKSPACE_FILES.tree), TreeFileSchema),
      readJsonFolder(join(root, WORKSPACE_FILES.requests), RequestFileSchema),
      readJsonFolder(join(root, WORKSPACE_FILES.environments), EnvironmentSchema)
    ])
    const requests = Object.fromEntries(files.map((file) => [file.id, toRequestDocument(file)]))
    const nodes = reconcileTree(tree?.nodes ?? [], requests)
    const sorted = environments.sort((a, b) => a.name.localeCompare(b.name))
    return { nodes, requests, environments: sorted, settings: manifest?.settings ?? DEFAULT_SETTINGS }
  }

  public saveTree(root: string, nodes: TreeNode[]): Promise<void> {
    return writeJson(join(root, WORKSPACE_FILES.tree), TreeFileSchema.parse({ nodes }))
  }

  public saveRequest(root: string, request: AnyRequest): Promise<void> {
    const file = RequestFileSchema.parse(request)
    return writeJson(join(root, WORKSPACE_FILES.requests, `${file.id}.json`), file)
  }

  public deleteRequest(root: string, id: string): Promise<void> {
    return rm(join(root, WORKSPACE_FILES.requests, `${SafeId.parse(id)}.json`), { force: true })
  }

  public saveEnvironment(root: string, environment: Environment): Promise<void> {
    const file = EnvironmentSchema.parse(environment)
    return writeJson(join(root, WORKSPACE_FILES.environments, `${file.id}.json`), file)
  }

  public deleteEnvironment(root: string, id: string): Promise<void> {
    return rm(join(root, WORKSPACE_FILES.environments, `${SafeId.parse(id)}.json`), { force: true })
  }

  public async saveSettings(root: string, settings: WorkspaceSettings): Promise<void> {
    const manifest = (await this.manifest(root)) ?? { version: 1, id: createId('ws'), name: 'Workspace' }
    await writeJson(join(root, WORKSPACE_FILES.manifest), { ...manifest, settings })
  }
}
