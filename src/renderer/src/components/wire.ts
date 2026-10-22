import type { ProtocolId } from '@shared/types/protocol'

/** Each protocol has its own "wire" colour, defined as a CSS variable in globals.css. */
export function wireColor(protocol: ProtocolId): string {
  return `var(--wire-${protocol})`
}
