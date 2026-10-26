import { useState, type SyntheticEvent } from 'react'
import { Save } from 'lucide-react'
import { categoryOf, categoryTerms } from '@shared/protocols/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Bound } from './use-field-binder'
import { useRequest } from './use-request'

/** Above a draft: it is not in the list yet; name it and save it to keep it. */
export function DraftBar({ requestId }: { requestId: string }) {
  const draft = useWorkspaceStore((state) => requestId in state.drafts)
  const request = useRequest(requestId)
  if (!draft || !request) return null
  return <DraftForm requestId={requestId} name={request.name} item={categoryTerms(categoryOf(request.protocol)).item} />
}

function saveDraft(event: SyntheticEvent, requestId: string, name: string): void {
  event.preventDefault()
  useWorkspaceStore.getState().saveDraft(requestId, name)
}

function DraftForm({ requestId, name, item }: { requestId: string; name: string; item: string }) {
  const [value, setValue] = useState(name)
  const save = (event: SyntheticEvent): void => saveDraft(event, requestId, value)
  return (
    <form onSubmit={save} className="flex items-center gap-2 border-b bg-primary/5 px-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{`New ${item}, not saved yet`}</span>
      <NameInput item={item} value={value} onChange={setValue} />
      <Button type="submit" size="sm" variant="primary">
        <Save /> {`Save ${item}`}
      </Button>
    </form>
  )
}

function NameInput({ item, value, onChange }: Bound<string> & { item: string }) {
  return (
    <Input
      aria-label={`${item} name`}
      className="h-7 max-w-72 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
