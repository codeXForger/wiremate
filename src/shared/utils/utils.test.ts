import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration } from './format'
import { createId } from './id'
import { createKeyValue, removeKeyValue, updateKeyValue } from './key-value'
import { segmentAt, templateSegments } from './interpolate'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2.0 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
    [3 * 1024 ** 4, '3072.0 GB']
  ])('formats %d as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('formatDuration', () => {
  it('uses milliseconds below one second', () => {
    expect(formatDuration(48.4)).toBe('48 ms')
  })

  it('uses seconds from one second up', () => {
    expect(formatDuration(1530)).toBe('1.53 s')
  })
})

describe('createId', () => {
  it('prefixes ids and keeps them unique', () => {
    const first = createId('req')
    expect(first).toMatch(/^req_[0-9a-f]{8}$/)
    expect(createId('req')).not.toBe(first)
  })

  it('falls back to a generic prefix', () => {
    expect(createId()).toMatch(/^id_/)
  })
})

describe('key-value helpers', () => {
  it('creates enabled rows', () => {
    expect(createKeyValue('a', 'b')).toMatchObject({ key: 'a', value: 'b', enabled: true })
    expect(createKeyValue()).toMatchObject({ key: '', value: '' })
  })

  it('updates and removes rows by id', () => {
    const rows = [createKeyValue('a'), createKeyValue('b')]
    const [first, second] = rows
    const updated = updateKeyValue(rows, first!.id, { value: 'x' })
    expect(updated[0]!.value).toBe('x')
    expect(updated[1]).toBe(second)
    expect(removeKeyValue(rows, first!.id)).toEqual([second])
  })
})

describe('templateSegments', () => {
  it('splits text into plain runs and placeholders with their offsets', () => {
    expect(templateSegments('{{base}}/users/{{ id }}?x=1')).toEqual([
      { text: '{{base}}', start: 0, variable: 'base' },
      { text: '/users/', start: 8 },
      { text: '{{ id }}', start: 15, variable: 'id' },
      { text: '?x=1', start: 23 }
    ])
    expect(templateSegments('plain')).toEqual([{ text: 'plain', start: 0 }])
    expect(templateSegments('')).toEqual([])
  })

  it('finds the placeholder at an offset, edges included', () => {
    const segments = templateSegments('a{{b}}c')
    expect(segmentAt(segments, 1)?.variable).toBe('b')
    expect(segmentAt(segments, 6)?.variable).toBe('b')
    expect(segmentAt(segments, 0)).toBeUndefined()
    expect(segmentAt(segments, 7)).toBeUndefined()
  })
})
