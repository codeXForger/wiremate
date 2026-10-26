import { parseQuery, splitUrl, urlWithQuery, type QueryPair } from '../http/query-params'

/** `%20` and friends become what they stand for; text that is not valid percent-encoding stays as it is. */
export function decodeParam(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

function replaceParam(pairs: QueryPair[], key: string, value: string): QueryPair[] {
  const index = pairs.findIndex((pair) => pair.key === key)
  if (index === -1) return [...pairs, { key, value }]
  return pairs
    .map((pair, i) => (i === index ? { key, value } : pair))
    .filter((pair, i) => i <= index || pair.key !== key)
}

/**
 * `wm.request.params`: the query parameters of the request's URL. Reads decode values; in the pre-request script,
 * `set` and `remove` rewrite the URL's query.
 */
export class RequestParams {
  public constructor(private readonly request: { url: string }) {}

  public readonly get = (name: string): string | undefined => {
    const pair = this.find(name)
    return pair && decodeParam(pair.value)
  }

  public readonly has = (name: string): boolean => this.find(name) !== undefined

  public readonly all = (): Record<string, string> =>
    Object.fromEntries(this.pairs().map((pair) => [decodeParam(pair.key), decodeParam(pair.value)]))

  public readonly set = (name: string, value: unknown): void =>
    this.write(replaceParam(this.pairs(), name, String(value)))

  public readonly remove = (name: string): void =>
    this.write(this.pairs().filter((pair) => decodeParam(pair.key) !== name))

  /** What `console.log(wm.request.params)` shows. */
  public readonly toJSON = (): Record<string, string> => this.all()

  private pairs(): QueryPair[] {
    return parseQuery(splitUrl(this.request.url).query ?? '')
  }

  private find(name: string): QueryPair | undefined {
    return this.pairs().find((pair) => decodeParam(pair.key) === name)
  }

  private write(pairs: QueryPair[]): void {
    this.request.url = urlWithQuery(this.request.url, pairs)
  }
}

type Methods = Pick<RequestParams, 'get' | 'has' | 'all' | 'set' | 'remove' | 'toJSON'>

function paramsHandler(params: RequestParams): ProxyHandler<Record<string, unknown>> {
  const { get, has, all, set, remove, toJSON } = params
  const methods: Methods = { get, has, all, set, remove, toJSON }
  const isMethod = (key: string): key is keyof Methods => Object.hasOwn(methods, key)
  const named = (key: string | symbol): key is string => typeof key === 'string'
  return {
    get: (_target, key) => (!named(key) ? undefined : isMethod(key) ? methods[key] : get(key)),
    has: (_target, key) => named(key) && (isMethod(key) || has(key)),
    ownKeys: () => Object.keys(all()),
    getOwnPropertyDescriptor: (_target, key) =>
      named(key) && has(key) ? { value: get(key), enumerable: true, configurable: true } : undefined,
    set: (_target, key, value) => (named(key) && set(key, value), true),
    deleteProperty: (_target, key) => (named(key) && remove(key), true)
  }
}

/**
 * What scripts see as `wm.request.params`: the methods above, and each param as a property too, so
 * `params.page`, `Object.keys(params)` and `'page' in params` work like on a plain object. Assigning or deleting a
 * property sets or removes the param. A param named like a method is still reachable with `params.get(name)`.
 */
export function paramsObject(params: RequestParams): Record<string, unknown> {
  return new Proxy<Record<string, unknown>>({}, paramsHandler(params))
}
