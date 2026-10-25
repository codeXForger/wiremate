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
