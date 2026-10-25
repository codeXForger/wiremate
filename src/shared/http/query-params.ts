import type { HttpConfig, KeyValue } from '../types/protocol'
import { createKeyValue } from '../utils/key-value'

interface UrlParts {
  base: string
  query: string | null
  hash: string
}

/** Splits `base?query#hash`. Query and hash keep exactly what was typed. */
export function splitUrl(url: string): UrlParts {
  const hashAt = url.indexOf('#')
  const hash = hashAt === -1 ? '' : url.slice(hashAt)
  const rest = hashAt === -1 ? url : url.slice(0, hashAt)
  const queryAt = rest.indexOf('?')
  if (queryAt === -1) return { base: rest, query: null, hash }
  return { base: rest.slice(0, queryAt), query: rest.slice(queryAt + 1), hash }
}

/** `a=1&b&c=x=y` → [a: 1, b: '', c: 'x=y']. Values stay as typed (no decoding), like the URL bar shows them. */
export function parseQuery(query: string): { key: string; value: string }[] {
  return query
    .split('&')
    .filter((part) => part !== '')
    .map((part) => {
      const equals = part.indexOf('=')
      return equals === -1 ? { key: part, value: '' } : { key: part.slice(0, equals), value: part.slice(equals + 1) }
    })
}

function enabledParams(params: KeyValue[]): KeyValue[] {
  return params.filter((row) => row.enabled && row.key !== '')
}

/** The URL with its query rebuilt from the enabled params; disabled or nameless rows stay out of it. */
export function urlWithParams(url: string, params: KeyValue[]): string {
  const { base, hash } = splitUrl(url)
  const pairs = enabledParams(params).map(({ key, value }) => (value === '' ? key : `${key}=${value}`))
  return `${base}${pairs.length > 0 ? `?${pairs.join('&')}` : ''}${hash}`
}

/**
 * The params table after the URL changed: enabled rows follow the URL's query (keeping their ids, so the table
 * does not jump), disabled rows stay as they are, and new pairs are added at the end.
 */
export function paramsFromUrl(url: string, params: KeyValue[]): KeyValue[] {
  const pairs = parseQuery(splitUrl(url).query ?? '')
  const kept = params.flatMap((row) => {
    if (!row.enabled) return [row]
    const pair = pairs.shift()
    return pair ? [{ ...row, ...pair }] : []
  })
  return [...kept, ...pairs.map((pair) => createKeyValue(pair.key, pair.value))]
}

/**
 * Brings a saved config in line with the rule that the URL shows the enabled params: older requests kept params
 * out of the URL, and hand-edited ones may have a query but no params.
 */
export function syncUrlAndParams(config: HttpConfig): HttpConfig {
  const { query } = splitUrl(config.url)
  if (query === null && enabledParams(config.params).length > 0)
    return { ...config, url: urlWithParams(config.url, config.params) }
  if (query !== null && config.params.length === 0) return { ...config, params: paramsFromUrl(config.url, []) }
  return config
}
