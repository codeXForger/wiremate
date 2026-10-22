import type { ComponentProps } from 'react'

// react-resizable-panels hit-tests with real geometry; jsdom has none, so every click lands on a separator.
type DivProps = ComponentProps<'div'>

function strip({ className, children, style }: DivProps) {
  return { className, children, style }
}

export const Group = (props: DivProps) => <div data-testid="panel-group" {...strip(props)} />
export const Panel = (props: DivProps) => <div {...strip(props)} />
export const Separator = () => <div role="separator" />
