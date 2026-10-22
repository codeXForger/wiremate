import type { ProtocolId } from '@shared/types/protocol'
import type { ProtocolDefinition } from './types'

/** Plugin registry: each protocol module registers itself; the shell never imports protocols directly. */
export class ProtocolRegistry {
  private readonly definitions = new Map<ProtocolId, ProtocolDefinition>()

  public register(definition: ProtocolDefinition): void {
    this.definitions.set(definition.id, definition)
  }

  public get(id: ProtocolId): ProtocolDefinition {
    const definition = this.definitions.get(id)
    if (!definition) throw new Error(`Protocol "${id}" is not registered`)
    return definition
  }

  public list(): ProtocolDefinition[] {
    return [...this.definitions.values()]
  }
}

export const protocolRegistry = new ProtocolRegistry()
