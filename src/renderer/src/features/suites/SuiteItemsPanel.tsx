import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { TestSuite } from '@shared/types/suite'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { useSuiteStore } from '@/stores/suite-store'
import type { PickerChanges } from './item-picker'
import { applyChanges } from './suite-operations'
import { SuiteItemList, type SetItems } from './SuiteItemList'
import { SuiteItemsDialog } from './SuiteItemsDialog'
import { SuiteOptionsBar } from './SuiteOptionsBar'

const EMPTY_HINT = 'Add requests or folders. They run from top to bottom; drag them to change the order.'

export function SuiteItemsPanel({ suite }: { suite: TestSuite }) {
  const setItems: SetItems = (items) => useSuiteStore.getState().update(suite.id, { items })
  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex flex-wrap items-center gap-4 border-b px-3 py-2">
        <ChooseItemsButton suite={suite} setItems={setItems} />
        <SuiteOptionsBar suite={suite} />
      </div>
      {suite.items.length === 0 ? <Hint>{EMPTY_HINT}</Hint> : <SuiteItemList items={suite.items} setItems={setItems} />}
    </div>
  )
}

function ChooseItemsButton({ suite, setItems }: { suite: TestSuite; setItems: SetItems }) {
  const [open, setOpen] = useState(false)
  const inSuite = new Set(suite.items.map((item) => item.nodeId))
  const save = (changes: PickerChanges): void => setItems(applyChanges(suite.items, changes))
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ListChecks /> Choose requests
      </Button>
      {open && <SuiteItemsDialog inSuite={inSuite} onSave={save} onClose={() => setOpen(false)} />}
    </>
  )
}
