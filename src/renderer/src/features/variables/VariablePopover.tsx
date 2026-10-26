import { useMemo, useState, type KeyboardEvent } from 'react'
import { Popover } from 'radix-ui'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { setVariable, useVariables, useVariableScope } from './use-variables'
import type { VariablePopoverState, VariableTarget } from './use-variable-popover'

const CONTENT_CLASS = 'z-50 flex w-72 flex-col gap-2 rounded-md border bg-panel p-3 text-xs shadow-lg'

interface PopoverProps {
  popover: VariablePopoverState
}

interface OwnedPopoverProps extends PopoverProps {
  /** The `data-variable-field` of the field this popover belongs to. */
  owner: string
}

/** Clicks inside the popover's own field are the field's to handle (open another variable, or close). */
function insideOwner(target: EventTarget | null, owner: string): boolean {
  return target instanceof Element && target.closest(`[data-variable-field="${owner}"]`) !== null
}

/** Shows a variable's value next to its placeholder and lets you change it, or set it when it is missing. */
export function VariablePopover({ popover, owner }: OwnedPopoverProps) {
  const { target } = popover
  const anchor = useMemo(() => ({ current: target ? { getBoundingClientRect: target.anchor } : null }), [target])
  return (
    <Popover.Root open={target !== null} onOpenChange={(open) => !open && popover.close()}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>{target && <PopoverBody target={target} popover={popover} owner={owner} />}</Popover.Portal>
    </Popover.Root>
  )
}

const POSITION = { side: 'bottom', align: 'start', sideOffset: 4 } as const

function behaviour(popover: VariablePopoverState, owner: string) {
  return {
    onOpenAutoFocus: (event: Event) => event.preventDefault(),
    onInteractOutside: (event: Event) => insideOwner(event.target, owner) && event.preventDefault(),
    onMouseEnter: popover.keep,
    onMouseLeave: popover.hideSoon
  }
}

function PopoverBody({ target, popover, owner }: OwnedPopoverProps & { target: VariableTarget }) {
  const label = `Variable ${target.name}`
  return (
    <Popover.Content {...POSITION} aria-label={label} className={CONTENT_CLASS} {...behaviour(popover, owner)}>
      <VariableEditor key={target.name} name={target.name} popover={popover} />
    </Popover.Content>
  )
}

/** The value as typed, and a save that writes it only when it changed (or creates a missing variable). */
function useDraft(name: string): {
  current: string | undefined
  draft: string
  setDraft: (v: string) => void
  save: () => void
} {
  const current = useVariables()[name]
  const [draft, setDraft] = useState(current ?? '')
  const save = (): void => {
    const changed = current === undefined ? draft !== '' : draft !== current
    if (changed) setVariable(name, draft)
  }
  return { current, draft, setDraft, save }
}

function VariableEditor({ name, popover }: PopoverProps & { name: string }) {
  const { current, ...value } = useDraft(name)
  return (
    <>
      <VariableHeading name={name} defined={current !== undefined} />
      <ValueInput name={name} popover={popover} {...value} />
    </>
  )
}

interface ValueInputProps extends PopoverProps {
  name: string
  draft: string
  setDraft: (value: string) => void
  save: () => void
}

const VALUE_INPUT = { className: 'h-7 font-mono text-xs', placeholder: 'Enter a value' }

function ValueInput({ name, popover, draft, setDraft, save }: ValueInputProps) {
  const events = {
    onChange: (event: { target: HTMLInputElement }) => setDraft(event.target.value),
    onFocus: () => popover.setEditing(true),
    onBlur: () => {
      popover.setEditing(false)
      save()
    },
    onKeyDown: editorKeys(save, popover.close)
  }
  return <Input aria-label={`Value of ${name}`} {...VALUE_INPUT} value={draft} {...events} />
}

function editorKeys(save: () => void, close: () => void): (event: KeyboardEvent) => void {
  return (event) => {
    if (event.key === 'Enter') save()
    if (event.key === 'Enter' || event.key === 'Escape') close()
  }
}

function VariableHeading({ name, defined }: { name: string; defined: boolean }) {
  const scope = useVariableScope()
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn('font-mono', defined ? 'wm-variable-defined' : 'wm-variable-missing')}>{`{{${name}}}`}</span>
      <span className="text-muted-foreground">{defined ? `Value in ${scope}` : `Not set in ${scope}`}</span>
    </div>
  )
}
