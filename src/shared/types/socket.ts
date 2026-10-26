import type { TcpConfig, UdpConfig } from './protocol'

/** What the main process opens: a TCP client or server, or a UDP socket. */
export type SocketSpec = { protocol: 'tcp'; config: TcpConfig } | { protocol: 'udp'; config: UdpConfig }

/** What happened on a socket, as its session reports it. */
export type SocketEventBody =
  | { kind: 'open' | 'info' | 'error' | 'close'; message: string }
  | { kind: 'in' | 'out'; peer: string; bytes: Uint8Array }
  | { kind: 'peers'; peers: string[] }

/** A socket event on its way to the renderer, tagged with its session and time. */
export type SocketEvent = SocketEventBody & { sessionId: string; at: number }
