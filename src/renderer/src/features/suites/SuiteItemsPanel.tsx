import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { TestSuite } from '@shared/types/suite'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { useSuiteStore } from '@/stores/suite-store'
import { AddItemsDialog } from './AddItemsDialog'
import { appendItems } from './suite-operations'
import { SuiteItemList, type SetItems } from './SuiteItemList'
import { SuiteOptionsBar } from './SuiteOptionsBar'

const EMPTY_HINT = 'Add requests or folders. They run from top to bottom; drag them to change the order.'

export function SuiteItemsPanel({ suite }: { suite: TestSuite }) {
  const setItems: SetItems = (items) => useSuiteStore.getState().update(suite.id, { items })
  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-wrap items-center gap-4 border-b px-3 py-2">
        <AddItemsButton suite={suite} setItems={setItems} />
        <SuiteOptionsBar suite={suite} />
      </div>
      {suite.items.length === 0 ? <Hint>{EMPTY_HINT}</Hint> : <SuiteItemList items={suite.items} setItems={setItems} />}
    </div>
  )
}

function AddItemsButton({ suite, setItems }: { suite: TestSuite; setItems: SetItems }) {
  const [open, setOpen] = useState(false)
  const inSuite = new Set(suite.items.map((item) => item.nodeId))
  const add = (nodeIds: string[]): void => setItems(appendItems(suite.items, nodeIds))
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add requests
      </Button>
      {open && <AddItemsDialog inSuite={inSuite} onAdd={add} onClose={() => setOpen(false)} />}
    </>
  )
}
