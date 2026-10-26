import { describe, expect, it, vi } from 'vitest'
import { RequestFactory } from '@shared/protocols/request-factory'
import { createSuite } from '@shared/suites/suite-factory'
import type { AnyRequest, RequestDocument } from '@shared/types/protocol'
import type { TestSuite } from '@shared/types/suite'
import type { TreeNode } from '@shared/types/workspace'
import { expandSuite } from '@/features/suites/suite-steps'
import type { PipelineInput, PipelineResult } from './request-pipeline'
import { SuiteRunner } from './suite-runner'

function http(id: string, name: string): RequestDocument<'http'> {
  return { ...RequestFactory.create('http', name), id }
}

const requests: Record<string, AnyRequest> = {
  r_login: http('r_login', 'Login'),
  r_list: http('r_list', 'List'),
  r_get: http('r_get', 'Get'),
  r_ws: { ...RequestFactory.create('websocket', 'Socket'), id: 'r_ws' }
}

const nodes: TreeNode[] = [
  { id: 'f_users', parentId: null, kind: 'folder', name: 'Users', category: 'api' },
  { id: 'f_nested', parentId: 'f_users', kind: 'folder', name: 'Nested', category: 'api' },
  { id: 'r_get', parentId: 'f_nested', kind: 'request', name: 'Get', protocol: 'http' },
  { id: 'r_list', parentId: 'f_users', kind: 'request', name: 'List', protocol: 'http' },
  { id: 'r_login', parentId: null, kind: 'request', name: 'Login', protocol: 'http' },
  { id: 'r_ws', parentId: 'f_users', kind: 'request', name: 'Socket', protocol: 'websocket' }
]

function suite(nodeIds: string[], options: Partial<TestSuite['options']> = {}): TestSuite {
  const base = createSuite('Smoke')
  return {
    ...base,
    items: nodeIds.map((nodeId, i) => ({ id: `i${i}`, nodeId })),
    options: { ...base.options, ...options }
  }
}

/** A fake pipeline: "Get" fails its test, every request counts calls in the `n` variable. */
function fakePipeline() {
  return {
    run: vi.fn((input: PipelineInput, _signal?: AbortSignal): Promise<PipelineResult> => {
      const n = String(Number(input.variables['n'] ?? 0) + 1)
      const passed = input.name !== 'Get'
      return Promise.resolve({
        request: { method: 'GET', url: `http://x/${input.name}`, headers: [], body: null },
        response: {
          kind: 'exchange',
          status: 200,
          statusText: 'OK',
          durationMs: 10,
          sizeBytes: 2,
          headers: [],
          body: '{}',
          tests: [{ name: 'ok', passed, ...(passed ? {} : { error: 'nope' }) }],
          simulated: false
        },
        variables: { ...input.variables, n },
        logs: [],
        scriptErrors: []
      })
    })
  }
}

function run(test: TestSuite, pipeline = fakePipeline(), wait = vi.fn(() => Promise.resolve())) {
  let clock = 0
  const runner = new SuiteRunner({ pipeline, now: () => (clock += 100), wait })
  const onStep = vi.fn()
  const steps = expandSuite(test.items, { nodes, requests })
  return {
    pipeline,
    wait,
    onStep,
    done: runner.run({ suite: test, steps, variables: {}, environmentName: 'Local' }, onStep)
  }
}

describe('expandSuite', () => {
  it('expands folders depth first in explorer order and skips what cannot run', () => {
    const steps = expandSuite(suite(['f_users', 'r_login', 'r_ws', 'gone']).items, { nodes, requests })
    expect(steps.map((step) => [step.name, step.skipReason])).toEqual([
      ['Get', undefined],
      ['List', undefined],
      ['Login', undefined],
      ['Socket', 'Only HTTP requests can run in a suite'],
      ['Missing request', 'The request no longer exists']
    ])
  })
})

