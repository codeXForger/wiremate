import { useMemo } from 'react'
import { errorMessage } from '@shared/scripting/describe'
import { interpolate } from '@shared/utils/interpolate'
import { encodePayload } from '@shared/utils/payload'
import { SocketService } from '@/services/socket-service'
import { useResponseStore } from '@/stores/response-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { activeVariables } from '../../environments/active-variables'
import { socketSpec, type SocketRequest } from './socket-spec'

/** The sockets of every TCP and UDP request; their sessions show in the response store. */
export const socketSessions = new SocketService({
  bridge: () => window.wiremate,
  store: {
    get: (requestId) => {
      const response = useResponseStore.getState().responses[requestId]
      return response?.kind === 'stream' ? response : undefined
    },
    set: (requestId, session) => useResponseStore.getState().setResponse(requestId, session)
  }
})

export interface SocketActions {
  open: () => void
  close: () => void
  /** Sends the request's payload; `to` picks a peer (`host:port`). */
  send: (to?: string) => void
}

function socketRequest(requestId: string): SocketRequest | undefined {
  const request = useWorkspaceStore.getState().requests[requestId]
  return request?.protocol === 'tcp' || request?.protocol === 'udp' ? request : undefined
}

function sendPayload(requestId: string, to?: string): void {
  const request = socketRequest(requestId)
  if (!request) return
  try {
    const payload = interpolate(request.config.payload, activeVariables())
    void socketSessions.send(requestId, encodePayload({ ...request.config, payload }), to)
  } catch (error) {
    socketSessions.report(requestId, errorMessage(error))
  }
}

function openSocket(requestId: string): void {
  const request = socketRequest(requestId)
  if (request) void socketSessions.open(requestId, socketSpec(request, activeVariables()))
}

export function useSocketActions(requestId: string): SocketActions {
  return useMemo(
    () => ({
      open: () => openSocket(requestId),
      close: () => void socketSessions.close(requestId),
      send: (to) => sendPayload(requestId, to)
    }),
    [requestId]
  )
}
