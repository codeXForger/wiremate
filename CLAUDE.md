# WireMate

Desktop app for testing HTTP/REST, GraphQL, WebSocket, Socket.IO, TCP, UDP, RabbitMQ, Kafka, MQTT and MCP endpoints.
There is no database: workspaces are folders on disk chosen by the user. GitHub / Google Drive sync comes later.

## Stack

Electron + electron-vite, React 19, TypeScript 6 (strict), Tailwind v4 with shadcn-style components (Radix via `radix-ui`),
zustand, zod, Monaco, react-resizable-panels. Tests: Vitest + Testing Library, Playwright (`_electron`).

## Commands

- `npm run dev`: run the app with hot reload
- `npm run check`: typecheck, lint, duplication check and tests with coverage. **Must pass before every PR.**
- `npm run test:e2e`: build and run the Electron smoke tests
- `npm run format`: Prettier

## Layout

- `src/main`: Electron main process (window, IPC handlers). Protocol clients will live here.
- `src/preload`: typed `window.wiremate` bridge (`WireMateApi` in `src/shared/ipc.ts`)
- `src/shared`: types, protocol defaults/metadata, `RequestFactory`, utils. No DOM and no Node-only APIs.
- `src/renderer/src`
  - `app/`: shell (title bar, activity bar, sidebar, main area, status bar, global hooks)
  - `components/`: shared UI (`ui/` holds the shadcn-style primitives)
  - `features/<feature>/`: explorer, workspace, environments, request, response, tabs, settings, history, protocols
  - `features/protocols/<id>/`: one folder per protocol, registered in `features/protocols/index.ts`
  - `stores/`: zustand stores. Slices delegate to pure functions (`tree-operations.ts`, `tab-utils.ts`).
  - `services/`: `WorkspaceRepository` (mock for now), `SimulatedRunner`, `NativeFolderPicker`

## Coding rules

Read `docs/CODING_RULES.md`. In short: strict TS with no `any`; **functions and components ≤ 15 lines**;
complexity ≤ 8; ≤ 3 params; no duplication (`jscpd`); classes with explicit `public` / `private` / `static`;
SOLID plus the existing patterns (registry, repository, factory, spec builder); coverage ≥ 85%; conventional commits;
one branch per feature.

## Navigation

The left rail lists **sections** (`src/shared/protocols/categories.ts`): API, GraphQL, Realtime, MCP, MQTT, Kafka,
Pub/Sub and Network, with Env, History and Settings at the bottom. Selecting a section opens its own pane: a header, a menu with one
"New … request" entry per protocol, and that section's collections. A collection (folder) stores its `category`;
requests take theirs from their protocol. To add a protocol to a section, list it in `CATEGORIES`.

## Conventions

- Add a protocol by creating `features/protocols/<id>/` and registering it. Do not edit the shell.
- Bind config fields with `useFieldBinder` / `useConfigBinder`. They return `{ value, onChange }` to spread into inputs.
- Use `Column`, `Hint`, `IconButton`, `PanelTabs`, `CodePane` and `SidebarHeader` before writing new layout markup.
- Each protocol has a "wire" colour (`--wire-<id>` in `globals.css`). Use `wireColor()`, never hard-coded hex.
- Responses are simulated (`SimulatedRunner`) until each protocol's feature branch adds a real client.
- In tests, Monaco and react-resizable-panels are replaced by stubs (`src/renderer/test/`). Use `renderApp()` from
  `src/renderer/test/render-app.tsx` for integration tests.
