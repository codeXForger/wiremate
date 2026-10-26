import { FlaskConical, Plus } from 'lucide-react'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { SidebarItemList } from '@/components/SidebarItemList'
import { useSuiteStore } from '@/stores/suite-store'
import { askToDeleteSuite } from '../confirm/confirm-delete'
import { createAndOpenSuite, renameSuite } from './suite-actions'

const EMPTY_HINT = 'No suites yet. A suite runs requests and folders in order and checks every test in one go.'

/** The API pane's "Test suites" section, below its collections. */
export function SuitesSection() {
  return (
    <section aria-label="Test suites section" className="flex max-h-[40%] min-h-0 shrink-0 flex-col border-t">
      <SidebarHeader title="Test suites">
        <IconButton label="New suite" icon={Plus} onClick={createAndOpenSuite} />
      </SidebarHeader>
      <SuiteList />
    </section>
  )
}

function SuiteList() {
  const suites = useSuiteStore((state) => state.suites)
  if (suites.length === 0) return <Hint>{EMPTY_HINT}</Hint>
  const actions = { icon: FlaskConical, onRename: renameSuite, onDelete: askToDeleteSuite }
  return <SidebarItemList label="Test suites" items={suites} {...actions} />
}
