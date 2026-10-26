import { z } from 'zod'
import type { Workspace } from '@shared/types/workspace'
import { readJson, writeJson } from '../storage/json-files'

const RegistrySchema = z.object({
  workspaces: z.array(z.object({ id: z.string(), name: z.string(), path: z.string(), lastOpenedAt: z.number() }))
})

/** The workspaces this app knows about, kept in the app's own data folder (not in any workspace). */
export class WorkspaceRegistry {
  public constructor(private readonly file: string) {}

  public async list(): Promise<Workspace[]> {
    return (await readJson(this.file, RegistrySchema))?.workspaces ?? []
  }

  public async find(id: string): Promise<Workspace | undefined> {
    return (await this.list()).find((workspace) => workspace.id === id)
  }

  /** Adds a workspace, replacing one with the same id or the same folder. */
  public async put(workspace: Workspace): Promise<Workspace> {
    const others = (await this.list()).filter((other) => other.id !== workspace.id && other.path !== workspace.path)
    await writeJson(this.file, { workspaces: [...others, workspace] })
    return workspace
  }
}
