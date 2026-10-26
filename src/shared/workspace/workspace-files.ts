import { z } from 'zod'
import { CATEGORY_IDS } from '../protocols/categories'
import { PROTOCOL_DEFAULTS } from '../protocols/defaults'
import { syncUrlAndParams } from '../http/query-params'
import { SafeId } from '../suites/suite-schema'
import { PROTOCOL_IDS, type AnyRequest } from '../types/protocol'
import type { WorkspaceSettings } from '../types/workspace'

/**
 * The files of a workspace folder:
 *
 *   wiremate.json                 name, id and settings
 *   collections.json              folders and where each request sits, for every section
 *   requests/<id>.json            one file per request: name, protocol and its whole config (scripts included)
 *   environments/<id>.json        one file per environment
 *   suites/<id>.json              test suites
 *   runs/<suiteId>/<runId>.json   suite run history
 *   history/<section>.json        requests sent from a section, newest first
 */
export const WORKSPACE_FILES = {
  manifest: 'wiremate.json',
  tree: 'collections.json',
  requests: 'requests',
  environments: 'environments',
  suites: 'suites',
  runs: 'runs',
  history: 'history'
} as const

export const DEFAULT_SETTINGS: WorkspaceSettings = { theme: 'dark', activeEnvironmentId: null }

export const SettingsSchema = z.object({
  theme: z.enum(['dark', 'light']).catch('dark'),
  activeEnvironmentId: z.string().nullable().catch(null)
})

export const ManifestSchema = z.object({
  version: z.literal(1),
  id: SafeId,
  name: z.string(),
  settings: SettingsSchema.catch(DEFAULT_SETTINGS)
})

export type WorkspaceManifest = z.infer<typeof ManifestSchema>

export const KeyValueSchema = z.object({ id: z.string(), key: z.string(), value: z.string(), enabled: z.boolean() })

export const EnvironmentSchema = z.object({ id: SafeId, name: z.string(), variables: z.array(KeyValueSchema) })

const TreeNodeSchema = z.object({
  id: SafeId,
  parentId: z.string().nullable(),
  kind: z.enum(['folder', 'request']),
  name: z.string(),
  protocol: z.enum(PROTOCOL_IDS).optional(),
  category: z.enum(CATEGORY_IDS).optional()
})

export const TreeFileSchema = z.object({ nodes: z.array(TreeNodeSchema) })

export const RequestFileSchema = z.object({
  id: SafeId,
  name: z.string(),
  protocol: z.enum(PROTOCOL_IDS),
  config: z.record(z.string(), z.unknown())
})

export type RequestFile = z.infer<typeof RequestFileSchema>

/** Fills in config fields a file lacks (written by an older version, or edited by hand) from the protocol defaults. */
export function toRequestDocument(file: RequestFile): AnyRequest {
  const config = { ...PROTOCOL_DEFAULTS[file.protocol](), ...file.config }
  const request = { ...file, config } as AnyRequest
  return request.protocol === 'http' ? { ...request, config: syncUrlAndParams(request.config) } : request
}
