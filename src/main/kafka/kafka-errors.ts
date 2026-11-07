import { errorMessage } from '@shared/scripting/describe'

/** Generic wrappers the library puts around the real reason; the broker's own message says more. */
const NOISE = /^Received response with error while executing API/

/** The `errorMessage` texts a broker put in a response, wherever they sit. */
function brokerMessages(value: unknown, depth = 0): string[] {
  if (depth > 3 || typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, inner]) => {
    if (key === 'errorMessage' && typeof inner === 'string') return [inner]
    return brokerMessages(inner, depth + 1)
  })
}

function messagesOf(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) return [errorMessage(error)]
  const nested = 'errors' in error && Array.isArray(error.errors) ? error.errors.flatMap(messagesOf) : []
  const response = 'response' in error ? brokerMessages(error.response) : []
  return [errorMessage(error), ...nested, ...response]
}

/**
 * One readable line from the library's nested errors: "Listing topics failed. Connection to localhost:9999 failed."
 * Repeats (one per retry) are dropped.
 */
export function describeKafkaError(error: unknown): string {
  const unique = [...new Set(messagesOf(error).map((message) => message.trim()))]
  const meaningful = unique.filter((message) => message !== '' && !NOISE.test(message))
  return meaningful.map((message) => (/[.!?]$/.test(message) ? message : `${message}.`)).join(' ')
}
