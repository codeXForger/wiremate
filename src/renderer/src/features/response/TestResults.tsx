import { CircleCheck, CircleX } from 'lucide-react'
import type { TestResult } from '@shared/types/scripting'
import { tallyTests } from '@shared/utils/test-results'
import { Hint } from '@/components/Hint'
import { cn } from '@/lib/utils'

interface TestsProps {
  tests: TestResult[]
  /** Scripts that threw; shown first, since tests after the error did not run. */
  scriptErrors?: string[]
}

export function TestsLabel({ tests, scriptErrors = [] }: TestsProps) {
  const { passed, failed, total } = tallyTests(tests)
  const error = scriptErrors.length > 0 && <span className="text-destructive"> · script error</span>
  if (total === 0) return error ? <span>Tests{error}</span> : 'Tests'
  return (
    <span>
      Tests <span className={cn(failed > 0 ? 'text-destructive' : 'text-success')}>{`${passed}/${total}`}</span>
      {error}
    </span>
  )
}

export function TestResults({ tests, scriptErrors = [] }: TestsProps) {
  if (tests.length === 0 && scriptErrors.length === 0) {
    return <Hint>No tests ran. Add wm.test(…) to the request's post-response script.</Hint>
  }
  const { passed, failed } = tallyTests(tests)
  return (
    <div className="h-full overflow-auto p-3 text-xs select-text">
      <ScriptErrors errors={scriptErrors} />
      {tests.length > 0 && <p className="mb-2 text-muted-foreground">{`${passed} passed, ${failed} failed`}</p>}
      <TestList tests={tests} />
    </div>
  )
}

function ScriptErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <div role="alert" className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
      {errors.map((error) => (
        <p key={error} className="font-mono break-all text-destructive">
          {error}
        </p>
      ))}
      <p className="mt-1 text-muted-foreground">Tests written after the failing line did not run.</p>
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
