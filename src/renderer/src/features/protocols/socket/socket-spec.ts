import type { RequestDocument } from '@shared/types/protocol'
import type { Variables } from '@shared/types/scripting'
import type { SocketSpec } from '@shared/types/socket'
import { interpolate } from '@shared/utils/interpolate'

export type SocketRequest = RequestDocument<'tcp'> | RequestDocument<'udp'>

/** Fills `{{variables}}` in a config's text fields (addresses, group); nested options stay as they are. */
function fillVariables<C extends object>(config: C, variables: Variables): C {
  const entries = Object.entries(config).map(([key, value]) => [
    key,
    typeof value === 'string' ? interpolate(value, variables) : (value as unknown)
  ])
  return Object.fromEntries(entries) as C
}

/** What the main process opens for a request, with its variables filled in. */
export function socketSpec(request: SocketRequest, variables: Variables): SocketSpec {
  if (request.protocol === 'tcp') return { protocol: 'tcp', config: fillVariables(request.config, variables) }
  return { protocol: 'udp', config: fillVariables(request.config, variables) }
}
