// @vitest-environment node
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { WireRequest } from '@shared/types/http'
import { HttpClient } from './http-client'

let server: Server
let base = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/slow') return void setTimeout(() => res.end('late'), 500)
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk.toString()))
    req.on('end', () => {
      res.writeHead(201, 'Created', { 'content-type': 'application/json', 'x-test': 'yes' })
      res.end(JSON.stringify({ method: req.method, url: req.url, header: req.headers['x-id'] ?? null, body }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

function request(patch: Partial<WireRequest>): WireRequest {
  return { method: 'GET', url: `${base}/echo`, headers: [], body: null, ...patch }
}

describe('HttpClient', () => {
  it('sends method, headers and body and reads the response', async () => {
    const result = await new HttpClient().send(
      request({ method: 'POST', headers: [{ key: 'X-Id', value: '7' }], body: 'hi' })
    )
    if (result.kind !== 'response') throw new Error(result.error)
    expect(result.status).toBe(201)
    expect(result.statusText).toBe('Created')
    expect(JSON.parse(result.body)).toEqual({ method: 'POST', url: '/echo', header: '7', body: 'hi' })
    expect(result.headers).toContainEqual({ key: 'x-test', value: 'yes' })
    expect(result.sizeBytes).toBe(result.body.length)
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(result.timings.firstByteMs)
  })

  it('drops the body of a GET request', async () => {
    const result = await new HttpClient().send(request({ body: 'ignored' }))
    expect(result.kind === 'response' && JSON.parse(result.body)).toMatchObject({ body: '' })
  })

  it('reports connection errors with their cause', async () => {
    const closed = createServer()
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve))
    const { port } = closed.address() as AddressInfo
    await new Promise((resolve) => closed.close(resolve))
    const result = await new HttpClient().send(request({ url: `http://127.0.0.1:${port}/` }))
    expect(result.kind === 'error' && result.error).toMatch(/fetch failed: .*ECONNREFUSED/)
  })

  it('gives up after the timeout', async () => {
    const result = await new HttpClient({ timeoutMs: 50 }).send(request({ url: `${base}/slow` }))
    expect(result.kind === 'error' && result.error).toMatch(/timeout|aborted/i)
  })

  it('measures time with the injected clock', async () => {
    let tick = 0
    const result = await new HttpClient({ now: () => (tick += 10) }).send(request({}))
    expect(result.kind === 'response' && result.timings).toEqual({ firstByteMs: 10, totalMs: 20 })
  })
})
