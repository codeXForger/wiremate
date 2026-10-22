import type { ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import { useRequestConfig } from './use-request'

/** Keys of a config whose value type is assignable to V. */
export type KeysOfType<C, V> = { [K in keyof C]-?: C[K] extends V ? K : never }[keyof C] & string

export interface Bound<V> {
  value: V
  onChange: (value: V) => void
}

export type BoundField = Bound<string>

export type ConfigBinder<P extends ProtocolId, V> = (key: KeysOfType<ProtocolConfigMap[P], V>) => Bound<V>

/** Binds individual config fields to `value` / `onChange` pairs that inputs can spread. */
export function useConfigBinder<P extends ProtocolId, V>(requestId: string): ConfigBinder<P, V> {
  const [config, update] = useRequestConfig<P>(requestId)
  return (key) => ({
    value: config[key] as V,
    onChange: (value) => update({ [key]: value } as Partial<ProtocolConfigMap[P]>)
  })
}

export function useFieldBinder<P extends ProtocolId>(requestId: string): ConfigBinder<P, string> {
  return useConfigBinder<P, string>(requestId)
}
