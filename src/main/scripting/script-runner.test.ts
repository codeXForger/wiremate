// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ScriptRun } from '@shared/types/scripting'
import { ScriptRunner } from './script-runner'

const dir = mkdtempSync(join(tmpdir(), 'wiremate-worker-'))

function workerFile(name: string, source: string): string {
  const path = join(dir, `${name}.cjs`)
  writeFileSync(path, source)
  return path
}

const run: ScriptRun = {
  phase: 'pre',
  code: 'x',
  request: { method: 'GET', url: 'http://h', headers: [], body: null },
  variables: { a: '1' }
}

describe('ScriptRunner', () => {
  it('returns what the worker posts', async () => {
    const workerPath = workerFile(
      'echo',
      `const { parentPort, workerData } = require('node:worker_threads')
       parentPort.postMessage({ ...workerData, tests: [], logs: [{ level: 'log', message: workerData.code }] })`
    )
    const outcome = await new ScriptRunner({ workerPath }).run(run)
    expect(outcome.logs).toEqual([{ level: 'log', message: 'x' }])
  })

  it('terminates a worker that never answers', async () => {
    const workerPath = workerFile('hang', 'setInterval(() => {}, 1000)')
    const outcome = await new ScriptRunner({ workerPath, timeoutMs: 100 }).run(run)
    const error = 'Script timed out after 100 ms'
    expect(outcome).toEqual({ request: run.request, variables: run.variables, tests: [], logs: [], error })
  })

  it('explains a missing worker file', async () => {
    const outcome = await new ScriptRunner({ workerPath: join(dir, 'gone.cjs') }).run(run)
    expect(outcome.error).toMatch(/^The script runner could not be loaded; restart WireMate\. \(Cannot find module/)
  })

  it('reports a worker crash as a script error', async () => {
    const workerPath = workerFile('crash', "throw new Error('crashed')")
    const outcome = await new ScriptRunner({ workerPath }).run(run)
    expect(outcome.error).toBe('crashed')
    expect(outcome.variables).toEqual({ a: '1' })
  })
})
