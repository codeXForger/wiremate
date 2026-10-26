import type { MouseEvent } from 'react'
import type { Variables } from '@shared/types/scripting'
import type { TemplateSegment } from '@shared/utils/interpolate'
import { HOVER_DELAY_MS, type VariablePopoverState, type VariableTarget } from './use-variable-popover'

export function variableClass(name: string, variables: Variables): string {
  return name in variables ? 'wm-variable-defined' : 'wm-variable-missing'
}

function contains(rect: DOMRect, event: MouseEvent): boolean {
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  )
}

/** The coloured placeholder under the pointer: the copy behind the input has the boxes the input lacks. */
export function placeholderUnder(mirror: HTMLElement | null, event: MouseEvent): HTMLElement | undefined {
  const spans = [...(mirror?.querySelectorAll<HTMLElement>('[data-variable]') ?? [])]
  return spans.find((span) => contains(span.getBoundingClientRect(), event))
}

function targetOf(span: HTMLElement): VariableTarget {
  return { name: span.dataset['variable'] ?? '', anchor: () => span.getBoundingClientRect() }
}

/** Opens the popover for what the pointer is over after a pause; keeps it while over the same one; else closes. */
export function hoverTarget(popover: VariablePopoverState, target: VariableTarget | undefined): void {
  if (!target) popover.hideSoon()
  else if (popover.target?.name === target.name) popover.keep()
  else popover.show(target, HOVER_DELAY_MS)
}

export function hoverPlaceholder(popover: VariablePopoverState, span: HTMLElement | undefined): void {
  hoverTarget(popover, span && targetOf(span))
}

/** A click has just put the caret where the pointer was, so the caret says which placeholder was clicked. */
export function clickPlaceholder(
  popover: VariablePopoverState,
  mirror: HTMLElement | null,
  segment?: TemplateSegment
): void {
  const span = segment && mirror?.querySelector<HTMLElement>(`[data-start="${segment.start}"]`)
  if (span) popover.show(targetOf(span))
  else popover.close()
}
