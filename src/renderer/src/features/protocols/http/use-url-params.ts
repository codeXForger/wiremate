import { paramsFromUrl, urlWithParams } from '@shared/http/query-params'
import type { KeyValue } from '@shared/types/protocol'
import { useRequestConfig } from '../../request/use-request'
import type { Bound, BoundField } from '../../request/use-field-binder'

export interface UrlAndParams {
  url: BoundField
  params: Bound<KeyValue[]>
}

/** The URL bar and the Params table, kept in step: editing either one updates the other in the same change. */
export function useUrlParams(requestId: string): UrlAndParams {
  const [config, update] = useRequestConfig<'http'>(requestId)
  return {
    url: { value: config.url, onChange: (url) => update({ url, params: paramsFromUrl(url, config.params) }) },
    params: { value: config.params, onChange: (params) => update({ params, url: urlWithParams(config.url, params) }) }
  }
}
