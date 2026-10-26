import type { Socket } from 'node:net'
import type { TcpOptions } from '@shared/types/protocol'
import type { SocketEventBody } from '@shared/types/socket'
import { formatAddress } from '@shared/utils/payload'

/** Reports what happens on a socket. */
export type Emit = (event: SocketEventBody) => void

/** One open socket: a TCP client, a TCP server with its clients, or a UDP socket. */
export interface SocketSession {
  /** `to` is a `host:port` peer; see `SocketApi.sendSocket`. */
  send(bytes: Uint8Array, to?: string): void
  close(): void
}

/** Settings and bookkeeping shared by TCP clients and the connections a server accepts. */
export class TcpConnection {
  /** Applies the options to a connected socket, and reports what it receives, split into `bufferSize` pieces. */
  public static attach(socket: Socket, options: TcpOptions, emit: Emit): void {
    socket.setNoDelay(options.noDelay)
    socket.setKeepAlive(options.keepAlive, options.keepAliveDelayMs)
    socket.setTimeout(options.idleTimeoutMs)
    const peer = TcpConnection.peerOf(socket)
    socket.on('data', (chunk: Buffer) => {
      TcpConnection.split(chunk, options.bufferSize).forEach((bytes) => emit({ kind: 'in', peer, bytes }))
    })
    socket.on('timeout', () => {
      emit({ kind: 'info', message: `${peer} was idle for ${options.idleTimeoutMs} ms, closing` })
      socket.end()
    })
  }

  public static peerOf(socket: Socket): string {
    return formatAddress(socket.remoteAddress ?? '?', socket.remotePort ?? 0)
  }

  /** Writes and reports what went out once it has. */
  public static write(socket: Socket, bytes: Uint8Array, emit: Emit): void {
    const peer = TcpConnection.peerOf(socket)
    socket.write(bytes, (error) => {
      if (error) emit({ kind: 'error', message: `${peer}: ${error.message}` })
      else emit({ kind: 'out', peer, bytes })
    })
  }

  private static split(chunk: Buffer, size: number): Uint8Array[] {
    const step = size > 0 ? size : chunk.length
    const pieces: Uint8Array[] = []
    for (let start = 0; start < chunk.length; start += step)
      pieces.push(new Uint8Array(chunk.subarray(start, start + step)))
    return pieces
  }
}
