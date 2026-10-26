import type { LineEnding, PayloadEncoding, SocketPayload } from '../types/protocol'

const LINE_ENDING_TEXT: Record<LineEnding, string> = { none: '', lf: '\n', crlf: '\r\n' }

const HEX_SEPARATORS = /[\s,:]|0x/gi

/** Reads hex like `48 65 6c`, `48:65:6c` or `0x48 0x65`. Throws on anything else. */
export function parseHex(text: string): Uint8Array {
  const digits = text.replace(HEX_SEPARATORS, '')
  if (digits.length % 2 !== 0 || /[^0-9a-f]/i.test(digits)) throw new Error('Hex payload needs pairs of 0-9 and a-f')
  return Uint8Array.from(digits.match(/../g) ?? [], (pair) => parseInt(pair, 16))
}

/** The bytes a socket sends for a message. Text gets its line ending; hex is sent exactly as written. */
export function encodePayload({ payload, encoding, lineEnding }: SocketPayload): Uint8Array {
  if (encoding === 'hex') return parseHex(payload)
  return new TextEncoder().encode(payload + LINE_ENDING_TEXT[lineEnding])
}

/** Shows received bytes as UTF-8 text, or as spaced hex pairs. */
export function decodePayload(bytes: Uint8Array, encoding: PayloadEncoding): string {
  if (encoding === 'text') return new TextDecoder().decode(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

/** `host:port`, with IPv6 hosts in brackets. */
export function formatAddress(host: string, port: number): string {
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`
}

/** Splits `host:port` or `[v6]:port`. */
export function parseAddress(address: string): { host: string; port: number } {
  const colon = address.lastIndexOf(':')
  const host = address.slice(0, colon).replace(/^\[(.*)\]$/, '$1')
  return { host, port: Number(address.slice(colon + 1)) }
}

/** Accepts only whole numbers from 0 to `max`; anything else (empty included) is 0. */
export function parseWholeNumber(value: string, max: number): number {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= max ? number : 0
}

/** How many bytes a payload sends, or null when it cannot be encoded (malformed hex). */
export function payloadSize(payload: SocketPayload): number | null {
  try {
    return encodePayload(payload).length
  } catch {
    return null
  }
}
