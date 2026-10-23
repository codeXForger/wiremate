import { describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '../protocols/defaults'
import type { HttpConfig } from '../types/protocol'
import { createKeyValue } from '../utils/key-value'
import { interpolate } from '../utils/interpolate'
import { finalizeRequest, findHeader, rawHttpRequest, resolveHttpRequest } from './wire-request'

function config(patch: Partial<HttpConfig> = {}): HttpConfig {
  return { ...PROTOCOL_DEFAULTS.http(), headers: [], ...patch }
}

describe('interpolate', () => {
  it('fills known placeholders and tolerates spaces', () => {
    expect(interpolate('{{ host }}/users/{{id}}', { host: 'api.test', id: '7' })).toBe('api.test/users/7')
  })

  it('leaves unknown placeholders and reports them', () => {
    const missing = new Set<string>()
    expect(interpolate('{{a}}-{{b}}', { a: '1' }, missing)).toBe('1-{{b}}')
    expect([...missing]).toEqual(['b'])
  })
})

describe('resolveHttpRequest', () => {
  it('appends enabled params and keeps placeholders in them fillable', () => {
    const params = [
      createKeyValue('q', 'a b'),
      createKeyValue('id', '{{id}}'),
      { ...createKeyValue('x', '1'), enabled: false }
    ]
    const { request } = resolveHttpRequest(config({ url: '{{base}}/s?page=1', params }), { base: 'http://h', id: '9' })
    expect(request.url).toBe('http://h/s?page=1&q=a%20b&id=9')
  })

  it('skips the query string when there are no params', () => {
    expect(resolveHttpRequest(config({ url: 'http://h' }), {}).request.url).toBe('http://h')
  })

  it('reports placeholders that have no variable', () => {
    expect(resolveHttpRequest(config({ url: '{{nope}}/x' }), {}).missing).toEqual(['nope'])
  })

  it('adds a JSON content type unless one is set', () => {
    const body = { mode: 'json' as const, content: '{"a":"{{v}}"}' }
    const { request } = resolveHttpRequest(config({ body }), { v: '1' })
    expect(request.body).toBe('{"a":"1"}')
    expect(findHeader(request.headers, 'content-type')?.value).toBe('application/json')
    const custom = config({ body, headers: [createKeyValue('content-type', 'text/x')] })
    expect(resolveHttpRequest(custom, {}).request.headers).toHaveLength(1)
  })

  it('sends no body when the mode is none', () => {
    expect(resolveHttpRequest(config(), {}).request.body).toBeNull()
  })

  it('builds bearer and basic auth headers', () => {
    const bearer = config({ auth: { type: 'bearer', token: '{{t}}', username: '', password: '' } })
    expect(findHeader(resolveHttpRequest(bearer, { t: 'abc' }).request.headers, 'Authorization')?.value).toBe(
      'Bearer abc'
    )
    const basic = config({ auth: { type: 'basic', token: '', username: 'ü', password: 'p' } })
    const value = findHeader(resolveHttpRequest(basic, {}).request.headers, 'authorization')?.value
    expect(value).toBe('Basic w7w6cA==')
  })

  it('keeps an Authorization header that is already on the request', () => {
    const auth = { type: 'bearer' as const, token: 'x', username: '', password: '' }
    const raw = { ...rawHttpRequest(config()), headers: [{ key: 'authorization', value: 'Token y' }] }
    expect(finalizeRequest(raw, auth, {}).request.headers).toEqual([{ key: 'authorization', value: 'Token y' }])
  })
})
