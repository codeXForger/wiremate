export const PROTOCOL_IDS = [
  'http',
  'graphql',
  'websocket',
  'socketio',
  'tcp',
  'udp',
  'rabbitmq',
  'kafka',
  'mqtt',
  'mcp'
] as const

export type ProtocolId = (typeof PROTOCOL_IDS)[number]

export interface KeyValue {
  id: string
  key: string
  value: string
  enabled: boolean
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export type BodyMode = 'none' | 'json' | 'text'
export type AuthType = 'none' | 'bearer' | 'basic'
export type PayloadEncoding = 'text' | 'hex'

export interface HttpConfig {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  body: { mode: BodyMode; content: string }
  auth: { type: AuthType; token: string; username: string; password: string }
  scripts: HttpScripts
}

export interface HttpScripts {
  /** Runs before the request is sent. */
  pre: string
  /** Runs after the response arrives. */
  post: string
}

export interface GraphqlConfig {
  url: string
  query: string
  variables: string
  headers: KeyValue[]
}

export interface WebSocketConfig {
  url: string
  message: string
  headers: KeyValue[]
}

export interface SocketIoConfig {
  url: string
  path: string
  event: string
  message: string
}

export const LINE_ENDINGS = ['none', 'lf', 'crlf'] as const
export type LineEnding = (typeof LINE_ENDINGS)[number]

/** The message a socket sends: the text typed, how to turn it into bytes, and what to append to text. */
export interface SocketPayload {
  payload: string
  encoding: PayloadEncoding
  lineEnding: LineEnding
}

export const TCP_MODES = ['client', 'server'] as const
export type TcpMode = (typeof TCP_MODES)[number]

export interface TcpOptions {
  /** Disables Nagle's algorithm, so small writes go out at once. */
  noDelay: boolean
  keepAlive: boolean
  keepAliveDelayMs: number
  /** Closes a connection after this long without traffic; 0 never does. */
  idleTimeoutMs: number
  /** A client gives up connecting after this long; 0 waits for the system. */
  connectTimeoutMs: number
  /** The most bytes shown as one received message; larger reads are split. */
  bufferSize: number
  /** The most clients a server accepts at once; 0 is no limit. */
  maxConnections: number
}

export interface TcpConfig extends SocketPayload {
  mode: TcpMode
  /** A client connects to this address; a server listens on it. */
  host: string
  port: number
  options: TcpOptions
}

export const UDP_MODES = ['unicast', 'broadcast', 'multicast'] as const
export type UdpMode = (typeof UDP_MODES)[number]

export interface UdpOptions {
  ipv6: boolean
  /** Lets several sockets bind the same port, e.g. two listeners of one multicast group. */
  reuseAddr: boolean
  ttl: number
  /** Multicast: also receive what this socket sends to the group. */
  multicastLoopback: boolean
  /** Multicast: the local interface address to join and send on; empty lets the system choose. */
  multicastInterface: string
  /** SO_RCVBUF in bytes; 0 keeps the system default. */
  recvBufferSize: number
  /** SO_SNDBUF in bytes; 0 keeps the system default. */
  sendBufferSize: number
}

export interface UdpConfig extends SocketPayload {
  mode: UdpMode
  /** Where the socket listens. Multicast listens on every interface, on the group port. */
  localAddress: string
  /** 0 lets the system pick a port. */
  localPort: number
  /** Where datagrams go: a host, or the broadcast address. */
  host: string
  /** The destination port; in multicast mode, the group port. */
  port: number
  /** Multicast group address to join and send to. */
  group: string
  options: UdpOptions
}

export interface RabbitMqConfig {
  url: string
  exchange: string
  routingKey: string
  queue: string
  message: string
}

export interface KafkaConfig {
  brokers: string
  topic: string
  groupId: string
  key: string
  value: string
}

export const MQTT_QOS_LEVELS = ['0', '1', '2'] as const
export type MqttQos = (typeof MQTT_QOS_LEVELS)[number]

export interface MqttConfig {
  brokerUrl: string
  clientId: string
  topic: string
  qos: MqttQos
  retain: boolean
  payload: string
}

export type McpMode = 'client' | 'server'
export type McpTransport = 'stdio' | 'http'

export interface McpConfig {
  mode: McpMode
  transport: McpTransport
  command: string
  url: string
}

export interface ProtocolConfigMap {
  http: HttpConfig
  graphql: GraphqlConfig
  websocket: WebSocketConfig
  socketio: SocketIoConfig
  tcp: TcpConfig
  udp: UdpConfig
  rabbitmq: RabbitMqConfig
  kafka: KafkaConfig
  mqtt: MqttConfig
  mcp: McpConfig
}

export interface RequestDocument<P extends ProtocolId = ProtocolId> {
  id: string
  name: string
  protocol: P
  config: ProtocolConfigMap[P]
}

export type AnyRequest = { [P in ProtocolId]: RequestDocument<P> }[ProtocolId]
