const MAX_LENGTH = 300

function truncate(text: string): string {
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text
}

const UNSERIALIZABLE = new Set(['undefined', 'function', 'symbol'])

function stringify(value: unknown, indent?: number): string {
  if (UNSERIALIZABLE.has(typeof value)) return String(value)
  try {
    return JSON.stringify(value, null, indent)
  } catch {
    return String(value)
  }
}

/** A short, readable rendering of any value, used in assertion messages. */
export function describeValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (typeof value === 'function') return '[Function]'
  if (typeof value === 'bigint') return `${value.toString()}n`
  return truncate(stringify(value))
}

/** Renders a console argument: strings as they are, anything else as indented JSON. */
export function formatLogArgument(value: unknown): string {
  if (typeof value === 'string') return value
  if (isErrorLike(value)) return `${String(value.name)}: ${String(value.message)}`
  return stringify(value, 2)
}

interface ErrorLike {
  name: unknown
  message: unknown
}

/** `instanceof Error` fails for errors created in another realm (a vm context), so check the shape instead. */
export function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null && 'message' in value && 'name' in value
}

export function errorMessage(error: unknown): string {
  return isErrorLike(error) ? String(error.message) : String(error)
}
