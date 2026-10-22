import { ArrowLeftRight, Bot, Globe, Inbox, Layers, Network, RadioTower, type LucideIcon } from 'lucide-react'
import { CATEGORIES, type CategoryId } from '@shared/protocols/categories'
import { wireColor } from '@/components/wire'

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  api: Globe,
  realtime: ArrowLeftRight,
  mcp: Bot,
  mqtt: RadioTower,
  kafka: Layers,
  pubsub: Inbox,
  network: Network
}

/** A category takes the wire colour of its first protocol. */
export function categoryColor(category: CategoryId): string {
  const [first] = CATEGORIES[category].protocols
  return first ? wireColor(first) : 'currentColor'
}
