import { Worker } from 'node:worker_threads'
import { errorMessage } from '@shared/scripting/describe'
import type { ScriptOutcome, ScriptRun } from '@shared/types/scripting'
import { SCRIPT_TIMEOUT_MS } from './vm-evaluate'

interface ScriptRunnerOptions {
  workerPath: string
  timeoutMs?: number
}

/**
 * Runs each script in its own worker thread, away from the main process state. A worker that has not answered in
 * time (an endless loop after an `await`, a promise that never settles) is terminated.
 */
export class ScriptRunner {
  private readonly timeoutMs: number

  public constructor(private readonly options: ScriptRunnerOptions) {
    this.timeoutMs = options.timeoutMs ?? SCRIPT_TIMEOUT_MS + 1000
  }

  public run(run: ScriptRun): Promise<ScriptOutcome> {
    const worker = new Worker(this.options.workerPath, { workerData: run })
    return new Promise<ScriptOutcome>((resolve) => {
      const finish = (outcome: ScriptOutcome): void => {
        clearTimeout(timer)
        void worker.terminate()
        resolve(outcome)
      }
      const fail = (message: string): void => finish(ScriptRunner.failure(run, message))
      const timer = setTimeout(() => fail(`Script timed out after ${this.timeoutMs} ms`), this.timeoutMs)
      worker.once('message', finish)
      worker.once('error', (error: unknown) => fail(errorMessage(error)))
    })
  }

  private static failure(run: ScriptRun, error: string): ScriptOutcome {
    return { request: run.request, variables: run.variables, tests: [], logs: [], error }
  }
}
