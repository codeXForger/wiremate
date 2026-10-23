import type { ProtocolConfigMap, ProtocolId, SocketConfig } from '../types/protocol'
import { createKeyValue } from '../utils/key-value'

type DefaultBuilders = { [P in ProtocolId]: () => ProtocolConfigMap[P] }

const JSON_CONTENT_TYPE = 'application/json'

const socketDefaults = (port: number): SocketConfig => ({
  host: '127.0.0.1',
  port,
  payload: '',
  encoding: 'text'
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
  tcp: () => socketDefaults(9000),
  udp: () => socketDefaults(9001),
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
