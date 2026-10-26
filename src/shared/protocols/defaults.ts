import type {
  ProtocolConfigMap,
  ProtocolId,
  SocketPayload,
  TcpConfig,
  TcpOptions,
  UdpConfig,
  UdpOptions
} from '../types/protocol'
import { createKeyValue } from '../utils/key-value'

type DefaultBuilders = { [P in ProtocolId]: () => ProtocolConfigMap[P] }

const JSON_CONTENT_TYPE = 'application/json'

const LOCALHOST = '127.0.0.1'

const payloadDefaults = (): SocketPayload => ({ payload: '', encoding: 'text', lineEnding: 'none' })

const tcpOptions = (): TcpOptions => ({
  noDelay: true,
  keepAlive: false,
  keepAliveDelayMs: 60_000,
  idleTimeoutMs: 0,
  connectTimeoutMs: 10_000,
  bufferSize: 65_536,
  maxConnections: 0
})

const tcpDefaults = (): TcpConfig => ({
  mode: 'client',
  host: LOCALHOST,
  port: 9000,
  ...payloadDefaults(),
  options: tcpOptions()
})

const udpOptions = (): UdpOptions => ({
  ipv6: false,
  reuseAddr: true,
  ttl: 64,
  multicastLoopback: true,
  multicastInterface: '',
  recvBufferSize: 0,
  sendBufferSize: 0
})

const udpDefaults = (): UdpConfig => ({
  mode: 'unicast',
  localAddress: '0.0.0.0',
  localPort: 9001,
  host: LOCALHOST,
  port: 9001,
  group: '239.255.0.1',
  ...payloadDefaults(),
  options: udpOptions()
})

export const PROTOCOL_DEFAULTS: DefaultBuilders = {
  http: () => ({
    method: 'GET',
    url: 'https://httpbin.org/get',
    params: [],
    headers: [createKeyValue('Accept', JSON_CONTENT_TYPE)],
    body: { mode: 'none', content: '' },
    auth: { type: 'none', token: '', username: '', password: '' },
    scripts: { pre: '', post: '' }
  }),
  graphql: () => ({
    url: 'https://countries.trevorblades.com/graphql',
    query: 'query {\n  countries {\n    code\n    name\n  }\n}\n',
    variables: '{}',
    headers: [createKeyValue('Content-Type', JSON_CONTENT_TYPE)]
  }),
  websocket: () => ({ url: 'wss://echo.websocket.org', message: '', headers: [] }),
  socketio: () => ({
    url: 'http://localhost:3000',
    path: '/socket.io',
    event: 'message',
    message: ''
  }),
  tcp: tcpDefaults,
  udp: udpDefaults,
  rabbitmq: () => ({
    url: 'amqp://guest:guest@localhost:5672',
    exchange: 'amq.direct',
    routingKey: '',
    queue: '',
    message: ''
  }),
  kafka: () => ({ brokers: 'localhost:9092', topic: '', groupId: 'wiremate', key: '', value: '' }),
  mqtt: () => ({
    brokerUrl: 'mqtt://localhost:1883',
    clientId: 'wiremate',
    topic: 'sensors/#',
    qos: '0',
    retain: false,
    payload: ''
  }),
  mcp: () => ({
    mode: 'client',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-everything',
    url: ''
  })
}
