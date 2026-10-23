import { create } from 'zustand'
import { createSuite } from '@shared/suites/suite-factory'
import type { RequestRunResult, SuiteRun, TestSuite } from '@shared/types/suite'
import { services } from '@/services'
import { useWorkspaceStore } from './workspace-store'

export interface LiveRun {
  total: number
  results: RequestRunResult[]
}

type SuitePatch = Partial<Omit<TestSuite, 'id'>>

interface SuiteState {
  suites: TestSuite[]
  /** Past runs per suite, newest first. */
  history: Record<string, SuiteRun[]>
  /** Runs in progress, by suite. */
  live: Record<string, LiveRun>
  load: () => Promise<void>
  create: () => TestSuite
  update: (id: string, patch: SuitePatch) => void
  remove: (id: string) => void
  loadHistory: (id: string) => Promise<void>
  startRun: (id: string, total: number) => void
  addResult: (id: string, result: RequestRunResult) => void
  finishRun: (run: SuiteRun) => void
}

/** Runs a storage call against the open workspace; does nothing when no workspace is open. */
async function withWorkspace<T>(action: (workspaceId: string) => Promise<T>, fallback: T): Promise<T> {
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  return workspaceId === null ? fallback : action(workspaceId)
}

function nextName(suites: TestSuite[]): string {
  const names = new Set(suites.map((suite) => suite.name))
  let n = suites.length + 1
  while (names.has(`Suite ${n}`)) n += 1
  return `Suite ${n}`
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([other]) => other !== key))
}

type SetState = (patch: Partial<SuiteState>) => void
type GetState = () => SuiteState

function persist(suite: TestSuite): void {
  void withWorkspace((path) => services.suites.saveSuite(path, suite), undefined)
}

function createOne(set: SetState, get: GetState): TestSuite {
  const suite = createSuite(nextName(get().suites))
  set({ suites: [...get().suites, suite] })
  persist(suite)
  return suite
}

function updateOne(set: SetState, get: GetState, change: { id: string; patch: SuitePatch }): void {
  const suites = get().suites.map((suite) => (suite.id === change.id ? { ...suite, ...change.patch } : suite))
  set({ suites })
  const suite = suites.find((candidate) => candidate.id === change.id)
  if (suite) persist(suite)
}

function removeOne(set: SetState, get: GetState, id: string): void {
  set({ suites: get().suites.filter((suite) => suite.id !== id), history: without(get().history, id) })
  void withWorkspace((path) => services.suites.deleteSuite(path, id), undefined)
}

async function loadHistory(set: SetState, get: GetState, id: string): Promise<void> {
  const runs = await withWorkspace((path) => services.suites.listRuns(path, id), [])
  set({ history: { ...get().history, [id]: runs } })
}

function addResult(set: SetState, get: GetState, change: { id: string; result: RequestRunResult }): void {
  const live = get().live[change.id]
  if (live) set({ live: { ...get().live, [change.id]: { ...live, results: [...live.results, change.result] } } })
}

function finishRun(set: SetState, get: GetState, run: SuiteRun): void {
  const history = [run, ...(get().history[run.suiteId] ?? [])]
  set({ live: without(get().live, run.suiteId), history: { ...get().history, [run.suiteId]: history } })
  void withWorkspace((path) => services.suites.saveRun(path, run), undefined)
}

export const useSuiteStore = create<SuiteState>()((set, get) => ({
  suites: [],
  history: {},
  live: {},
  load: async () => set({ suites: await withWorkspace((path) => services.suites.listSuites(path), []), history: {} }),
  create: () => createOne(set, get),
  update: (id, patch) => updateOne(set, get, { id, patch }),
  remove: (id) => removeOne(set, get, id),
  loadHistory: (id) => loadHistory(set, get, id),
  startRun: (id, total) => set({ live: { ...get().live, [id]: { total, results: [] } } }),
  addResult: (id, result) => addResult(set, get, { id, result }),
  finishRun: (run) => finishRun(set, get, run)
}))
