import { CodePane } from '@/components/CodePane'
import { Column } from '@/components/Column'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable'
import { SendButton } from '../../request/components/SendButton'
import { UrlBar } from '../../request/components/UrlBar'
import { useFieldBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'

export function GraphqlEditor({ requestId }: EditorProps) {
  const bind = useFieldBinder<'graphql'>(requestId)
  return (
    <Column>
      <UrlBar label="GraphQL endpoint" action={<SendButton requestId={requestId} />} {...bind('url')} />
      <GraphqlPanes requestId={requestId} />
    </Column>
  )
}

function GraphqlPanes({ requestId }: EditorProps) {
  const bind = useFieldBinder<'graphql'>(requestId)
  return (
    <ResizableGroup className="min-h-0 flex-1">
      <ResizablePanel defaultSize="65" minSize="30">
        <CodePane title="Query" language="graphql" highlightVariables {...bind('query')} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel minSize="20">
        <CodePane title="Variables" highlightVariables {...bind('variables')} />
      </ResizablePanel>
    </ResizableGroup>
  )
}
