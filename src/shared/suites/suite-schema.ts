import { z } from 'zod'
import { HTTP_METHODS } from '../types/protocol'

/** Ids become file names on disk, so they may only hold word characters and dashes. */
export const SafeId = z.string().regex(/^[\w-]+$/, 'Invalid id')

const TestResultSchema = z.object({ name: z.string(), passed: z.boolean(), error: z.string().optional() })

export const TestSuiteSchema = z.object({
  id: SafeId,
  name: z.string(),
  items: z.array(z.object({ id: z.string(), nodeId: z.string() })),
  options: z.object({ stopOnFailure: z.boolean(), delayMs: z.number().min(0) })
})

const RequestRunResultSchema = z.object({
  requestId: z.string(),
  name: z.string(),
  method: z.enum(HTTP_METHODS).nullable(),
  url: z.string(),
  status: z.number(),
  statusText: z.string(),
  durationMs: z.number(),
  tests: z.array(TestResultSchema),
  outcome: z.enum(['passed', 'failed', 'skipped']),
  error: z.string().optional()
})

const RunSummarySchema = z.object({
  requests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  tests: z.number(),
  testsPassed: z.number(),
  testsFailed: z.number(),
  durationMs: z.number()
})

export const SuiteRunSchema = z.object({
  id: SafeId,
  suiteId: SafeId,
  suiteName: z.string(),
  startedAt: z.number(),
  environmentName: z.string().nullable(),
  results: z.array(RequestRunResultSchema),
  summary: RunSummarySchema,
  stopped: z.boolean().optional()
})
