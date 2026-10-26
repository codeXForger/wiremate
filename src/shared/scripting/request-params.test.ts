import { describe, expect, it } from 'vitest'
import { decodeParam } from './request-params'

describe('decodeParam', () => {
  it('decodes percent-encoding and keeps malformed text', () => {
    expect(decodeParam('a%20b')).toBe('a b')
    expect(decodeParam('100%')).toBe('100%')
  })
})
