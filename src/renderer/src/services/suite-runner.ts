import { summarizeRun } from '@shared/suites/run-summary'
import type { Variables } from '@shared/types/scripting'
import type { RequestRunResult, SuiteRun, TestSuite } from '@shared/types/suite'
import { createId } from '@shared/utils/id'
import type { SuiteStep } from '@/features/suites/suite-steps'
import type { PipelineInput, PipelineResult } from './request-pipeline'

export interface SuiteRunInput {
  suite: TestSuite
  steps: SuiteStep[]
  variables: Variables
  environmentName: string | null
  /** Aborting it stops the run: the request in flight is cancelled and the rest are skipped. */
  signal?: AbortSignal
}

/** Called after each step; `output` is set when the request was actually sent. */
export type StepListener = (result: RequestRunResult, output?: PipelineResult) => void

interface SuiteRunnerDependencies {
  pipeline: { run: (input: PipelineInput, signal?: AbortSignal) => Promise<PipelineResult> }
  now?: () => number
  wait?: (ms: number) => Promise<void>
}

interface StepOutcome {
  result: RequestRunResult
  output?: PipelineResult
}

const STOPPED = 'Skipped because an earlier request failed'
const USER_STOPPED = 'Skipped because the run was stopped'

function skipped(step: SuiteStep, reason: string): RequestRunResult {
  const base = { requestId: step.requestId, name: step.name, method: null, url: '', status: 0, statusText: '' }
  return { ...base, durationMs: 0, tests: [], outcome: 'skipped', error: reason }
}

function toResult(step: SuiteStep, output: PipelineResult): RequestRunResult {
  const { request, response, scriptErrors } = output
  if (response.cancelled) return { ...skipped(step, 'Cancelled because the run was stopped'), method: request.method }
  const errors = [...(response.error ? [response.error] : []), ...scriptErrors]
  const failed = errors.length > 0 || response.tests.some((test) => !test.passed)
  const base = { requestId: step.requestId, name: step.name, method: request.method, url: request.url }
  const reply = { status: response.status, statusText: response.statusText, durationMs: response.durationMs }
  const result: RequestRunResult = { ...base, ...reply, tests: response.tests, outcome: failed ? 'failed' : 'passed' }
  return errors.length > 0 ? { ...result, error: errors.join('; ') } : result
}

interface RunTiming {
  startedAt: number
  durationMs: number
}

function buildRun(input: SuiteRunInput, results: RequestRunResult[], { startedAt, durationMs }: RunTiming): SuiteRun {
  const { suite, environmentName } = input
  const summary = summarizeRun(results, durationMs)
  const run = { id: createId('run'), suiteId: suite.id, suiteName: suite.name, startedAt, environmentName, results }
  return input.signal?.aborted ? { ...run, summary, stopped: true } : { ...run, summary }
}

type ExecutionDependencies = Pick<SuiteRunnerDependencies, 'pipeline'> & { wait: (ms: number) => Promise<void> }

/** The state of one suite run: variables carried between requests, and whether a failure stopped it. */
class SuiteExecution {
  private readonly results: RequestRunResult[] = []
  private variables: Variables
  private sent = 0
  private stopped = false

  public constructor(
    private readonly input: SuiteRunInput,
    private readonly deps: ExecutionDependencies,
    private readonly onStep: StepListener
  ) {
    this.variables = input.variables
  }

  public async execute(): Promise<RequestRunResult[]> {
    for (const step of this.input.steps) this.record(await this.runStep(step))
    return this.results
  }

  private async runStep(step: SuiteStep): Promise<StepOutcome> {
    const reason = this.skipReason(step)
    if (reason !== undefined || !step.request) return { result: skipped(step, reason ?? STOPPED) }
    await this.pause()
    if (this.input.signal?.aborted) return { result: skipped(step, USER_STOPPED) }
    const input = { name: step.name, config: step.request.config, variables: this.variables }
    const output = await this.deps.pipeline.run(input, this.input.signal)
    this.variables = output.variables
    this.sent += 1
    return { result: toResult(step, output), output }
  }

  private skipReason(step: SuiteStep): string | undefined {
    if (this.input.signal?.aborted) return USER_STOPPED
    return this.stopped ? STOPPED : step.skipReason
  }

  private async pause(): Promise<void> {
    const { delayMs } = this.input.suite.options
    if (this.sent > 0 && delayMs > 0) await this.deps.wait(delayMs)
  }

  private record({ result, output }: StepOutcome): void {
    this.results.push(result)
    this.onStep(result, output)
    this.stopped ||= result.outcome === 'failed' && this.input.suite.options.stopOnFailure
  }
}

/** Sends a suite's requests one after another, carrying variable changes from each request to the next. */
export class SuiteRunner {
  private readonly now: () => number
  private readonly wait: (ms: number) => Promise<void>

  public constructor(private readonly deps: SuiteRunnerDependencies) {
    this.now = deps.now ?? Date.now
    this.wait = deps.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  public async run(input: SuiteRunInput, onStep: StepListener = () => undefined): Promise<SuiteRun> {
    const startedAt = this.now()
    const execution = new SuiteExecution(input, { pipeline: this.deps.pipeline, wait: this.wait }, onStep)
    const results = await execution.execute()
    return buildRun(input, results, { startedAt, durationMs: this.now() - startedAt })
  }
}
