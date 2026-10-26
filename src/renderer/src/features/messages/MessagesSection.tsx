import { MessageSquareText, Plus } from 'lucide-react'
import type { SavedMessage } from '@shared/types/message'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { SidebarItemList } from '@/components/SidebarItemList'
import { useMessageStore } from '@/stores/message-store'
import { askToDeleteMessage, createAndOpenMessage, describeSize, renameMessage } from './message-actions'

const EMPTY_HINT =
  'No saved messages yet. Save a payload from any TCP or UDP request, or write one here, then load it when you send.'

/** The Network pane's saved messages, below its collections, in the order they are meant to be sent. */
export function MessagesSection() {
  return (
    <section aria-label="Messages section" className="flex max-h-[45%] min-h-0 shrink-0 flex-col border-t">
      <SidebarHeader title="Messages">
        <IconButton label="New message" icon={Plus} onClick={createAndOpenMessage} />
      </SidebarHeader>
      <MessageList />
    </section>
  )
}

function SizeBadge({ message }: { message: SavedMessage }) {
  return (
    <span className="shrink-0 font-mono text-[11px] text-muted-foreground group-hover:hidden">
      {describeSize(message)}
    </span>
  )
}

function MessageList() {
  const messages = useMessageStore((state) => state.messages)
  if (messages.length === 0) return <Hint>{EMPTY_HINT}</Hint>
  const actions = { icon: MessageSquareText, onRename: renameMessage, onDelete: askToDeleteMessage }
  return (
    <SidebarItemList label="Saved messages" items={messages} badge={(m) => <SizeBadge message={m} />} {...actions} />
  )
}
