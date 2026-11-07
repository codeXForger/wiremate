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

export const KAFKA_MODES = ['producer', 'consumer', 'admin'] as const
export type KafkaMode = (typeof KAFKA_MODES)[number]

export const KAFKA_AUTH_MECHANISMS = ['none', 'PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512'] as const
export type KafkaAuthMechanism = (typeof KAFKA_AUTH_MECHANISMS)[number]

/** How many replicas confirm a write before the producer hears it worked. */
export const KAFKA_ACKS = ['all', 'leader', 'none'] as const
export type KafkaAcks = (typeof KAFKA_ACKS)[number]

export const KAFKA_COMPRESSIONS = ['none', 'gzip', 'snappy', 'lz4', 'zstd'] as const
export type KafkaCompression = (typeof KAFKA_COMPRESSIONS)[number]

/** Where a consumer starts reading: the newest records, the oldest, its group's committed offsets, or a time. */
export const KAFKA_START_POSITIONS = ['latest', 'earliest', 'committed', 'timestamp'] as const
export type KafkaStartPosition = (typeof KAFKA_START_POSITIONS)[number]

/** How to reach a cluster: what every producer, consumer and admin client needs. */
export interface KafkaConnection {
  /** Bootstrap brokers, comma separated: `host:9092,host:9093`. */
  brokers: string
  clientId: string
  auth: KafkaAuthMechanism
  username: string
  password: string
  /** Connects over TLS. */
  ssl: boolean
}

export interface KafkaProducerSettings {
  acks: KafkaAcks
  compression: KafkaCompression
  /** Lets the broker drop duplicates of a retried write. Needs acks "all". */
  idempotent: boolean
}

export interface KafkaConsumerSettings {
  startFrom: KafkaStartPosition
  /** Where `timestamp` starts: a date and time, or epoch milliseconds. */
  startTimestamp: string
  autoCommit: boolean
  /** Reads only records of committed transactions. */
  readCommitted: boolean
  sessionTimeoutMs: number
  /** How long the broker may hold a fetch while it waits for records. */
  maxWaitMs: number
  /** Stops after this many records; 0 never does. */
  maxMessages: number
}

export interface KafkaConfig extends KafkaConnection, KafkaProducerSettings, KafkaConsumerSettings {
  mode: KafkaMode
  /** The producer's topic; a consumer takes a comma-separated list. */
  topic: string
  groupId: string
  key: string
  value: string
  headers: KeyValue[]
  /** The producer's target partition; empty lets the partitioner choose. */
  partition: string
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
