import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { categoryTerms, isCategoryId } from '@shared/protocols/categories'
import { startNewRequest } from '@/features/request/new-request'
import { useUiStore } from '@/stores/ui-store'

export function EmptyEditor() {
  const category = useUiStore((state) => (isCategoryId(state.view) ? state.view : 'api'))
  const { item } = categoryTerms(category)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm">{`Open a ${item} from the sidebar, or start a new one.`}</p>
      <Button variant="primary" onClick={() => startNewRequest(null, category)}>
        <Plus /> {`New ${item}`}
      </Button>
      <p className="text-xs text-muted-foreground">{`⌘N new ${item} · ⌘D duplicate · ⌘S save · ⌘W close tab`}</p>
    </div>
  )
}
