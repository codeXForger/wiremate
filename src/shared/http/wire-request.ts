import type { HeaderPair, WireRequest } from '../types/http'
import type { HttpConfig, KeyValue } from '../types/protocol'
import type { Variables } from '../types/scripting'
import { interpolate } from '../utils/interpolate'
import { urlWithParams } from './query-params'

export interface ResolvedRequest {
  request: WireRequest
  /** Placeholders that had no matching variable. */
  missing: string[]
}

type Fill = (text: string) => string

function activePairs(rows: KeyValue[]): HeaderPair[] {
  return rows.filter((row) => row.enabled && row.key.trim()).map(({ key, value }) => ({ key, value }))
}

function base64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}

function authHeader(auth: HttpConfig['auth'], fill: Fill): HeaderPair[] {
  if (auth.type === 'bearer') return [{ key: 'Authorization', value: `Bearer ${fill(auth.token)}` }]
  if (auth.type === 'basic') {
    return [{ key: 'Authorization', value: `Basic ${base64(`${fill(auth.username)}:${fill(auth.password)}`)}` }]
  }
  return []
}

export function findHeader(headers: HeaderPair[], name: string): HeaderPair | undefined {
  const lower = name.toLowerCase()
  return headers.find((header) => header.key.toLowerCase() === lower)
}

function contentType(config: HttpConfig, headers: HeaderPair[]): HeaderPair[] {
  if (config.body.mode !== 'json' || findHeader(headers, 'content-type')) return []
  return [{ key: 'Content-Type', value: 'application/json' }]
}

/**
 * Builds the request with `{{placeholders}}` still in place and without auth, so a pre-request script can read and
 * change it before variables are filled in.
 */
export function rawHttpRequest(config: HttpConfig): WireRequest {
  const headers = activePairs(config.headers)
  return {
    method: config.method,
    // The URL bar already shows the enabled params; rebuilding the query from them keeps the two in step.
    url: urlWithParams(config.url.trim(), config.params),
    headers: [...headers, ...contentType(config, headers)],
    body: config.body.mode === 'none' ? null : config.body.content
  }
}

/** Fills in `{{variables}}` and adds the auth header unless the request already sets one. */
export function finalizeRequest(raw: WireRequest, auth: HttpConfig['auth'], variables: Variables): ResolvedRequest {
  const missing = new Set<string>()
  const fill: Fill = (text) => interpolate(text, variables, missing)
  const url = fill(raw.url)
  const filled = raw.headers.map(({ key, value }) => ({ key: fill(key), value: fill(value) }))
  const headers = findHeader(filled, 'authorization') ? filled : [...filled, ...authHeader(auth, fill)]
  const body = raw.body === null ? null : fill(raw.body)
  return { request: { ...raw, url, headers, body }, missing: [...missing] }
}

/** Turns an HTTP request config into the request that is sent, with `{{variables}}` filled in. */
export function resolveHttpRequest(config: HttpConfig, variables: Variables): ResolvedRequest {
  return finalizeRequest(rawHttpRequest(config), config.auth, variables)
}
