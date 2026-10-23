import { CodeEditor } from './CodeEditor'

interface CodePaneProps {
  title: string
  value: string
  language?: string
  onChange: (value: string) => void
  highlightVariables?: boolean
}

export function CodePane({ title, ...editor }: CodePaneProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-1.5 text-xs text-muted-foreground">{title}</div>
      <div className="min-h-0 flex-1">
        <CodeEditor ariaLabel={title} {...editor} />
      </div>
    </div>
  )
}
