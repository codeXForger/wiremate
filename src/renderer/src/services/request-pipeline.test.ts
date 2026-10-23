import { describe, expect, it, vi } from 'vitest'
import { PROTOCOL_DEFAULTS } from '@shared/protocols/defaults'
import { executeScript } from '@shared/scripting/script-host'
import type { HttpConfig } from '@shared/types/protocol'
import type { ScriptRun } from '@shared/types/scripting'
import { createKeyValue } from '@shared/utils/key-value'
import { echoResponse, functionEvaluate } from '../../test/wiremate-stub'
import { BridgeHttpTransport, BridgeScriptExecutor } from './bridge-clients'
import { RequestPipeline, type HttpTransport } from './request-pipeline'

function config(patch: Partial<HttpConfig> = {}): HttpConfig {
  return {
    ...PROTOCOL_DEFAULTS.http(),
    url: '{{base}}/users',
    headers: [createKeyValue('X-Token', '{{token}}')],
    ...patch
  }
}

function pipeline(transport: HttpTransport = { send: (request) => Promise.resolve(echoResponse(request)) }) {
  const scripts = { run: vi.fn((run: ScriptRun) => executeScript(run, functionEvaluate)) }
  return { scripts, pipeline: new RequestPipeline({ transport, scripts, now: () => 1000 }) }
}

describe('RequestPipeline', () => {
  it('runs the pre-request script before filling in variables', async () => {
    const pre = "wm.env.set('token', 'from-pre'); wm.request.headers.set('X-Extra', '{{base}}')"
    const { pipeline: runner } = pipeline()
    const result = await runner.run({
      name: 'Users',
      config: config({ scripts: { pre, post: '' } }),
      variables: { base: 'http://api' }
    })
    const sent = JSON.parse(result.response.body) as { url: string; headers: unknown }
    expect(sent.url).toBe('http://api/users')
    expect(sent.headers).toEqual([
      { key: 'X-Token', value: 'from-pre' },
      { key: 'X-Extra', value: 'http://api' }
    ])
    expect(result.variables).toEqual({ base: 'http://api', token: 'from-pre' })
  })

  it('collects tests from both scripts and variables from the post script', async () => {
    const scripts = {
      pre: "wm.test('pre ok', () => {})",
      post: "wm.test('status', () => wm.expect(wm.response.status).toBe(200)); wm.env.set('url', wm.response.json().url)"
    }
    const { pipeline: runner } = pipeline()
    const result = await runner.run({
      name: 'Users',
      config: config({ scripts }),
      variables: { base: 'b', token: 't' }
    })
    expect(result.response).toMatchObject({ status: 200, durationMs: 34, firstByteMs: 12, simulated: false })
    expect(result.response.tests).toEqual([
      { name: 'pre ok', passed: true },
      { name: 'status', passed: true }
    ])
    expect(result.variables['url']).toBe('b/users')
  })

  it('logs the request, the response, script output and missing variables', async () => {
    const { pipeline: runner } = pipeline()
    const scripts = { pre: "console.log('hello')", post: 'throw new Error("bad")' }
    const { logs } = await runner.run({ name: 'Users', config: config({ scripts }), variables: {} })
    expect(logs.map(({ source, level, message }) => [source, level, message])).toEqual([
      ['pre', 'log', 'hello'],
      ['system', 'warn', 'No variable for {{base}}, {{token}}; sent as written'],
      ['request', 'info', 'GET {{base}}/users'],
      ['response', 'info', expect.stringMatching(/^200 OK · 34 ms · \d+ B$/) as string],
      ['post', 'error', 'Post-response script failed: bad']
    ])
    expect(logs[2]).toMatchObject({
      requestName: 'Users',
      at: 1000,
      detail: 'X-Token: {{token}}'
    })
    expect(logs[3]?.detail).toContain('content-type: application/json\nx-echo: yes\n\n{')
  })

  it('skips blank scripts without calling the executor', async () => {
    const { pipeline: runner, scripts } = pipeline()
    await runner.run({ name: 'Users', config: config(), variables: {} })
    expect(scripts.run).not.toHaveBeenCalled()
  })

  it('turns a network failure into an error response and skips the post script', async () => {
    const transport: HttpTransport = {
      send: () => Promise.resolve({ kind: 'error', error: 'ECONNREFUSED', durationMs: 5 })
    }
    const { pipeline: runner, scripts } = pipeline(transport)
    const result = await runner.run({
      name: 'Users',
      config: config({ scripts: { pre: '', post: 'x' } }),
      variables: {}
    })
    expect(result.response).toMatchObject({ status: 0, error: 'ECONNREFUSED', durationMs: 5, body: '' })
    expect(result.logs.at(-1)).toMatchObject({ level: 'error', message: 'Request failed: ECONNREFUSED' })
    expect(scripts.run).not.toHaveBeenCalled()
  })
})

describe('bridge clients', () => {
  const request = { method: 'GET' as const, url: 'http://h', headers: [], body: null }
  const run: ScriptRun = { phase: 'pre', code: 'x', request, variables: {} }

  it('report a missing bridge as an error', async () => {
    expect(await new BridgeHttpTransport().send(request)).toMatchObject({
      kind: 'error',
      error: expect.stringMatching(/bridge/) as string
    })
    expect((await new BridgeScriptExecutor().run(run)).error).toMatch(/bridge/)
  })

  it('pass calls through to the bridge and turn rejections into errors', async () => {
    const result = echoResponse(request)
    const outcome = { request, variables: {}, tests: [], logs: [] }
    window.wiremate = {
      platform: 'darwin',
      selectFolder: vi.fn(),
      sendHttp: vi.fn().mockResolvedValue(result),
      runScript: vi.fn().mockRejectedValue(new Error('ipc down'))
    }
    expect(await new BridgeHttpTransport().send(request)).toBe(result)
    expect(await new BridgeScriptExecutor().run(run)).toEqual({ ...outcome, error: 'ipc down' })
  })
})
