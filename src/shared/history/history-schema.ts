import { z } from 'zod'
import { CATEGORY_IDS } from '../protocols/categories'
import { SafeId } from '../suites/suite-schema'
import { HTTP_METHODS } from '../types/protocol'

/** The newest entries a section keeps; older ones drop off as new requests are sent. */
export const HISTORY_LIMIT = 500

export const HistoryEntrySchema = z.object({
  id: SafeId,
  category: z.enum(CATEGORY_IDS),
  at: z.number(),
  requestId: z.string(),
  requestName: z.string(),
  method: z.enum(HTTP_METHODS),
  url: z.string(),
  environmentName: z.string().nullable(),
  status: z.number(),
  statusText: z.string(),
  durationMs: z.number(),
  sizeBytes: z.number(),
  testsPassed: z.number(),
  testsFailed: z.number(),
  error: z.string().optional()
})

export const HistoryFileSchema = z.object({ entries: z.array(HistoryEntrySchema) })
