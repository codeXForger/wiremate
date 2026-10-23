import { Folder, SquareDashed, Zap } from 'lucide-react'
import type { ItemKind } from './suite-items'

const KIND_ICONS = { folder: Folder, request: Zap, missing: SquareDashed }

export function KindIcon({ kind }: { kind: ItemKind }) {
  const Icon = KIND_ICONS[kind]
  return <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
}
