import { findHeader } from '../http/wire-request'
import type { HeaderPair, WireRequest, WireResponse } from '../types/http'
import { HTTP_METHODS, type HttpMethod } from '../types/protocol'
import type { LogLevel, ScriptLog, ScriptOutcome, ScriptRun, TestResult } from '../types/scripting'
import { errorMessage, formatLogArgument } from './describe'
import { RequestParams } from './request-params'
import { expect } from './expect'

type Globals = Record<string, unknown>

const LOG_LEVELS: Record<string, LogLevel> = { log: 'log', debug: 'log', info: 'info', warn: 'warn', error: 'error' }

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function'
}

function toVariableValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function toMethod(value: string): HttpMethod {
  const method = HTTP_METHODS.find((candidate) => candidate === value.toUpperCase())
  if (!method) throw new Error(`Unsupported HTTP method "${value}". Use one of ${HTTP_METHODS.join(', ')}.`)
  return method
}

function toBody(value: unknown): string | null {
  return value === null || value === undefined ? null : toVariableValue(value)
}

function accessor<T>(get: () => T, set: (value: T) => unknown): PropertyDescriptor {
  return { get, set, enumerable: true }
}

/** Accessors, not plain fields, so assignments in the script change the request that is sent. */
function requestAccessors(request: WireRequest): PropertyDescriptorMap {
  const setMethod = (value: string): void => void (request.method = toMethod(value))
  const setUrl = (value: string): void => void (request.url = value)
  const setBody = (value: unknown): void => void (request.body = toBody(value))
  return {
    method: accessor(() => request.method, setMethod),
    url: accessor(() => request.url, setUrl),
    body: accessor(() => request.body, setBody)
  }
}

function headerReader(headers: () => HeaderPair[]): Globals {
  return {
    get: (name: string) => findHeader(headers(), name)?.value,
    has: (name: string) => findHeader(headers(), name) !== undefined,
    all: () => headerObject(headers())
  }
}

function headerObject(headers: HeaderPair[]): Record<string, string> {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]))
}

/** The body as JSON when it parses, otherwise as text: what `console.log(wm.response)` shows. */
function readableBody(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function responseApi(response: WireResponse): Globals {
  const { status, statusText, timings, sizeBytes: size } = response
  const summary = { status, statusText, time: timings.totalMs, size }
  return {
    ...summary,
    headers: headerReader(() => response.headers),
    text: () => response.body,
    json: (): unknown => JSON.parse(response.body),
    toJSON: () => ({ ...summary, headers: headerObject(response.headers), body: readableBody(response.body) })
  }
}

/** Holds the state of one script run and builds the `wm` and `console` globals the script sees. */
export class ScriptSession {
  private readonly request: WireRequest
  private readonly variables: Map<string, string>
  private readonly tests: TestResult[] = []
  private readonly logs: ScriptLog[] = []
  private readonly pending: Promise<void>[] = []

  public constructor(private readonly run: ScriptRun) {
    this.request = { ...run.request, headers: run.request.headers.map((header) => ({ ...header })) }
    this.variables = new Map(Object.entries(run.variables))
  }

  public globals(): Globals {
    return { wm: this.wm(), console: this.console() }
  }

  /** Waits for async tests, then returns what the script changed and recorded. */
  public async finish(error?: unknown): Promise<ScriptOutcome> {
    await Promise.all(this.pending)
    const outcome = {
      request: this.request,
      variables: Object.fromEntries(this.variables),
      tests: this.tests,
      logs: this.logs
    }
    return error === undefined ? outcome : { ...outcome, error: errorMessage(error) }
  }

  private wm(): Globals {
    return {
      phase: this.run.phase,
      env: this.env(),
      request: this.requestApi(),
      response: this.run.response ? responseApi(this.run.response) : undefined,
      test: (name: string, body: () => unknown) => this.test(name, body),
      expect
    }
  }

  private env(): Globals {
    const variables = this.variables
    return {
      get: (name: string) => variables.get(name),
      set: (name: string, value: unknown) => void variables.set(name, toVariableValue(value)),
      unset: (name: string) => void variables.delete(name),
      has: (name: string) => variables.has(name),
      all: () => Object.fromEntries(variables)
    }
  }

  private requestApi(): Globals {
    const request = this.request
    const params = new RequestParams(request)
    const toJSON = (): Globals => ({ ...request, params: params.all(), headers: headerObject(request.headers) })
    return Object.defineProperties<Globals>(
      { headers: this.requestHeaders(), params, toJSON },
      requestAccessors(request)
    )
  }

  private requestHeaders(): Globals {
    const request = this.request
    const remove = (name: string): void => {
      request.headers = request.headers.filter((header) => header.key.toLowerCase() !== name.toLowerCase())
    }
    return {
      ...headerReader(() => request.headers),
      set: (name: string, value: unknown) => {
        remove(name)
        request.headers.push({ key: name, value: String(value) })
      },
      remove
    }
  }

  private console(): Globals {
    const entries = Object.entries(LOG_LEVELS).map(([method, level]) => [
      method,
      (...args: unknown[]) => this.logs.push({ level, message: args.map(formatLogArgument).join(' ') })
    ])
    return Object.fromEntries(entries) as Globals
  }

  private test(name: string, body: () => unknown): void {
    const index = this.tests.push({ name, passed: true }) - 1
    const fail = (error: unknown): void => {
      this.tests[index] = { name, passed: false, error: errorMessage(error) }
    }
    try {
      const result = body()
      if (isThenable(result)) this.pending.push(Promise.resolve(result).then(() => undefined, fail))
    } catch (error) {
      fail(error)
    }
  }
}
