import { describe, expect, it } from 'vitest'
import { Globe } from 'lucide-react'
import { PROTOCOL_IDS } from '@shared/types/protocol'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { protocolRegistry } from '.'
import { ProtocolRegistry } from './registry'
import { formatTarget, parsePort } from './socket/parse-target'

describe('ProtocolRegistry', () => {
  it('registers every protocol on import', () => {
    expect(protocolRegistry.list().map((p) => p.id)).toEqual([...PROTOCOL_IDS])
  })

  it('throws for unknown protocols', () => {
    const registry = new ProtocolRegistry()
    expect(() => registry.get('http')).toThrow('Protocol "http" is not registered')
    registry.register({ id: 'http', meta: PROTOCOL_METADATA.http, icon: Globe, Editor: () => null })
    expect(registry.get('http').meta.label).toBe('HTTP')
  })
})

describe('socket target helpers', () => {
  it.each([
    ['9000', 9000],
    ['65535', 65535],
    ['', 0],
    ['70000', 0],
    ['1.5', 0],
    ['abc', 0]
  ])('parses port %s as %d', (input, expected) => {
    expect(parsePort(input)).toBe(expected)
  })

  it('formats host and port for connecting', () => {
    expect(formatTarget({ host: 'example.com', port: 80 })).toBe('example.com:80')
  })
})
