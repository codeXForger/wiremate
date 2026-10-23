import { useEffect, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor, IPosition } from 'monaco-editor'
import type { Variables } from '@shared/types/scripting'
import { segmentAt, templateSegments } from '@shared/utils/interpolate'
import { useVariablePopover, type VariablePopoverState, type VariableTarget } from './use-variable-popover'
import { useVariables } from './use-variables'
import { hoverTarget, variableClass } from './variable-dom'

type Editor = MonacoEditor.IStandaloneCodeEditor
type Model = MonacoEditor.ITextModel

function rangeOf(model: Model, start: number, length: number): MonacoEditor.IModelDeltaDecoration['range'] {
  const from = model.getPositionAt(start)
  const to = model.getPositionAt(start + length)
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column
  }
}

/** One coloured decoration per `{{placeholder}}` in the editor's text. */
export function variableDecorations(model: Model, variables: Variables): MonacoEditor.IModelDeltaDecoration[] {
  return templateSegments(model.getValue()).flatMap((segment) => {
    if (segment.variable === undefined) return []
    const options = { inlineClassName: variableClass(segment.variable, variables) }
    return [{ range: rangeOf(model, segment.start, segment.text.length), options }]
  })
}

function screenRect(editor: Editor, from: IPosition, to: IPosition): DOMRect {
  const box = editor.getDomNode()?.getBoundingClientRect()
  const start = editor.getScrolledVisiblePosition(from)
  const end = editor.getScrolledVisiblePosition(to)
  if (!box || !start || !end) return new DOMRect()
  return new DOMRect(box.left + start.left, box.top + start.top, end.left - start.left, start.height)
}

function placeholderAt(editor: Editor, position: IPosition | null): VariableTarget | undefined {
  const model = editor.getModel()
  const segment =
    model && position ? segmentAt(templateSegments(model.getValue()), model.getOffsetAt(position)) : undefined
  if (!model || segment?.variable === undefined) return undefined
  const from = model.getPositionAt(segment.start)
  const to = model.getPositionAt(segment.start + segment.text.length)
  return { name: segment.variable, anchor: () => screenRect(editor, from, to) }
}

function useDecorations(editor: Editor | null, variables: Variables): void {
  useEffect(() => {
    const model = editor?.getModel()
    if (!editor || !model) return
    const decorations = editor.createDecorationsCollection(variableDecorations(model, variables))
    const listener = editor.onDidChangeModelContent(() => decorations.set(variableDecorations(model, variables)))
    return () => {
      listener.dispose()
      decorations.clear()
    }
  }, [editor, variables])
}

function usePointer(editor: Editor | null, popover: VariablePopoverState): void {
  useEffect(() => {
    if (!editor) return
    const subscriptions = [
      editor.onMouseMove((event) => hoverTarget(popover, placeholderAt(editor, event.target.position))),
      editor.onMouseLeave(() => popover.hideSoon()),
      editor.onMouseDown((event) => {
        const target = placeholderAt(editor, event.target.position)
        if (target) popover.show(target)
        else popover.close()
      })
    ]
    return () => subscriptions.forEach((subscription) => subscription.dispose())
  }, [editor, popover])
}

/** Colours `{{variables}}` in a Monaco editor and opens the value popover on hover or click. */
export function useEditorVariables(enabled: boolean): { onMount?: OnMount; popover: VariablePopoverState } {
  const [editor, setEditor] = useState<Editor | null>(null)
  const popover = useVariablePopover()
  useDecorations(editor, useVariables())
  usePointer(editor, popover)
  return { onMount: enabled ? (instance) => setEditor(instance) : undefined, popover }
}
