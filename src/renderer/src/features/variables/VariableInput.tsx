import { useId, useRef, useState, type ComponentProps, type MouseEvent, type RefObject } from 'react'
import { segmentAt, templateSegments, type TemplateSegment } from '@shared/utils/interpolate'
import { cn } from '@/lib/utils'
import { useVariablePopover, type VariablePopoverState } from './use-variable-popover'
import { useVariables } from './use-variables'
import { clickPlaceholder, hoverPlaceholder, placeholderUnder, variableClass } from './variable-dom'
import { VariablePopover } from './VariablePopover'

export interface VariableInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  /** Layout of the wrapper; `className` styles the field itself. */
  containerClassName?: string
}

const SEE_THROUGH = 'relative bg-transparent text-transparent caret-foreground'

/**
 * A text input that colours `{{variables}}`. A copy of the text with coloured placeholders sits behind the input,
 * whose own text turns transparent while there is something to colour. Hovering or clicking a placeholder opens a
 * popover to see and change its value.
 */
export function VariableInput({ value, onValueChange, className, containerClassName, ...props }: VariableInputProps) {
  const field = useVariableField(value, onValueChange)
  const owner = useId()
  return (
    <div data-variable-field={owner} className={cn('relative min-w-0 flex-1', containerClassName)}>
      {field.coloured && <Mirror className={className} {...field} />}
      <input {...props} {...field.inputProps} className={cn(className, field.coloured && SEE_THROUGH)} />
      <VariablePopover popover={field.popover} owner={owner} />
    </div>
  )
}

function useVariableField(value: string, onValueChange: (value: string) => void) {
  const segments = templateSegments(value)
  const [scrollLeft, setScrollLeft] = useState(0)
  const popover = useVariablePopover()
  const { mirror, handlers } = usePointer(segments, popover)
  const track = (event: { currentTarget: HTMLInputElement }): void => setScrollLeft(event.currentTarget.scrollLeft)
  const onChange = (event: { target: HTMLInputElement }): void => onValueChange(event.target.value)
  const inputProps = { value, onChange, onScroll: track, onSelect: track, ...handlers }
  const coloured = segments.some((segment) => segment.variable !== undefined)
  return { segments, coloured, mirror, scrollLeft, popover, inputProps }
}

/** Hover and click on placeholders. The mirror ref is only read inside the handlers. */
function usePointer(segments: TemplateSegment[], popover: VariablePopoverState) {
  const mirror = useRef<HTMLDivElement>(null)
  const handlers = {
    onMouseMove: (event: MouseEvent) => hoverPlaceholder(popover, placeholderUnder(mirror.current, event)),
    onMouseLeave: popover.hideSoon,
    onClick: (event: MouseEvent<HTMLInputElement>) =>
      clickPlaceholder(popover, mirror.current, segmentAt(segments, event.currentTarget.selectionStart ?? -1))
  }
  return { mirror, handlers }
}

const MIRROR_CLASS =
  'pointer-events-none absolute inset-0 flex items-center overflow-hidden border-transparent whitespace-pre'

interface MirrorProps {
  segments: TemplateSegment[]
  className?: string
  scrollLeft: number
  mirror: RefObject<HTMLDivElement | null>
}

/** The coloured copy of the text, scrolled along with the input. */
function Mirror({ segments, className, scrollLeft, mirror }: MirrorProps) {
  return (
    <div aria-hidden className={cn(className, MIRROR_CLASS)}>
      <div ref={mirror} style={{ transform: `translateX(${-scrollLeft}px)` }}>
        {segments.map((segment) => (
          <MirrorSegment key={segment.start} segment={segment} />
        ))}
      </div>
    </div>
  )
}

function MirrorSegment({ segment }: { segment: TemplateSegment }) {
  const variables = useVariables()
  if (segment.variable === undefined) return <span>{segment.text}</span>
  return (
    <span
      data-variable={segment.variable}
      data-start={segment.start}
      className={variableClass(segment.variable, variables)}
    >
      {segment.text}
    </span>
  )
}
