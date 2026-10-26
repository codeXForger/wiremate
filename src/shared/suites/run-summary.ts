import type { RequestRunResult, RunSummary } from '../types/suite'
import { tallyTests } from '../utils/test-results'

export function summarizeRun(results: RequestRunResult[], durationMs: number): RunSummary {
  const count = (outcome: RequestRunResult['outcome']): number => results.filter((r) => r.outcome === outcome).length
  const tests = tallyTests(results.flatMap((result) => result.tests))
  return {
    requests: results.length,
    passed: count('passed'),
    failed: count('failed'),
    skipped: count('skipped'),
    tests: tests.total,
    testsPassed: tests.passed,
    testsFailed: tests.failed,
    durationMs
  }
}

export function runPassed(summary: RunSummary): boolean {
  return summary.failed === 0 && summary.testsFailed === 0
}
