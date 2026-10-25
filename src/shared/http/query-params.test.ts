import { describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '../protocols/defaults'
import type { KeyValue } from '../types/protocol'
import { toRequestDocument } from '../workspace/workspace-files'
import { paramsFromUrl, parseQuery, splitUrl, syncUrlAndParams, urlWithParams } from './query-params'

const row = (id: string, key: string, value: string): KeyValue => ({ id, key, value, enabled: true })
const off = (id: string, key: string, value: string): KeyValue => ({ ...row(id, key, value), enabled: false })

describe('query params', () => {
  it('splits a URL into base, query and hash', () => {
    expect(splitUrl('http://h/p?a=1#x')).toEqual({ base: 'http://h/p', query: 'a=1', hash: '#x' })
    expect(splitUrl('http://h/p#x?no')).toEqual({ base: 'http://h/p', query: null, hash: '#x?no' })
    expect(splitUrl('{{base}}/p?')).toEqual({ base: '{{base}}/p', query: '', hash: '' })
  })

  it('parses a query as typed', () => {
    expect(parseQuery('a=1&&b&c=x=y&d=%20')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '' },
      { key: 'c', value: 'x=y' },
      { key: 'd', value: '%20' }
    ])
  })

  it('rebuilds the query from enabled, named params', () => {
    const params = [row('1', 'a', '1'), row('2', 'flag', ''), off('3', 'off', 'x'), row('4', '', 'nameless')]
    expect(urlWithParams('http://h/p?old=1#top', params)).toBe('http://h/p?a=1&flag#top')
    expect(urlWithParams('http://h/p?old=1', [])).toBe('http://h/p')
  })

  it('updates the table from the URL, keeping ids and switched-off rows', () => {
    const params = [row('1', 'a', '1'), off('2', 'off', 'x'), row('3', 'b', '2')]
    const next = paramsFromUrl('http://h?a=9&c=3&d', params)
    expect(next.map(({ id, key, value, enabled }) => [id, key, value, enabled])).toEqual([
      ['1', 'a', '9', true],
      ['2', 'off', 'x', false],
      ['3', 'c', '3', true],
      [next[3]!.id, 'd', '', true]
    ])
    expect(paramsFromUrl('http://h', params).map((r) => r.key)).toEqual(['off'])
  })

  it('brings saved requests in line with their params', () => {
    const base = PROTOCOL_DEFAULTS.http()
    expect(syncUrlAndParams({ ...base, url: 'http://h', params: [row('1', 'a', '1')] }).url).toBe('http://h?a=1')
    expect(syncUrlAndParams({ ...base, url: 'http://h?b=2', params: [] }).params).toMatchObject([
      { key: 'b', value: '2' }
    ])
    const synced = { ...base, url: 'http://h?a=1', params: [row('1', 'a', '1'), off('2', 'b', '2')] }
    expect(syncUrlAndParams(synced)).toBe(synced)
    const mixed = syncUrlAndParams({
      ...base,
      url: 'http://h?page=2',
      params: [row('1', 'limit', '10'), off('2', 'x', '1')]
    })
    expect(mixed.url).toBe('http://h?page=2&limit=10')
    expect(mixed.params.map((p) => [p.key, p.enabled])).toEqual([
      ['page', true],
      ['limit', true],
      ['x', false]
    ])
    const file = {
      id: 'req_1',
      name: 'R',
      protocol: 'http' as const,
      config: { url: 'http://h', params: [row('1', 'x', 'y')] }
    }
    expect(toRequestDocument(file).config).toMatchObject({ url: 'http://h?x=y' })
    const socket = { id: 'req_2', name: 'S', protocol: 'websocket' as const, config: {} }
    expect(toRequestDocument(socket).config).toMatchObject({ url: 'wss://echo.websocket.org' })
  })
})
