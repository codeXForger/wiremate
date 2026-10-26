import type { WireRequest, WireResponse } from './http'

export type ScriptPhase = 'pre' | 'post'
export type LogLevel = 'log' | 'info' | 'warn' | 'error'
export type ConsoleSource = ScriptPhase | 'request' | 'response' | 'system'
export type Variables = Record<string, string>

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export interface ScriptLog {
  level: LogLevel
  message: string
}

export interface ConsoleEntry extends ScriptLog {
  id: string
  at: number
  source: ConsoleSource
  requestName?: string
  /** Extra text shown when the entry is expanded (headers, body). */
  detail?: string
}

export interface ScriptRun {
  phase: ScriptPhase
  code: string
  request: WireRequest
  response?: WireResponse
  variables: Variables
}

export interface ScriptOutcome {
  request: WireRequest
  variables: Variables
  tests: TestResult[]
  logs: ScriptLog[]
  error?: string
}
