import type { TcpMode, UdpMode } from '@shared/types/protocol'

/** The words a socket editor uses in one mode. */
export interface ModeCopy {
  label: string
  hint: string
  /** The address and port in the bar at the top. */
  host: string
  port: string
  open: string
  close: string
  /** Who a message goes to when no peer is picked. */
  target: string
}

const LISTEN = { open: 'Listen', close: 'Stop' }

export const TCP_COPY: Record<TcpMode, ModeCopy> = {
  client: {
    label: 'Client',
    hint: 'Connects to a TCP server',
    host: 'Server host',
    port: 'Server port',
    open: 'Connect',
    close: 'Disconnect',
    target: 'Server'
  },
  server: {
    label: 'Server',
    hint: 'Listens for TCP clients; send to one or to all',
    host: 'Listen address',
    port: 'Listen port',
    target: 'All clients',
    ...LISTEN
  }
}

const UDP_LOCAL = { host: 'Local address', port: 'Local port', target: 'Destination', ...LISTEN }

export const UDP_COPY: Record<UdpMode, ModeCopy> = {
  unicast: { label: 'Unicast', hint: 'Listens on a port and sends datagrams to one host', ...UDP_LOCAL },
  broadcast: { label: 'Broadcast', hint: 'Sends to every host on the network segment', ...UDP_LOCAL },
  multicast: {
    label: 'Multicast',
    hint: 'Joins a group (new or existing); every member receives what is sent to it',
    host: 'Group address',
    port: 'Group port',
    target: 'Group',
    ...LISTEN
  }
}

export const BROADCAST_ADDRESS = '255.255.255.255'
