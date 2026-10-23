# WireMate

A desktop toolkit for testing the wires between services: HTTP/REST, GraphQL, WebSocket, Socket.IO, TCP, UDP,
RabbitMQ, Kafka, MQTT and MCP, all in one place.

> Status: HTTP requests are sent for real, with scripts, tests and suites. The other protocols are simulated until
> their clients land on their own feature branches.

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
  .wiremate/suites/<suiteId>.json            # test suites (written today)
  .wiremate/runs/<suiteId>/<runId>.json      # suite run history (written today, newest 50 listed)
```

## HTTP scripts and tests

Every HTTP request has a **Scripts** tab with two JavaScript editors:

- **Pre-request** runs before the request is sent. It can change `wm.request` and set variables that
  `{{placeholders}}` in the URL, params, headers, body and auth then pick up.
- **Post-response** runs after the response arrives. It reads `wm.response`, records tests and saves values for
  later requests.

```js
wm.test('status is 200', () => wm.expect(wm.response.status).toBe(200))
wm.test('returns a token', () => wm.expect(wm.response.json()).toHaveProperty('token'))
wm.env.set('token', wm.response.json().token)
console.log('logged in as', wm.response.json().user.name)
```

| API                                                       | Notes                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `wm.env.get / set / unset / has / all`                    | Active environment; kept for the session if none active                                              |
| `wm.request.method / url / body / headers.get/set/remove` | Writable in the pre-request script                                                                   |
| `wm.response.status / statusText / time / size`           | Post-response only; `time` is in milliseconds                                                        |
| `wm.response.headers.get(name) / text() / json()`         |                                                                                                      |
| `wm.test(name, fn)`                                       | Fails when `fn` throws or its promise rejects                                                        |
| `wm.expect(value)`                                        | `toBe`, `toEqual`, `toContain`, `toHaveProperty`, `toMatch`, `toBeOneOf`, `toBeLessThan`… and `.not` |
| `console.log / info / warn / error`                       | Shown in the Console                                                                                 |

Scripts may use `await` at the top level. Each one runs in a worker thread of the main process, in a `node:vm`
context without `require` or `process`, and is stopped after five seconds. That keeps a script away from the app,
but it is not a security sandbox: only run scripts you trust.

After **Send**, the response pane shows the status, the total time (hover for time to first byte), the size and a
**Tests** tab with every result. The **Console** (status bar, or `` Ctrl/Cmd+` ``) lists each request as it was
sent (headers and body after variables are filled in), each response, missing variables and script output.

## Test suites

The **API** section lists its **Test suites** under the collections. A suite is an ordered list of HTTP requests and folders (a folder runs its HTTP requests in
explorer order). Reorder by dragging or with the arrow buttons. A suite can stop at the first failure and pause
between requests. **Run suite** uses the active environment, carries variables from one request to the next and
shows live progress, passed and failed requests and tests, and timings. Every run is saved to the suite's
**History**.

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
