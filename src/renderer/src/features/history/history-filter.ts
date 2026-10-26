import { statusClass, type StatusClass } from '@shared/suites/run-insights'
import type { HistoryEntry } from '@shared/types/history'
import { HTTP_METHODS, type HttpMethod } from '@shared/types/protocol'

export const ALL = 'all'
/** The environment filter's value for requests sent with no environment active. */
export const NO_ENVIRONMENT = '__none__'

export const STATUS_FILTERS = [ALL, '2xx', '3xx', '4xx', '5xx', 'none'] as const
export const TESTS_FILTERS = [ALL, 'failing', 'passing', 'none'] as const

export type StatusFilter = (typeof STATUS_FILTERS)[number]
export type TestsFilter = (typeof TESTS_FILTERS)[number]

export interface HistoryFilters {
  query: string
  status: StatusFilter
  method: typeof ALL | HttpMethod
  environment: string
  tests: TestsFilter
}

export const NO_FILTERS: HistoryFilters = { query: '', status: ALL, method: ALL, environment: ALL, tests: ALL }

function testsOf(entry: HistoryEntry): Exclude<TestsFilter, typeof ALL> {
  if (entry.testsFailed > 0) return 'failing'
  return entry.testsPassed > 0 ? 'passing' : 'none'
}

/** Search looks at the name, the URL, the environment and the status. */
function matchesQuery(entry: HistoryEntry, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  const haystack = [entry.requestName, entry.url, entry.environmentName ?? '', String(entry.status), entry.method]
  return haystack.some((text) => text.toLowerCase().includes(needle))
}

function matchesEnvironment(entry: HistoryEntry, environment: string): boolean {
  if (environment === ALL) return true
  return environment === NO_ENVIRONMENT ? entry.environmentName === null : entry.environmentName === environment
}

function matches(entry: HistoryEntry, filters: HistoryFilters): boolean {
  const status: StatusClass = statusClass(entry.status)
  return (
    matchesQuery(entry, filters.query) &&
    (filters.status === ALL || filters.status === status) &&
    (filters.method === ALL || filters.method === entry.method) &&
    matchesEnvironment(entry, filters.environment) &&
    (filters.tests === ALL || filters.tests === testsOf(entry))
  )
}

export function filterHistory(entries: HistoryEntry[], filters: HistoryFilters): HistoryEntry[] {
  return entries.filter((entry) => matches(entry, filters))
}

/** The methods and environments that actually occur, for the filter menus. */
export function filterChoices(entries: HistoryEntry[]): { methods: HttpMethod[]; environments: string[] } {
  const methods = HTTP_METHODS.filter((method) => entries.some((entry) => entry.method === method))
  const names = [...new Set(entries.flatMap((entry) => entry.environmentName ?? []))].sort((a, b) => a.localeCompare(b))
  const none = entries.some((entry) => entry.environmentName === null) ? [NO_ENVIRONMENT] : []
  return { methods, environments: [...names, ...none] }
}
