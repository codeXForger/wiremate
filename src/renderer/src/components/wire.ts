import type { HttpMethod, ProtocolId } from '@shared/types/protocol'

/** Each protocol has its own "wire" colour, defined as a CSS variable in globals.css. */
export function wireColor(protocol: ProtocolId): string {
  return `var(--wire-${protocol})`
}

/** HTTP methods have their own colours too (`--method-<name>` in globals.css): GET green, DELETE red… */
export function methodColor(method: HttpMethod): string {
  return `var(--method-${method.toLowerCase()})`
}
