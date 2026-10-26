import { cancelledResult } from '@shared/http/cancelled'
import type { HeaderPair, HttpResult, WireRequest, WireResponse } from '@shared/types/http'
import { errorMessage } from '@shared/scripting/describe'

export const HTTP_TIMEOUT_MS = 30_000

const BODYLESS_METHODS = new Set(['GET', 'HEAD'])

interface HttpClientOptions {
  timeoutMs?: number
  now?: () => number
}

/** Sends HTTP requests from the main process, where there is no CORS, and times them. */
export class HttpClient {
  private readonly timeoutMs: number
  private readonly now: () => number
  /** Requests in flight by transfer id, so the renderer can cancel them. */
  private readonly inFlight = new Map<string, AbortController>()

  public constructor(options: HttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS
    this.now = options.now ?? (() => performance.now())
  }

  public async send(request: WireRequest, transferId?: string): Promise<HttpResult> {
    const controller = new AbortController()
    if (transferId) this.inFlight.set(transferId, controller)
    const startedAt = this.now()
    try {
      const response = await fetch(request.url, this.init(request, controller.signal))
      return await this.read(response, startedAt, this.now() - startedAt)
    } catch (error) {
      const durationMs = this.now() - startedAt
      if (controller.signal.aborted) return cancelledResult(durationMs)
      return { kind: 'error', error: HttpClient.describe(error), durationMs }
    } finally {
      if (transferId) this.inFlight.delete(transferId)
    }
  }

  /** Aborts a request started with this transfer id. Unknown or finished ids are ignored. */
  public cancel(transferId: string): void {
    this.inFlight.get(transferId)?.abort()
  }

  private init(request: WireRequest, cancel: AbortSignal): RequestInit {
    const body = BODYLESS_METHODS.has(request.method) ? undefined : (request.body ?? undefined)
    const headers = request.headers.map(({ key, value }): [string, string] => [key, value])
    const signal = AbortSignal.any([cancel, AbortSignal.timeout(this.timeoutMs)])
    return { method: request.method, headers, body, signal }
  }

  private async read(response: Response, startedAt: number, firstByteMs: number): Promise<WireResponse> {
    const bytes = new Uint8Array(await response.arrayBuffer())
    const headers: HeaderPair[] = []
    response.headers.forEach((value, key) => headers.push({ key, value }))
    return {
      kind: 'response',
      status: response.status,
      statusText: response.statusText,
      headers,
      body: new TextDecoder().decode(bytes),
      sizeBytes: bytes.byteLength,
      timings: { firstByteMs, totalMs: this.now() - startedAt }
    }
  }

  /** fetch hides the useful part ("ECONNREFUSED", "ENOTFOUND") in `cause`. */
  private static describe(error: unknown): string {
    const cause = error instanceof Error && error.cause !== undefined ? `: ${errorMessage(error.cause)}` : ''
    return `${errorMessage(error)}${cause}`
  }
}
