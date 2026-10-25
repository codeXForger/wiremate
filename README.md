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

A workspace is a folder. On first launch WireMate creates an empty **Default** workspace in `~/WireMate/Default`
and opens it; after that it opens the workspace you used last. **New workspace…** in the title bar turns any folder
you pick into a workspace (picking a folder that already holds one opens it with its content), and the same menu
switches between them.

Everything is saved in the workspace folder as plain JSON you can commit: every section's collections, every request
with its whole config (params, headers, body, auth and scripts), environments, test suites, their run history and
the workspace settings (theme and active environment).

```
<workspace>/
  wiremate.json                    # name, id and settings
  collections.json                 # folders and where each request sits, for every section
  requests/<requestId>.json        # one file per request
  environments/<environmentId>.json
  suites/<suiteId>.json            # test suites
  runs/<suiteId>/<runId>.json      # suite run history (newest 50 listed)
```

Changes are written on their own a moment after you stop typing; the dot on a tab means a change is not written yet,
and `Cmd/Ctrl+S` writes it at once. Closing the window writes anything still pending. The list of workspaces lives in
the app's data folder, not in any workspace.

## Environments and variables

The **Env** section lists the workspace's environments: **+** adds one, double-click (or F2) renames, the bin deletes.
Clicking an environment opens it in a tab, where its variables are added, edited, switched off or removed, and
**Use this environment** makes it the active one (also selectable in the title bar).

`{{name}}` works in the URL, params, headers, auth, body and messages. Placeholders are coloured: one colour when the
active environment defines the variable, red when it does not. Hover or click one to see its value and change it on
the spot; a value typed for a missing variable is added to the active environment (or kept for the session when no
environment is selected).

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

`console.log(wm.request)` shows the method, URL, params, headers and body; `console.log(wm.response)` shows the
status, time, size, headers and body (parsed when it is JSON). In the post-response script `wm.request` is the
request as it was sent, with `{{variables}}` filled in.

Scripts may use `await` at the top level. Each one runs in a worker thread of the main process, in a `node:vm`
context without `require` or `process`, and is stopped after five seconds. That keeps a script away from the app,
but it is not a security sandbox: only run scripts you trust.

While a request is on its way, **Send** turns into **Cancel**. After it returns, the response pane shows the status, the total time (hover for time to first byte), the size and a
**Tests** tab with every result. The **Console** (status bar, or `` Ctrl/Cmd+` ``) lists each request as it was
sent (headers and body after variables are filled in), each response, missing variables and script output.

## Test suites

The **API** section lists its **Test suites** under the collections. A suite is an ordered list of HTTP requests and folders (a folder runs its HTTP requests in
explorer order). Reorder by dragging or with the arrow buttons. A suite can stop at the first failure and pause
between requests. **Run suite** uses the active environment, carries variables from one request to the next and
shows live progress, passed and failed requests and tests, and timings. **Stop** cancels the request in flight and
skips the rest. Every run is saved to the suite's
**History**.

## Scripts

| Script             | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Start the app with hot reload                                    |
| `npm run build`    | Typecheck and build main, preload and renderer bundles           |
| `npm run check`    | Typecheck, lint, duplication check and tests with ≥ 85% coverage |
| `npm run test:e2e` | Build and run Playwright smoke tests against Electron            |

## Roadmap

`feat/graphql` → `feat/websocket` → `feat/socketio` → `feat/tcp-udp` →
`feat/rabbitmq` → `feat/kafka` → `feat/mqtt` → `feat/mcp` → `feat/sync-github-drive`

See [`docs/CODING_RULES.md`](docs/CODING_RULES.md) for the rules every branch follows.
