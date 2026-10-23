import { describe, expect as vitestExpect, it } from 'vitest'
import { describeValue, errorMessage, formatLogArgument } from './describe'
import { AssertionError, expect, isDeepEqual } from './expect'

function failure(assertion: () => void): string {
  try {
    assertion()
  } catch (error) {
    vitestExpect(error).toBeInstanceOf(AssertionError)
    return (error as Error).message
  }
  throw new Error('assertion passed')
}

describe('expect', () => {
  it('passes matching assertions', () => {
    const body = { user: { id: 1, tags: ['a'] } }
    expect(200).toBe(200)
    expect(body).toEqual({ user: { id: 1, tags: ['a'] } })
    expect(1).toBeTruthy()
    expect('').toBeFalsy()
    expect(0).toBeDefined()
    expect(null).toBeNull()
    expect('x').toBeTypeOf('string')
    expect(201).toBeOneOf([200, 201])
    expect('hello').toContain('ell')
    expect([{ a: 1 }]).toContain({ a: 1 })
    expect(body).toHaveProperty('user.id')
    expect(body).toHaveProperty('user.id', 1)
    expect([1, 2]).toHaveLength(2)
    expect('abc').toMatch(/b/)
    expect('abc').toMatch('c')
    expect(5).toBeGreaterThan(4)
    expect(5).toBeLessThan(6)
  })

  it('explains failures', () => {
    vitestExpect(failure(() => expect(404).toBe(200))).toBe('expected 404 to be 200')
    vitestExpect(failure(() => expect({ a: 1 }).toHaveProperty('a.b'))).toBe('expected {"a":1} to have property "a.b"')
    vitestExpect(failure(() => expect({ a: 1 }).toHaveProperty('a', 2))).toBe(
      'expected {"a":1} to have property "a" equal to 2'
    )
    vitestExpect(failure(() => expect('abc').toMatch(/z/))).toBe('expected "abc" to match "/z/"')
    vitestExpect(failure(() => expect(1).toHaveLength(1))).toBe('expected 1 to have length 1')
    vitestExpect(failure(() => expect('5').toBeGreaterThan(1))).toContain('greater than')
    vitestExpect(failure(() => expect(3).toMatch('3'))).toContain('to match')
    vitestExpect(failure(() => expect(3).toContain(3))).toContain('to contain')
  })

  it('negates with .not', () => {
    expect(1).not.toBe(2)
    expect([1]).not.toEqual([1, 2])
    vitestExpect(failure(() => expect(1).not.toBe(1))).toBe('expected 1 not to be 1')
  })
})

describe('isDeepEqual', () => {
  it('compares structure, not identity', () => {
    vitestExpect(isDeepEqual({ a: [1] }, { a: [1] })).toBe(true)
    vitestExpect(isDeepEqual([1], { 0: 1 })).toBe(false)
    vitestExpect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    vitestExpect(isDeepEqual({ a: 1 }, { b: 1 })).toBe(false)
    vitestExpect(isDeepEqual(1, '1')).toBe(false)
  })
})

describe('describe helpers', () => {
  it('renders values for messages', () => {
    vitestExpect(describeValue(undefined)).toBe('undefined')
    vitestExpect(describeValue(() => 1)).toBe('[Function]')
    vitestExpect(describeValue(10n)).toBe('10n')
    vitestExpect(describeValue('x'.repeat(400))).toHaveLength(301)
  })

  it('renders console arguments', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    vitestExpect(formatLogArgument('text')).toBe('text')
    vitestExpect(formatLogArgument({ a: 1 })).toBe('{\n  "a": 1\n}')
    vitestExpect(formatLogArgument(new TypeError('bad'))).toBe('TypeError: bad')
    vitestExpect(formatLogArgument(Symbol('s'))).toBe('Symbol(s)')
    vitestExpect(formatLogArgument(cyclic)).toBe('[object Object]')
  })

  it('reads messages from errors and anything else', () => {
    vitestExpect(errorMessage(new Error('boom'))).toBe('boom')
    vitestExpect(errorMessage('plain')).toBe('plain')
  })
})
