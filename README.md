# WireMate

A desktop toolkit for testing the wires between services: HTTP/REST, GraphQL, WebSocket, Socket.IO, TCP, UDP,
RabbitMQ, Kafka, MQTT and MCP, all in one place.

> Status: UI shell. Responses are simulated until each protocol client lands on its own feature branch.

## Getting started

```bash
npm install
npm run dev
```

## Workspaces

A workspace is a folder you choose. You can keep several and switch between them from the title bar.
The planned on-disk format:

```
<workspace>/
  wiremate.json                              # name, version, settings
  environments/<name>.env.json               # variables
  collections/<folder>/<name>.<protocol>.json
```

## Scripts

| Script             | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Start the app with hot reload                                    |
| `npm run build`    | Typecheck and build main, preload and renderer bundles           |
| `npm run check`    | Typecheck, lint, duplication check and tests with ≥ 85% coverage |
| `npm run test:e2e` | Build and run Playwright smoke tests against Electron            |

## Roadmap

`feat/workspace-fs` → `feat/http` → `feat/graphql` → `feat/websocket` → `feat/socketio` → `feat/tcp-udp` →
`feat/rabbitmq` → `feat/kafka` → `feat/mqtt` → `feat/mcp` → `feat/sync-github-drive`

See [`docs/CODING_RULES.md`](docs/CODING_RULES.md) for the rules every branch follows.
