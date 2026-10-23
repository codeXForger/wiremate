import type { KeyValue } from '../types/protocol'
import type { Variables } from '../types/scripting'
import { createKeyValue } from './key-value'

/** The enabled rows of an environment as a name → value map. */
export function variablesOf(rows: KeyValue[]): Variables {
  return Object.fromEntries(rows.filter((row) => row.enabled && row.key.trim()).map((row) => [row.key, row.value]))
}

export function sameVariables(a: Variables, b: Variables): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}

/**
 * Writes script changes back onto environment rows: updates values in place, drops enabled rows that were unset and
 * appends new names. Disabled rows were never visible to the script, so they stay as they are.
 */
export function mergeVariables(rows: KeyValue[], next: Variables): KeyValue[] {
  const kept = rows
    .filter((row) => !row.enabled || row.key in next)
    .map((row) => (row.enabled ? { ...row, value: next[row.key] ?? row.value } : row))
  const known = new Set(rows.filter((row) => row.enabled).map((row) => row.key))
  const added = Object.entries(next).filter(([key]) => !known.has(key))
  return [...kept, ...added.map(([key, value]) => createKeyValue(key, value))]
}
