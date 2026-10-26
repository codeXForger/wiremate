import { describe, expect, it } from 'vitest'
import type { KeyValue } from '../types/protocol'
import { mergeVariables, sameVariables, variablesOf } from './variables'

const row = (key: string, value: string, enabled = true): KeyValue => ({ id: `id_${key}`, key, value, enabled })

describe('variables', () => {
  const rows = [row('a', '1'), row('b', '2'), row('off', 'x', false), row(' ', 'blank')]

  it('reads enabled, named rows', () => {
    expect(variablesOf(rows)).toEqual({ a: '1', b: '2' })
  })

  it('compares variable maps', () => {
    expect(sameVariables({ a: '1' }, { a: '1' })).toBe(true)
    expect(sameVariables({ a: '1' }, { a: '2' })).toBe(false)
    expect(sameVariables({ a: '1' }, { a: '1', b: '2' })).toBe(false)
  })

  it('updates, removes and appends rows while keeping disabled ones', () => {
    const merged = mergeVariables(rows, { a: '9', c: '3', off: 'new' })
    expect(merged.map(({ key, value, enabled }) => [key, value, enabled])).toEqual([
      ['a', '9', true],
      ['off', 'x', false],
      ['c', '3', true],
      ['off', 'new', true]
    ])
    expect(merged[0]?.id).toBe('id_a')
  })
})
