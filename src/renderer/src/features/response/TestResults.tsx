import { CircleCheck, CircleX } from 'lucide-react'
import type { TestResult } from '@shared/types/scripting'
import { tallyTests } from '@shared/utils/test-results'
import { Hint } from '@/components/Hint'
import { cn } from '@/lib/utils'

export function TestsLabel({ tests }: { tests: TestResult[] }) {
  const { passed, failed, total } = tallyTests(tests)
  if (total === 0) return 'Tests'
  return (
    <span>
      Tests <span className={cn(failed > 0 ? 'text-destructive' : 'text-success')}>{`${passed}/${total}`}</span>
    </span>
  )
}

export function TestResults({ tests }: { tests: TestResult[] }) {
  if (tests.length === 0) {
    return <Hint>No tests ran. Add wm.test(…) to the request's post-response script.</Hint>
  }
  const { passed, failed } = tallyTests(tests)
  return (
    <div className="h-full overflow-auto p-3 text-xs select-text">
      <p className="mb-2 text-muted-foreground">{`${passed} passed, ${failed} failed`}</p>
      <TestList tests={tests} />
    </div>
  )
}

export function TestList({ tests }: { tests: TestResult[] }) {
  return (
    <ul aria-label="Test results" className="flex flex-col gap-1.5">
      {tests.map((test, index) => (
        <TestRow key={`${index}-${test.name}`} test={test} />
      ))}
    </ul>
  )
}

export function TestRow({ test }: { test: TestResult }) {
  const Icon = test.passed ? CircleCheck : CircleX
  return (
    <li aria-label={`${test.passed ? 'Passed' : 'Failed'}: ${test.name}`} className="flex items-start gap-2">
      <Icon className={cn('mt-px size-3.5 shrink-0', test.passed ? 'text-success' : 'text-destructive')} />
      <div className="min-w-0">
        <p>{test.name}</p>
        {test.error && <p className="font-mono break-all text-destructive">{test.error}</p>}
      </div>
    </li>
  )
}
