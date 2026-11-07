import { describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '../protocols/defaults'
import {
  formatAssignment,
  kafkaConnection,
  parseOffset,
  parsePartition,
  parseTimestamp,
  recordLocation,
  splitList
} from './kafka-text'

describe('kafka text', () => {
  it('splits lists and keeps only the connection of a config', () => {
    expect(splitList(' a, b,,c ')).toEqual(['a', 'b', 'c'])
    const connection = kafkaConnection({ ...PROTOCOL_DEFAULTS.kafka(), topic: 'orders' })
    expect(connection).toEqual({
      brokers: 'localhost:9092',
      clientId: 'wiremate',
      auth: 'none',
      username: '',
      password: '',
      ssl: false
    })
  })

  it('parses partitions, offsets and times', () => {
    expect(parsePartition(' ')).toBeUndefined()
    expect(parsePartition(' 2 ')).toBe(2)
    expect(() => parsePartition('-1')).toThrow('Partition "-1" is not a whole number')
    expect(parseOffset(' 42 ')).toBe('42')
    expect(() => parseOffset('x')).toThrow('Offset "x" is not a whole number')
    expect(parseTimestamp('1000')).toBe(1000)
    expect(parseTimestamp('2026-01-01T00:00:00Z')).toBe(Date.UTC(2026, 0, 1))
    expect(() => parseTimestamp('')).toThrow('is not a date and time')
    expect(() => parseTimestamp('soon')).toThrow('"soon" is not a date and time')
  })

  it('formats assignments and record locations', () => {
    expect(formatAssignment('orders', [2, 0, 1])).toBe('orders[0,1,2]')
    expect(recordLocation({ topic: 'orders', partition: 1, offset: '42' })).toBe('orders[1]@42')
    expect(recordLocation({ topic: 'orders', partition: 1, offset: '' })).toBe('orders[1]')
    expect(recordLocation({ topic: 'orders', partition: -1, offset: '' })).toBe('orders')
  })
})
