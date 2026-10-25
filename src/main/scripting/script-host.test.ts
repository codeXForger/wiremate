import { describe, expect, it } from 'vitest'
import { executeScript } from '@shared/scripting/script-host'
import type { WireResponse } from '@shared/types/http'
import type { ScriptRun } from '@shared/types/scripting'
import { createVmEvaluate } from './vm-evaluate'

const evaluate = createVmEvaluate(200)

const response: WireResponse = {
  kind: 'response',
  status: 200,
  statusText: 'OK',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  body: '{"token":"abc","items":[1,2]}',
  sizeBytes: 30,
  timings: { firstByteMs: 10, totalMs: 25 }
}

function run(code: string, patch: Partial<ScriptRun> = {}): ScriptRun {
  const request = { method: 'GET' as const, url: 'http://h/x', headers: [{ key: 'Accept', value: '*/*' }], body: null }
  return { phase: 'post', code, request, response, variables: { keep: '1', drop: '2' }, ...patch }
}

describe('executeScript', () => {
  it('reads the response and sets environment variables', async () => {
    const outcome = await executeScript(
      run(`
        const data = wm.response.json()
        wm.env.set('token', data.token)
        wm.env.set('count', data.items.length)
        wm.env.set('obj', { a: 1 })
        wm.env.unset('drop')
        wm.env.set('seen', [wm.env.get('keep'), wm.env.has('drop'), Object.keys(wm.env.all()).length].join())
      `),
      evaluate
    )
    expect(outcome.error).toBeUndefined()
    expect(outcome.variables).toEqual({ keep: '1', token: 'abc', count: '2', obj: '{"a":1}', seen: '1,false,4' })
  })

  it('records passing, failing and async tests in order', async () => {
    const outcome = await executeScript(
      run(`
        wm.test('status is 200', () => wm.expect(wm.response.status).toBe(200))
        wm.test('has items', () => wm.expect(wm.response.json()).toHaveProperty('items', [1, 2]))
        wm.test('fast', () => wm.expect(wm.response.time).toBeLessThan(5))
        wm.test('async', async () => { await null; throw new Error('late') })
        wm.test('header', () => wm.expect(wm.response.headers.get('content-type')).toMatch(/json/))
      `),
      evaluate
    )
    expect(outcome.tests).toEqual([
      { name: 'status is 200', passed: true },
      { name: 'has items', passed: true },
      { name: 'fast', passed: false, error: 'expected 25 to be less than 5' },
      { name: 'async', passed: false, error: 'late' },
      { name: 'header', passed: true }
    ])
  })

  it('captures console output at each level', async () => {
    const outcome = await executeScript(
      run(
        `console.log('a', 1, { b: 2 }); console.debug('d'); console.info('i'); console.warn('w'); console.error(new Error('e'))`
      ),
      evaluate
    )
    expect(outcome.logs).toEqual([
      { level: 'log', message: 'a 1 {\n  "b": 2\n}' },
      { level: 'log', message: 'd' },
      { level: 'info', message: 'i' },
      { level: 'warn', message: 'w' },
      { level: 'error', message: 'Error: e' }
    ])
  })

  it('lets a pre-request script change the request', async () => {
    const outcome = await executeScript(
      run(
        `
        wm.request.method = 'post'
        wm.request.url = wm.request.url + '?v=1'
        wm.request.body = { hello: 'world' }
        wm.request.headers.set('accept', 'application/json')
        wm.request.headers.set('X-Id', 42)
        wm.request.headers.remove('nothing')
        console.log(wm.phase, wm.response === undefined, wm.request.headers.has('x-id'), wm.request.body)
      `,
        { phase: 'pre', response: undefined }
      ),
      evaluate
    )
    expect(outcome.request).toEqual({
      method: 'POST',
      url: 'http://h/x?v=1',
      headers: [
        { key: 'accept', value: 'application/json' },
        { key: 'X-Id', value: '42' }
      ],
      body: '{"hello":"world"}'
    })
    expect(outcome.logs[0]?.message).toBe('pre true true {"hello":"world"}')
  })

  it('reads query params from the request that was sent', async () => {
    const request = { method: 'GET' as const, url: 'http://h/users?page=2&q=a%20b&flag#top', headers: [], body: null }
    const outcome = await executeScript(
      run(
        `console.log(wm.request.params.get('page'), wm.request.params.get('q'), wm.request.params.has('flag'), wm.request.params.get('nope'))
         console.log(wm.request.params)`,
        { request }
      ),
      evaluate
    )
    expect(outcome.logs.map((log) => log.message)).toEqual([
      '2 a b true undefined',
      '{\n  "page": "2",\n  "q": "a b",\n  "flag": ""\n}'
    ])
  })

  it('reads params as properties too, like a plain object', async () => {
    const request = { method: 'GET' as const, url: 'http://h/users?page=4&size=10&get=x', headers: [], body: null }
    const outcome = await executeScript(
      run(
        `const params = wm.request.params
         console.log(params.page, params['size'], params.missing, 'page' in params, 'nope' in params, 'all' in params)
         console.log(Object.keys(params).join(), JSON.stringify({ ...params }), params.get('get'), typeof params[Symbol.iterator])`,
        { request }
      ),
      evaluate
    )
    expect(outcome.logs.map((log) => log.message)).toEqual([
      '4 10 undefined true false true',
      // A param named like a method reads as the method; params.get(name) still returns its value.
      'page,size,get {"page":"4","size":"10"} x undefined'
    ])
  })

  it('sets and deletes params through properties in a pre-request script', async () => {
    const request = { method: 'GET' as const, url: 'http://h/users?page=1&debug', headers: [], body: null }
    const outcome = await executeScript(
      run('wm.request.params.page = 2; wm.request.params.size = 10; delete wm.request.params.debug', {
        phase: 'pre',
        request
      }),
      evaluate
    )
    expect(outcome.request.url).toBe('http://h/users?page=2&size=10')
  })

  it('lets a pre-request script set and remove query params', async () => {
    const request = { method: 'GET' as const, url: 'http://h/users?page=2&tag=a&tag=b#top', headers: [], body: null }
    const outcome = await executeScript(
      run(
        "wm.request.params.set('page', 3); wm.request.params.set('tag', 'c'); wm.request.params.set('limit', 10); wm.request.params.remove('nothing')",
        {
          phase: 'pre',
          request
        }
      ),
      evaluate
    )
    expect(outcome.request.url).toBe('http://h/users?page=3&tag=c&limit=10#top')
    const removed = await executeScript(run("wm.request.params.remove('page')", { phase: 'pre', request }), evaluate)
    expect(removed.request.url).toBe('http://h/users?tag=a&tag=b#top')
  })

  it('logs the request and response as readable objects', async () => {
    const request = {
      method: 'POST' as const,
      url: 'http://h/x?id=7',
      headers: [{ key: 'Accept', value: '*/*' }],
      body: '{}'
    }
    const outcome = await executeScript(run('console.log(wm.request); console.log(wm.response)', { request }), evaluate)
    expect(JSON.parse(outcome.logs[0]!.message)).toEqual({
      method: 'POST',
      url: 'http://h/x?id=7',
      params: { id: '7' },
      headers: { Accept: '*/*' },
      body: '{}'
    })
    expect(JSON.parse(outcome.logs[1]!.message)).toEqual({
      status: 200,
      statusText: 'OK',
      time: 25,
      size: 30,
      headers: { 'Content-Type': 'application/json' },
      body: { token: 'abc', items: [1, 2] }
    })
    const text = await executeScript(
      run('console.log(wm.response)', { response: { ...response, body: 'plain' } }),
      evaluate
    )
    expect(JSON.parse(text.logs[0]!.message)).toMatchObject({ body: 'plain' })
  })

  it('clears the body and rejects unknown methods', async () => {
    const cleared = await executeScript(run('wm.request.body = null'), evaluate)
    expect(cleared.request.body).toBeNull()
    const outcome = await executeScript(run("wm.request.method = 'FETCH'"), evaluate)
    expect(outcome.error).toMatch(/Unsupported HTTP method "FETCH"/)
  })

  it('keeps what ran before an error, and supports await and return', async () => {
    const outcome = await executeScript(
      run(`wm.env.set('a', 'x'); await Promise.resolve(); if (true) return; boom()`),
      evaluate
    )
    expect(outcome.error).toBeUndefined()
    const failed = await executeScript(run(`wm.env.set('a', 'x'); console.log('before'); undefinedFn()`), evaluate)
    expect(failed.error).toBe('undefinedFn is not defined')
    expect(failed.variables['a']).toBe('x')
    expect(failed.logs).toHaveLength(1)
  })

  it('stops scripts that loop forever', async () => {
    const outcome = await executeScript(run('while (true) {}'), evaluate)
    expect(outcome.error).toMatch(/timed out/)
  })

  it('returns the input unchanged for a blank script', async () => {
    const outcome = await executeScript(run('  \n'), evaluate)
    expect(outcome).toEqual({ request: run('').request, variables: { keep: '1', drop: '2' }, tests: [], logs: [] })
  })
})
