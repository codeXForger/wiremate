import type { TestSuite } from '../types/suite'
import { createId } from '../utils/id'

export const DEFAULT_SUITE_OPTIONS = { stopOnFailure: false, delayMs: 0 }

export function createSuite(name: string): TestSuite {
  return { id: createId('suite'), name, items: [], options: { ...DEFAULT_SUITE_OPTIONS } }
}

export function isSuiteId(id: string): boolean {
  return id.startsWith('suite_')
}