describe('SuiteRunner', () => {
  it('runs every request in order, carries variables and summarises the run', async () => {
    const { done, pipeline, onStep } = run(suite(['r_login', 'f_users', 'r_ws']))
    const result = await done
    expect(pipeline.run.mock.calls.map(([input]) => [input.name, input.variables['n']])).toEqual([
      ['Login', undefined],
      ['Get', '1'],
      ['List', '2']
    ])
    expect(result.results.map((r) => [r.name, r.outcome])).toEqual([
      ['Login', 'passed'],
      ['Get', 'failed'],
      ['List', 'passed'],
      ['Socket', 'skipped']
    ])
    expect(result.summary).toEqual({
      requests: 4,
      passed: 2,
      failed: 1,
      skipped: 1,
      tests: 3,
      testsPassed: 2,
      testsFailed: 1,
      durationMs: 100
    })
    expect(result).toMatchObject({ suiteName: 'Smoke', environmentName: 'Local', startedAt: 100 })
    expect(result.results[0]).toMatchObject({ method: 'GET', url: 'http://x/Login', status: 200, durationMs: 10 })
    expect(onStep).toHaveBeenCalledTimes(4)
    expect(onStep.mock.calls[3]?.[1]).toBeUndefined()
  })

  it('stops after the first failure when asked to', async () => {
    const { done } = run(suite(['r_get', 'r_list'], { stopOnFailure: true }))
    const result = await done
    expect(result.results.map((r) => [r.outcome, r.error])).toEqual([
      ['failed', undefined],
      ['skipped', 'Skipped because an earlier request failed']
    ])
  })

  it('waits between requests but not before the first', async () => {
    const { done, wait } = run(suite(['r_login', 'r_list', 'r_get'], { delayMs: 250 }))
    await done
    expect(wait.mock.calls).toEqual([[250], [250]])
  })

  it('fails requests with a network or script error', async () => {
    const pipeline = fakePipeline()
    pipeline.run.mockImplementationOnce(async (input) => {
      const output = await fakePipeline().run(input)
      return {
        ...output,
        response: { ...output.response, tests: [], error: 'ECONNREFUSED' },
        scriptErrors: ['Pre-request script failed: x']
      }
    })
    const result = await run(suite(['r_login']), pipeline).done
    expect(result.results[0]).toMatchObject({ outcome: 'failed', error: 'ECONNREFUSED; Pre-request script failed: x' })
  })

  it('stops when the signal aborts: cancels the request in flight and skips the rest', async () => {
    const controller = new AbortController()
    const pipeline = fakePipeline()
    pipeline.run.mockImplementationOnce(async (input) => fakePipeline().run(input))
    pipeline.run.mockImplementationOnce(async (input) => {
      controller.abort()
      const output = await fakePipeline().run(input)
      return { ...output, response: { ...output.response, cancelled: true, error: 'Request cancelled' } }
    })
    const test = suite(['r_login', 'r_list', 'r_get'])
    const steps = expandSuite(test.items, { nodes, requests })
    const runner = new SuiteRunner({ pipeline, wait: () => Promise.resolve() })
    const result = await runner.run({
      suite: test,
      steps,
      variables: {},
      environmentName: null,
      signal: controller.signal
    })
    expect(result.results.map((r) => [r.name, r.outcome, r.error])).toEqual([
      ['Login', 'passed', undefined],
      ['List', 'skipped', 'Cancelled because the run was stopped'],
      ['Get', 'skipped', 'Skipped because the run was stopped']
    ])
    expect(result.stopped).toBe(true)
    expect(pipeline.run.mock.calls[1]?.[1]).toBe(controller.signal)
  })

  it('does not send the next request when stopped during the delay', async () => {
    const controller = new AbortController()
    const test = suite(['r_login', 'r_list'], { delayMs: 100 })
    const steps = expandSuite(test.items, { nodes, requests })
    const pipeline = fakePipeline()
    const wait = vi.fn(() => (controller.abort(), Promise.resolve()))
    const result = await new SuiteRunner({ pipeline, wait }).run({
      suite: test,
      steps,
      variables: {},
      environmentName: null,
      signal: controller.signal
    })
    expect(pipeline.run).toHaveBeenCalledTimes(1)
    expect(result.results[1]).toMatchObject({ outcome: 'skipped', error: 'Skipped because the run was stopped' })
  })

  it('waits with a real timer by default', async () => {
    vi.useFakeTimers()
    const runner = new SuiteRunner({ pipeline: fakePipeline() })
    const steps = expandSuite(suite(['r_login', 'r_list'], { delayMs: 50 }).items, { nodes, requests })
    const done = runner.run({ suite: suite([], { delayMs: 50 }), steps, variables: {}, environmentName: null })
    await vi.advanceTimersByTimeAsync(50)
    expect((await done).results).toHaveLength(2)
    vi.useRealTimers()
  })
})
