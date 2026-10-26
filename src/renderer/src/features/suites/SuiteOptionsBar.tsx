import type { ChangeEvent } from 'react'
import type { SuiteOptions, TestSuite } from '@shared/types/suite'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSuiteStore } from '@/stores/suite-store'

interface OptionProps {
  suite: TestSuite
  set: (patch: Partial<SuiteOptions>) => void
}

export function SuiteOptionsBar({ suite }: { suite: TestSuite }) {
  const set = (patch: Partial<SuiteOptions>): void =>
    useSuiteStore.getState().update(suite.id, { options: { ...suite.options, ...patch } })
  return (
    <div className="ml-auto flex items-center gap-4 text-xs">
      <StopOnFailure suite={suite} set={set} />
      <DelayInput suite={suite} set={set} />
    </div>
  )
}

function StopOnFailure({ suite, set }: OptionProps) {
  const id = `${suite.id}-stop`
  return (
    <Label htmlFor={id} className="flex items-center gap-2">
      <Switch
        id={id}
        checked={suite.options.stopOnFailure}
        onCheckedChange={(stopOnFailure) => set({ stopOnFailure })}
      />
      Stop on first failure
    </Label>
  )
}

function DelayInput({ suite, set }: OptionProps) {
  const id = `${suite.id}-delay`
  const onChange = (event: ChangeEvent<HTMLInputElement>): void =>
    set({ delayMs: Math.max(0, Number(event.target.value) || 0) })
  return (
    <Label htmlFor={id} className="flex items-center gap-2">
      Delay (ms)
      <Input id={id} type="number" min={0} className="h-7 w-20" value={suite.options.delayMs} onChange={onChange} />
    </Label>
  )
}
