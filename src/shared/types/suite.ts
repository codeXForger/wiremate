import type { HttpMethod } from './protocol'
import type { TestResult } from './scripting'

/** One entry of a suite: a request, or a folder whose HTTP requests all run in tree order. */
export interface SuiteItem {
  id: string
  nodeId: string
}

export interface SuiteOptions {
  stopOnFailure: boolean
  /** Pause between requests, in milliseconds. */
  delayMs: number
}

export interface TestSuite {
  id: string
  name: string
  items: SuiteItem[]
  options: SuiteOptions
}

export type RequestOutcome = 'passed' | 'failed' | 'skipped'

export interface RequestRunResult {
  requestId: string
  name: string
  method: HttpMethod | null
  url: string
  /** 0 when there was no response. */
  status: number
  statusText: string
  durationMs: number
  tests: TestResult[]
  outcome: RequestOutcome
  /** Network failure, script error or the reason the request was skipped. */
  error?: string
}

export interface RunSummary {
  requests: number
  passed: number
  failed: number
  skipped: number
  tests: number
  testsPassed: number
  testsFailed: number
  durationMs: number
}

export interface SuiteRun {
  id: string
  suiteId: string
  suiteName: string
  startedAt: number
  environmentName: string | null
  results: RequestRunResult[]
  summary: RunSummary
}
