import type { ProtocolConfigMap } from '@shared/types/protocol'
import type { Bound, KeysOfType } from '../../request/use-field-binder'
import { useRequestConfig } from '../../request/use-request'

export type SocketProtocol = 'tcp' | 'udp'

type OptionsOf<P extends SocketProtocol> = ProtocolConfigMap[P]['options']

export type OptionsBinder<P extends SocketProtocol, V> = (key: KeysOfType<OptionsOf<P>, V>) => Bound<V>

/** Like `useConfigBinder`, for the fields of a socket config's `options`. */
export function useOptionsBinder<P extends SocketProtocol, V>(requestId: string): OptionsBinder<P, V> {
  const [config, update] = useRequestConfig<P>(requestId)
  const options = config.options as unknown as Record<string, unknown>
  return (key) => ({
    value: options[key] as V,
    onChange: (value) => update({ options: { ...options, [key]: value } } as unknown as Partial<ProtocolConfigMap[P]>)
  })
}
