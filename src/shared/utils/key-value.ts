import type { KeyValue } from '../types/protocol'
import { createId } from './id'

export function createKeyValue(key = '', value = ''): KeyValue {
  return { id: createId('kv'), key, value, enabled: true }
}

export function updateKeyValue(rows: KeyValue[], id: string, patch: Partial<KeyValue>): KeyValue[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
}

export function removeKeyValue(rows: KeyValue[], id: string): KeyValue[] {
  return rows.filter((row) => row.id !== id)
}
