import { finalizeRequest, rawHttpRequest } from '@shared/http/wire-request'
import { isBlankScript } from '@shared/scripting/script-host'
import type { HttpResult, WireRequest, WireResponse } from '@shared/types/http'
import type { HttpConfig } from '@shared/types/protocol'
import type { ExchangeResponse } from '@shared/types/response'
import type { ConsoleEntry, ScriptOutcome, ScriptRun, TestResult, Variables } from '@shared/types/scripting'
import { toExchange, toFailedExchange } from './exchange-mapping'
import { RunTrace } from './run-trace'

export interface HttpTransport {
  send(request: WireRequest): Promise<HttpResult>
}

export interface ScriptExecutor {
  run(run: ScriptRun): Promise<ScriptOutcome>
}

export interface PipelineDependencies {
  transport: HttpTransport
  scripts: ScriptExecutor
  now?: () => number
}

export interface PipelineInput {
  name: string
  config: HttpConfig
  variables: Variables
}

export interface PipelineResult {
  /** The request as it was sent, after the pre-request script and variables. */
  request: WireRequest
  response: ExchangeResponse
  /** The variables after both scripts ran; the caller writes them back to the environment. */
  variables: Variables
  logs: ConsoleEntry[]
  scriptErrors: string[]
}

interface Stage {
  request: WireRequest
  variables: Variables
  tests: TestResult[]
}

/** Sends one HTTP request: pre-request script → fill in variables → send → post-response script. */
export class RequestPipeline {
  public constructor(private readonly deps: PipelineDependencies) {}

  public async run(input: PipelineInput): Promise<PipelineResult> {
    const trace = new RunTrace(input.name, this.deps.now ?? Date.now)
    const pre = await this.script(trace, { phase: 'pre', code: input.config.scripts.pre, ...this.start(input) })
    const { request, missing } = finalizeRequest(pre.request, input.config.auth, pre.variables)
    trace.missing(missing)
    trace.request(request)
    const result = await this.deps.transport.send(request)
    trace.response(result)
    if (result.kind === 'error')
      return RequestPipeline.finish(trace, request, {
        response: toFailedExchange(result, pre.tests),
        variables: pre.variables
      })
    return this.afterResponse(trace, { ...pre, request }, { response: result, code: input.config.scripts.post })
  }

  private start(input: PipelineInput): Omit<Stage, 'tests'> {
    return { request: rawHttpRequest(input.config), variables: input.variables }
  }

  private async afterResponse(
    trace: RunTrace,
    stage: Stage,
    post: { response: WireResponse; code: string }
  ): Promise<PipelineResult> {
    const outcome = await this.script(trace, {
      phase: 'post',
      ...post,
      request: stage.request,
      variables: stage.variables
    })
    const tests = [...stage.tests, ...outcome.tests]
    const response = toExchange(post.response, tests)
    return RequestPipeline.finish(trace, stage.request, { response, variables: outcome.variables })
  }

  private static finish(
    trace: RunTrace,
    request: WireRequest,
    result: Pick<PipelineResult, 'response' | 'variables'>
  ): PipelineResult {
    return { request, ...result, logs: trace.logs, scriptErrors: trace.scriptErrors }
  }

  private async script(trace: RunTrace, run: ScriptRun): Promise<Stage> {
    if (isBlankScript(run.code)) return { request: run.request, variables: run.variables, tests: [] }
    const outcome = await this.deps.scripts.run(run)
    trace.script(run.phase, outcome)
    return outcome
  }
}
