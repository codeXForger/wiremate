# WireMate

Desktop app for testing HTTP/REST, GraphQL, WebSocket, Socket.IO, TCP, UDP, RabbitMQ, Kafka, MQTT and MCP endpoints.
There is no database: workspaces are folders on disk chosen by the user (a `Default` one in `~/WireMate/Default` on
first launch). GitHub / Google Drive sync comes later.

## Stack

Electron + electron-vite, React 19, TypeScript 6 (strict), Tailwind v4 with shadcn-style components (Radix via `radix-ui`),
zustand, zod, Monaco, react-resizable-panels. Tests: Vitest + Testing Library, Playwright (`_electron`).

## Commands

- `npm run dev`: run the app with hot reload
- `npm run check`: typecheck, lint, duplication check and tests with coverage. **Must pass before every PR.**
- `npm run test:e2e`: build and run the Electron smoke tests
- `npm run format`: Prettier

## Claude Code setup

`.claude/settings.json` (shared with the team) pre-approves the project's check, test, lint and read-only git commands,
and runs `.claude/hooks/lint-edited-file.sh` after every edit: Prettier formats the file, then ESLint checks it. Any
violation of the coding rules is reported straight back, so fix it before moving on. Review or disable it with `/hooks`.

## Layout

- `src/main`: Electron main process (window, IPC controllers). `http/` sends HTTP with fetch, `scripting/` runs
  request scripts in a worker thread (`node:vm`), `workspaces/` and `suites/` read and write the workspace folder
  (layout in `src/shared/workspace/workspace-files.ts`). The renderer names workspaces by id only.
- `src/preload`: typed `window.wiremate` bridge (`WireMateApi` in `src/shared/ipc.ts`)
- `src/shared`: types, protocol defaults/metadata, `RequestFactory`, utils. No DOM and no Node-only APIs.
  `scripting/` is the `wm` script API and `expect`; `http/wire-request.ts` turns a config into the request sent.
- `src/renderer/src`
  - `app/`: shell (title bar, activity bar, sidebar, main area, status bar, global hooks)
  - `components/`: shared UI (`ui/` holds the shadcn-style primitives)
  - `features/<feature>/`: explorer, workspace, environments, request, response, tabs, settings, history, protocols,
    console, suites
  - `features/protocols/<id>/`: one folder per protocol, registered in `features/protocols/index.ts`
  - `stores/`: zustand stores. Slices delegate to pure functions (`tree-operations.ts`, `tab-utils.ts`).
    `workspace-persistence.ts` watches the workspace store and writes every change through a debounced `saveQueue`.
  - `services/`: `WorkspaceRepository` and `SuiteRepository` (the preload bridge in the app, in-memory versions in
    tests), `RequestPipeline` (pre-request script → variables → send →
    post-response script), `SuiteRunner`, `SuiteRepository`, `SimulatedRunner`, `NativeFolderPicker`

## Coding rules

Read `docs/CODING_RULES.md`. In short: strict TS with no `any`; **functions and components ≤ 15 lines**;
complexity ≤ 8; ≤ 3 params; no duplication (`jscpd`); classes with explicit `public` / `private` / `static`;
SOLID plus the existing patterns (registry, repository, factory, spec builder); coverage ≥ 85%; conventional commits;
one branch per feature.

## Navigation

Tabs hold requests, test suites, environments and histories, told apart by id prefix (`features/tabs/tab-kind.ts`).
The left rail lists **sections** (`src/shared/protocols/categories.ts`): API, GraphQL, Realtime, MCP, MQTT, Kafka,
Pub/Sub and Network, with Env and Settings at the bottom. Selecting a section opens its own pane: a header, a menu with one
"New … request" entry per protocol, and that section's collections. A collection (folder) stores its `category`;
requests take theirs from their protocol. To add a protocol to a section, list it in `CATEGORIES`. A section can show extra panes below its collections
(`features/categories/category-sections.ts`): API shows its request history and test suites there.

## Conventions

- Add a protocol by creating `features/protocols/<id>/` and registering it. Do not edit the shell.
- Bind config fields with `useFieldBinder` / `useConfigBinder`. They return `{ value, onChange }` to spread into inputs.
- Use `Column`, `Hint`, `IconButton`, `PanelTabs`, `CodePane` and `SidebarHeader` before writing new layout markup.
- Each protocol has a "wire" colour (`--wire-<id>` in `globals.css`). Use `wireColor()`, never hard-coded hex.
- HTTP goes over the network through `RequestPipeline`. Other protocols are simulated (`SimulatedRunner`) until their
  feature branch adds a real client.
- In tests, Monaco and react-resizable-panels are replaced by stubs (`src/renderer/test/`). Use `renderApp()` from
  `src/renderer/test/render-app.tsx` for integration tests (it opens the demo fixture from `src/renderer/test/seed.ts`;
  the app itself has no demo data), and `installBridge()` from
  `src/renderer/test/wiremate-stub.ts` to fake the main process (HTTP echo, real script execution).
