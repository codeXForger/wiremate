import { useEffect, useMemo, useState } from 'react'

export interface VariableTarget {
  name: string
  /** Where the placeholder is on screen, for positioning the popover. */
  anchor: () => DOMRect
}

export const HOVER_DELAY_MS = 250
const HIDE_DELAY_MS = 200

/** The timing behind the popover: hover opens after a pause, leaving closes after one, editing keeps it open. */
export class PopoverTimers {
  private timer: ReturnType<typeof setTimeout> | undefined
  private editing = false

  public constructor(private readonly setTarget: (target: VariableTarget | null) => void) {}

  /** Opens at once (click) or after a pause (hover). */
  public readonly show = (target: VariableTarget, delayMs = 0): void => {
    this.keep()
    if (delayMs === 0) this.setTarget(target)
    else this.timer = setTimeout(() => this.setTarget(target), delayMs)
  }

  /** Closes after a pause, unless the pointer comes back or the value is being edited. */
  public readonly hideSoon = (): void => {
    if (this.editing) return
    this.keep()
    this.timer = setTimeout(() => this.setTarget(null), HIDE_DELAY_MS)
  }

  public readonly keep = (): void => {
    clearTimeout(this.timer)
  }

  public readonly close = (): void => {
    this.keep()
    this.editing = false
    this.setTarget(null)
  }

  public readonly setEditing = (editing: boolean): void => {
    this.editing = editing
  }
}

export type VariablePopoverState = Pick<PopoverTimers, 'show' | 'hideSoon' | 'keep' | 'close' | 'setEditing'> & {
  target: VariableTarget | null
}

export function useVariablePopover(): VariablePopoverState {
  const [target, setTarget] = useState<VariableTarget | null>(null)
  const timers = useMemo(() => new PopoverTimers(setTarget), [])
  useEffect(() => timers.keep, [timers])
  return useMemo(() => {
    const { show, hideSoon, keep, close, setEditing } = timers
    return { target, show, hideSoon, keep, close, setEditing }
  }, [target, timers])
}
