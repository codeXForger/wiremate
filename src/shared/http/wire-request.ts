import type { HeaderPair, WireRequest } from '../types/http'
import type { HttpConfig, KeyValue } from '../types/protocol'
import type { Variables } from '../types/scripting'
import { interpolate } from '../utils/interpolate'

export interface ResolvedRequest {
  request: WireRequest
  /** Placeholders that had no matching variable. */
  missing: string[]
}

type Fill = (text: string) => string

function activePairs(rows: KeyValue[]): HeaderPair[] {
  return rows.filter((row) => row.enabled && row.key.trim()).map(({ key, value }) => ({ key, value }))
}

/** URL-encodes text but leaves `{{placeholders}}` intact so they can still be filled in. */
function encodeParam(text: string): string {
  return text
    .split(/(\{\{[^}]*\}\})/)
    .map((part, index) => (index % 2 === 1 ? part : encodeURIComponent(part)))
    .join('')
}

function withParams(url: string, params: HeaderPair[]): string {
  if (params.length === 0) return url
  const query = params.map(({ key, value }) => `${encodeParam(key)}=${encodeParam(value)}`).join('&')
  return `${url}${url.includes('?') ? '&' : '?'}${query}`
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
    url: withParams(config.url.trim(), activePairs(config.params)),
    headers: [...headers, ...contentType(config, headers)],
    body: config.body.mode === 'none' ? null : config.body.content
  }
}

/** Fills in `{{variables}}` and adds the auth header unless the request already sets one. */
export function finalizeRequest(raw: WireRequest, auth: HttpConfig['auth'], variables: Variables): ResolvedRequest {
  const missing = new Set<string>()
  const fill: Fill = (text) => interpolate(text, variables, missing)
  const filled = raw.headers.map(({ key, value }) => ({ key: fill(key), value: fill(value) }))
  const headers = findHeader(filled, 'authorization') ? filled : [...filled, ...authHeader(auth, fill)]
  const body = raw.body === null ? null : fill(raw.body)
  return { request: { ...raw, url: fill(raw.url), headers, body }, missing: [...missing] }
}

/** Turns an HTTP request config into the request that is sent, with `{{variables}}` filled in. */
export function resolveHttpRequest(config: HttpConfig, variables: Variables): ResolvedRequest {
  return finalizeRequest(rawHttpRequest(config), config.auth, variables)
}
