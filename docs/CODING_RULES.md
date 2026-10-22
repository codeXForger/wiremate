# WireMate coding rules

These rules apply to every branch. Most are enforced by tooling, so `npm run check` must pass before a PR is opened.

| #   | Rule                                                                                                                                                                                                                                                      | Enforced by                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | **Strict TypeScript.** `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`. No `any`.                                                                                                                                                                   | `tsc`, `@typescript-eslint/no-explicit-any`                                              |
| 2   | **ESLint + Prettier.** Code is formatted by Prettier (120 cols, no semicolons, single quotes) and linted with `typescript-eslint` strict type-checked rules.                                                                                              | `npm run lint`, pre-commit hook                                                          |
| 3   | **Functions are at most 15 lines** (blank lines and comments excluded). React components count too: split them into smaller components or hooks.                                                                                                          | `max-lines-per-function`                                                                 |
| 4   | **Keep complexity low.** Cyclomatic complexity ≤ 8, cognitive complexity ≤ 10, nesting depth ≤ 3, at most 3 parameters (use an options object beyond that).                                                                                               | `complexity`, `sonarjs/cognitive-complexity`, `max-depth`, `max-params`                  |
| 5   | **No duplication.** Repeated logic moves into a util (`src/shared/utils`, or a feature-level helper). Repeated UI moves into a shared component.                                                                                                          | `jscpd` (`npm run dup`), `sonarjs/no-identical-functions`, `sonarjs/no-duplicate-string` |
| 6   | **Classes with explicit visibility.** Services, repositories, runners, registries and protocol clients are classes. Every member is marked `public`, `private` or `protected`. Stateless helpers are `static`. React components and hooks stay functions. | `@typescript-eslint/explicit-member-accessibility`                                       |
| 7   | **Explicit return types** on non-component functions.                                                                                                                                                                                                     | `@typescript-eslint/explicit-function-return-type`                                       |
| 8   | **SOLID and design patterns** (see below).                                                                                                                                                                                                                | Code review                                                                              |
| 9   | **Test coverage at least 85%** for statements, branches, functions and lines.                                                                                                                                                                             | Vitest coverage thresholds (`npm run test:coverage`)                                     |
| 10  | **Conventional commits.** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`… One feature per branch (`feat/<name>`), reviewed before it is pushed.                                                                                                 | commitlint `commit-msg` hook                                                             |

## Patterns in use

- **Plugin registry (Open/Closed).** Each protocol lives in `src/renderer/src/features/protocols/<id>/` and registers a `ProtocolDefinition` in `protocols/index.ts`. Adding a protocol never touches the shell.
- **Strategy.** Interaction styles (`exchange` vs `stream`) decide how the response pane renders. Today `SimulatedRunner` produces the responses; real runners will replace it behind the same shape.
- **Repository.** `WorkspaceRepository` is the storage boundary. `MockWorkspaceRepository` is used now; a folder-backed implementation comes in `feat/workspace-fs`.
- **Factory.** `RequestFactory.create(protocol, name)` builds requests from `PROTOCOL_DEFAULTS`.
- **Builder / declarative spec.** `createStreamEditor(spec)` builds connection-style editors (Socket.IO, RabbitMQ, Kafka) from a field spec.
- **Observer.** `connectStores()` keeps open tabs in sync with the requests that exist.
- **Dependency injection.** Stores and services take their collaborators through constructor or factory arguments (`createWorkspaceStore(repository)`, `new SimulatedRunner(now)`), so tests can substitute them.

## Exemptions

- Test files (`*.test.ts(x)`, `e2e/`, `src/renderer/test/`) are exempt from the 15-line rule and from explicit return types.
- `.tsx` files may infer component return types.
- `src/renderer/src/components/ui/` holds shadcn-style primitives. They follow the lint rules but are excluded from coverage and duplication checks.
- Coverage also excludes `src/main` and `src/preload` (covered by the Playwright Electron smoke test), the renderer entry point, Monaco bootstrapping, and pure type files.
