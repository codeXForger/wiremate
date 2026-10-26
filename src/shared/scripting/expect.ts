import { describeValue } from './describe'

export class AssertionError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}

type Data = Record<string, unknown>

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!isData(a) || !isData(b) || Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.hasOwn(b, key) && isDeepEqual(a[key], b[key]))
}

function contains(container: unknown, item: unknown): boolean {
  if (typeof container === 'string') return container.includes(String(item))
  return Array.isArray(container) && container.some((entry) => isDeepEqual(entry, item))
}

interface Lookup {
  found: boolean
  value?: unknown
}

function propertyAt(value: unknown, path: string): Lookup {
  let current = value
  for (const key of path.split('.')) {
    if (!isData(current) || !Object.hasOwn(current, key)) return { found: false }
    current = current[key]
  }
  return { found: true, value: current }
}

function lengthOf(value: unknown): number | undefined {
  return typeof value === 'string' || Array.isArray(value) ? value.length : undefined
}

/** RegExps made inside a vm context fail `instanceof RegExp` here, so check the tag instead. */
function matches(value: unknown, pattern: unknown): boolean {
  if (typeof value !== 'string') return false
  if (Object.prototype.toString.call(pattern) === '[object RegExp]') {
    return RegExp.prototype.test.call(pattern, value)
  }
  return value.includes(String(pattern))
}

function compare(actual: unknown, limit: number, direction: 1 | -1): boolean {
  return typeof actual === 'number' && (actual - limit) * direction > 0
}

/** The assertions behind `wm.expect(value)`. Each one throws an `AssertionError` when it fails. */
export class Expectation {
  public constructor(
    private readonly actual: unknown,
    private readonly negated = false
  ) {}

  public get not(): Expectation {
    return new Expectation(this.actual, !this.negated)
  }

  public toBe(expected: unknown): void {
    this.check(Object.is(this.actual, expected), 'to be', [expected])
  }

  public toEqual(expected: unknown): void {
    this.check(isDeepEqual(this.actual, expected), 'to equal', [expected])
  }

  public toBeTruthy(): void {
    this.check(Boolean(this.actual), 'to be truthy')
  }

  public toBeFalsy(): void {
    this.check(!this.actual, 'to be falsy')
  }

  public toBeDefined(): void {
    this.check(this.actual !== undefined, 'to be defined')
  }

  public toBeNull(): void {
    this.check(this.actual === null, 'to be null')
  }

  public toBeTypeOf(type: string): void {
    this.check(typeof this.actual === type, 'to be of type', [type])
  }

  public toBeOneOf(options: unknown[]): void {
    this.check(
      options.some((option) => isDeepEqual(option, this.actual)),
      'to be one of',
      [options]
    )
  }

  public toContain(item: unknown): void {
    this.check(contains(this.actual, item), 'to contain', [item])
  }

  public toHaveProperty(path: string, ...value: unknown[]): void {
    const lookup = propertyAt(this.actual, path)
    const pass = lookup.found && (value.length === 0 || isDeepEqual(lookup.value, value[0]))
    const verb = value.length === 0 ? `to have property "${path}"` : `to have property "${path}" equal to`
    this.check(pass, verb, value)
  }

  public toHaveLength(length: number): void {
    this.check(lengthOf(this.actual) === length, 'to have length', [length])
  }

  public toMatch(pattern: RegExp | string): void {
    this.check(matches(this.actual, pattern), 'to match', [pattern instanceof RegExp ? String(pattern) : pattern])
  }

  public toBeGreaterThan(limit: number): void {
    this.check(compare(this.actual, limit, 1), 'to be greater than', [limit])
  }

  public toBeLessThan(limit: number): void {
    this.check(compare(this.actual, limit, -1), 'to be less than', [limit])
  }

  private check(pass: boolean, verb: string, expected: unknown[] = []): void {
    if (pass !== this.negated) return
    const target = expected.length > 0 ? ` ${describeValue(expected[0])}` : ''
    const negation = this.negated ? 'not ' : ''
    throw new AssertionError(`expected ${describeValue(this.actual)} ${negation}${verb}${target}`)
  }
}

export function expect(actual: unknown): Expectation {
  return new Expectation(actual)
}
