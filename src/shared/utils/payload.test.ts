import { describe, expect, it } from 'vitest'
import { decodePayload, encodePayload, formatAddress, parseAddress, parseHex, parseWholeNumber } from './payload'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('socket payloads', () => {
  it('encodes text with its line ending', () => {
    expect(text(encodePayload({ payload: 'hi', encoding: 'text', lineEnding: 'none' }))).toBe('hi')
    expect(text(encodePayload({ payload: 'hi', encoding: 'text', lineEnding: 'lf' }))).toBe('hi\n')
    expect(text(encodePayload({ payload: 'hi', encoding: 'text', lineEnding: 'crlf' }))).toBe('hi\r\n')
  })

  it('encodes hex as written, ignoring the line ending', () => {
    expect([...encodePayload({ payload: '48 69', encoding: 'hex', lineEnding: 'lf' })]).toEqual([0x48, 0x69])
  })

  it.each(['48 65 6c', '48:65:6c', '0x48 0x65 0x6C', '48656c', '48,65,6c'])('reads hex written as %s', (hex) => {
    expect([...parseHex(hex)].slice(0, 2)).toEqual([0x48, 0x65])
  })

  it.each(['4', 'zz', '48 6'])('rejects hex %s', (hex) => {
    expect(() => parseHex(hex)).toThrow('Hex payload needs pairs')
  })

  it('reads an empty hex payload as no bytes', () => {
    expect(parseHex('')).toHaveLength(0)
  })

  it('decodes bytes as text or hex', () => {
    const bytes = Uint8Array.from([0x68, 0x69, 0x0a])
    expect(decodePayload(bytes, 'text')).toBe('hi\n')
    expect(decodePayload(bytes, 'hex')).toBe('68 69 0a')
  })
})

describe('socket addresses', () => {
  it('formats and parses IPv4 and IPv6 addresses', () => {
    expect(formatAddress('127.0.0.1', 80)).toBe('127.0.0.1:80')
    expect(formatAddress('::1', 80)).toBe('[::1]:80')
    expect(parseAddress('127.0.0.1:80')).toEqual({ host: '127.0.0.1', port: 80 })
    expect(parseAddress('[::1]:80')).toEqual({ host: '::1', port: 80 })
  })

  it.each([
    ['9000', 9000],
    ['65535', 65535],
    ['', 0],
    ['70000', 0],
    ['1.5', 0],
    ['abc', 0]
  ])('reads %s as %d', (input, expected) => {
    expect(parseWholeNumber(input, 65535)).toBe(expected)
  })
})
