import type { RequestDocument } from '@shared/types/protocol'
import type { Variables } from '@shared/types/scripting'
import type { SocketSpec } from '@shared/types/socket'
import { interpolateFields } from '@shared/utils/interpolate'

export type SocketRequest = RequestDocument<'tcp'> | RequestDocument<'udp'>

/** What the main process opens for a request, with its variables filled in (nested options stay as they are). */
export function socketSpec(request: SocketRequest, variables: Variables): SocketSpec {
  if (request.protocol === 'tcp') return { protocol: 'tcp', config: interpolateFields(request.config, variables) }
  return { protocol: 'udp', config: interpolateFields(request.config, variables) }
}
