import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ProtocolMetadata } from '@shared/protocols/metadata'
import type { ProtocolId } from '@shared/types/protocol'

export interface EditorProps {
  requestId: string
}

export interface ProtocolDefinition {
  id: ProtocolId
  meta: ProtocolMetadata
  icon: LucideIcon
  Editor: ComponentType<EditorProps>
}
