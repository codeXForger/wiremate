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
export function parseQuery(query: string): QueryPair[] {
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

export interface QueryPair {
  key: string
  value: string
}

/** The URL with its query replaced by these pairs (`key` alone when the value is empty). */
export function urlWithQuery(url: string, pairs: QueryPair[]): string {
  const { base, hash } = splitUrl(url)
  const parts = pairs.map(({ key, value }) => (value === '' ? key : `${key}=${value}`))
  return `${base}${parts.length > 0 ? `?${parts.join('&')}` : ''}${hash}`
}

/** The URL with its query rebuilt from the enabled params; disabled or nameless rows stay out of it. */
export function urlWithParams(url: string, params: KeyValue[]): string {
  return urlWithQuery(url, enabledParams(params))
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

/** True when the URL's query lists exactly the enabled params, in order: the state the editor keeps. */
function inStep(config: HttpConfig): boolean {
  const pairs = parseQuery(splitUrl(config.url).query ?? '')
  const enabled = enabledParams(config.params)
  const matches = (pair: { key: string; value: string }, row: KeyValue | undefined): boolean =>
    row !== undefined && row.key === pair.key && row.value === pair.value
  return pairs.length === enabled.length && pairs.every((pair, i) => matches(pair, enabled[i]))
}

/**
 * Brings a saved config in line with the rule that the URL shows the enabled params. Older versions sent the URL
 * (with whatever query was typed) followed by the params, so that is the order they are merged in.
 */
export function syncUrlAndParams(config: HttpConfig): HttpConfig {
  if (inStep(config)) return config
  const params = [...paramsFromUrl(config.url, []), ...config.params]
  return { ...config, params, url: urlWithParams(config.url, params) }
}
