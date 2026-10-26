import type { TestResult } from '../types/scripting'

export interface TestTally {
  passed: number
  failed: number
  total: number
}

export function tallyTests(tests: TestResult[]): TestTally {
  const passed = tests.filter((test) => test.passed).length
  return { passed, failed: tests.length - passed, total: tests.length }
}
