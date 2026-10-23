import type { HeaderPair, HttpResult, WireFailure, WireRequest, WireResponse } from '@shared/types/http'
import type { ConsoleEntry, ConsoleSource, LogLevel, ScriptOutcome, ScriptPhase } from '@shared/types/scripting'
import { formatBytes, formatDuration } from '@shared/utils/format'
import { createId } from '@shared/utils/id'

interface EntryInput {
  source: ConsoleSource
  level: LogLevel
  message: string
  detail?: string
}

function describeMessage(headers: HeaderPair[], body: string | null): string {
  const lines = headers.map(({ key, value }) => `${key}: ${value}`)
  return body ? [...lines, '', body].join('\n') : lines.join('\n')
}

function failureEntry(failure: WireFailure): EntryInput {
  if (failure.cancelled) return { source: 'response', level: 'warn', message: failure.error }
  return { source: 'response', level: 'error', message: `Request failed: ${failure.error}` }
}

function responseEntry(response: WireResponse): EntryInput {
  const { status, statusText, timings, sizeBytes } = response
  const message = [`${status} ${statusText}`, formatDuration(timings.totalMs), formatBytes(sizeBytes)].join(' · ')
  return { source: 'response', level: 'info', message, detail: describeMessage(response.headers, response.body) }
}

const PHASE_LABEL: Record<ScriptPhase, string> = { pre: 'Pre-request', post: 'Post-response' }

/** Collects the console entries for one request: what was sent, what came back and what the scripts logged. */
export class RunTrace {
  private readonly entries: ConsoleEntry[] = []
  /** Scripts that threw, as "Pre-request script failed: …". */
  public readonly scriptErrors: string[] = []

  public constructor(
    private readonly requestName: string,
    private readonly now: () => number
  ) {}

  public get logs(): ConsoleEntry[] {
    return this.entries
  }

  public add(input: EntryInput): void {
    this.entries.push({ id: createId('log'), at: this.now(), requestName: this.requestName, ...input })
  }

  public script(phase: ScriptPhase, outcome: ScriptOutcome): void {
    outcome.logs.forEach((log) => this.add({ source: phase, ...log }))
    if (!outcome.error) return
    const message = `${PHASE_LABEL[phase]} script failed: ${outcome.error}`
    this.scriptErrors.push(message)
    this.add({ source: phase, level: 'error', message })
  }

  public missing(names: string[]): void {
    if (names.length === 0) return
    const list = names.map((name) => `{{${name}}}`).join(', ')
    this.add({ source: 'system', level: 'warn', message: `No variable for ${list}; sent as written` })
  }

  public request(request: WireRequest): void {
    const detail = describeMessage(request.headers, request.body)
    this.add({ source: 'request', level: 'info', message: `${request.method} ${request.url}`, detail })
  }

  public response(result: HttpResult): void {
    this.add(result.kind === 'error' ? failureEntry(result) : responseEntry(result))
  }
}
