import { describe, expect, it } from 'vitest'
import { PROTOCOL_IDS } from '../types/protocol'
import { PROTOCOL_METADATA } from './metadata'
import { RequestFactory } from './request-factory'

describe('RequestFactory', () => {
  it.each(PROTOCOL_IDS)('creates a %s request with defaults', (protocol) => {
    const request = RequestFactory.create(protocol, 'Example')
    expect(request).toMatchObject({ name: 'Example', protocol })
    expect(request.id).toMatch(/^req_/)
    expect(request.config).toBeTypeOf('object')
  })

  it('gives each request its own config object', () => {
    const a = RequestFactory.create('http', 'a')
    const b = RequestFactory.create('http', 'b')
    expect(a.config).not.toBe(b.config)
    expect(a.config.headers[0]!.id).not.toBe(b.config.headers[0]!.id)
  })
})

describe('PROTOCOL_METADATA', () => {
  it('describes every protocol', () => {
    expect(Object.keys(PROTOCOL_METADATA).sort()).toEqual([...PROTOCOL_IDS].sort())
  })
})
