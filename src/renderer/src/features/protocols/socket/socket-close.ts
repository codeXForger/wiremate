import type { StreamSession } from '@shared/types/response'
import { formatAddress } from '@shared/utils/payload'
import { useResponseStore } from '@/stores/response-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { DeleteConfirmation } from '@/stores/ui-store'
import { socketSessions } from './socket-actions'
import type { SocketRequest } from './socket-spec'

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** What is open, in words: who a client talks to, how many clients a server has. */
function describeSocket({ name, protocol, config }: SocketRequest, session: StreamSession | undefined): string {
  const peers = session?.peers?.length ?? 0
  if (protocol === 'udp') return `"${name}" is listening for UDP datagrams.`
  if (config.mode === 'server') return `The server "${name}" is running with ${plural(peers, 'connected client')}.`
  return `"${name}" is connected to ${formatAddress(config.host, config.port)}.`
}

function sessionOf(requestId: string): StreamSession | undefined {
  const response = useResponseStore.getState().responses[requestId]
  return response?.kind === 'stream' ? response : undefined
}

/**
 * The confirmation to show before closing a request whose socket is open, or null when nothing is open. Confirming
 * closes the socket, so its peers see the connection end, then runs `then`.
 */
export function socketCloseConfirmation(requestId: string, then: () => void): DeleteConfirmation | null {
  const request = useWorkspaceStore.getState().requests[requestId]
  const open = socketSessions.isOpen(requestId) && (request?.protocol === 'tcp' || request?.protocol === 'udp')
  if (!open) return null
  return {
    title: 'Close the connection?',
    message: describeSocket(request, sessionOf(requestId)),
    note: 'Closing the tab disconnects it.',
    confirmLabel: 'Disconnect and close',
    onConfirm: () => {
      void socketSessions.close(requestId)
      then()
    }
  }
}
