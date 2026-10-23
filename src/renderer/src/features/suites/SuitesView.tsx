import { useState } from 'react'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import type { TestSuite } from '@shared/types/suite'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { itemKeyHandler } from '@/components/item-keys'
import { ItemName } from '@/components/ItemName'
import { RenameInput } from '@/components/RenameInput'
import { SidebarHeader } from '@/components/SidebarHeader'
import { cn } from '@/lib/utils'
import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'
import { createAndOpenSuite, renameSuite } from './suite-actions'

export function SuitesView() {
  const suites = useSuiteStore((state) => state.suites)
  return (
    <Column>
      <SidebarHeader title="Test suites">
        <IconButton label="New suite" icon={Plus} onClick={createAndOpenSuite} />
      </SidebarHeader>
      <Hint className="pb-1">Run requests and folders in order, and check every test in one go.</Hint>
      {suites.length === 0 ? <Hint>No suites yet.</Hint> : <SuiteList suites={suites} />}
    </Column>
  )
}

function SuiteList({ suites }: { suites: TestSuite[] }) {
  return (
    <ul aria-label="Test suites" className="min-h-0 flex-1 overflow-auto p-1.5">
      {suites.map((suite) => (
        <SuiteRow key={suite.id} suite={suite} />
      ))}
    </ul>
  )
}

const ROW_CLASS = 'group flex h-8 cursor-default items-center gap-2 rounded-md pr-1 pl-2 text-[13px] hover:bg-surface'

function useSuiteRow(suite: TestSuite, rename: () => void) {
  const active = useTabStore((state) => state.activeId === suite.id)
  const open = (): void => useTabStore.getState().open(suite.id)
  return {
    'aria-label': suite.name,
    tabIndex: 0,
    onClick: open,
    onDoubleClick: rename,
    onKeyDown: itemKeyHandler({ activate: open, rename }),
    className: cn(ROW_CLASS, active && 'bg-surface')
  }
}

function SuiteRow({ suite }: { suite: TestSuite }) {
  const [renaming, setRenaming] = useState(false)
  const rowProps = useSuiteRow(suite, () => setRenaming(true))
  return (
    <li {...rowProps}>
      <FlaskConical className="size-3.5 shrink-0 text-muted-foreground" />
      <SuiteName suite={suite} renaming={renaming} onDone={() => setRenaming(false)} />
      <DeleteSuiteButton suite={suite} />
    </li>
  )
}

function SuiteName({ suite, renaming, onDone }: { suite: TestSuite; renaming: boolean; onDone: () => void }) {
  if (!renaming) return <ItemName name={suite.name} />
  return <RenameInput target={suite} onRename={renameSuite} onDone={onDone} />
}

function DeleteSuiteButton({ suite }: { suite: TestSuite }) {
  return (
    <span className="ml-auto opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      <IconButton
        label={`Delete ${suite.name}`}
        icon={Trash2}
        onClick={(event) => {
          event.stopPropagation()
          useSuiteStore.getState().remove(suite.id)
        }}
      />
    </span>
  )
}
