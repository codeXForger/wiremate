import { Search } from 'lucide-react'
import type { HistoryEntry } from '@shared/types/history'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { OptionSelect } from '../request/components/OptionSelect'
import {
  ALL,
  filterChoices,
  NO_ENVIRONMENT,
  STATUS_FILTERS,
  TESTS_FILTERS,
  type HistoryFilters
} from './history-filter'

interface FilterBarProps {
  entries: HistoryEntry[]
  filters: HistoryFilters
  onChange: (filters: HistoryFilters) => void
  shown: number
}

interface SelectSpec {
  key: Exclude<keyof HistoryFilters, 'query'>
  label: string
  width: string
  options: readonly string[]
  format: (value: string) => string
}

const TESTS_LABEL: Record<string, string> = {
  all: 'All tests',
  failing: 'Failing',
  passing: 'Passing',
  none: 'No tests'
}

const statusLabel = (v: string): string => (v === ALL ? 'All statuses' : v === 'none' ? 'No response' : v)
const methodLabel = (v: string): string => (v === ALL ? 'All methods' : v)
const environmentLabel = (v: string): string =>
  v === ALL ? 'All environments' : v === NO_ENVIRONMENT ? 'No environment' : v
const testsLabel = (v: string): string => TESTS_LABEL[v] ?? v

function selects(entries: HistoryEntry[]): SelectSpec[] {
  const { methods, environments } = filterChoices(entries)
  return [
    { key: 'status', label: 'Status', width: 'w-32', options: STATUS_FILTERS, format: statusLabel },
    { key: 'method', label: 'Method', width: 'w-32', options: [ALL, ...methods], format: methodLabel },
    {
      key: 'environment',
      label: 'Environment',
      width: 'w-40',
      options: [ALL, ...environments],
      format: environmentLabel
    },
    { key: 'tests', label: 'Tests', width: 'w-28', options: TESTS_FILTERS, format: testsLabel }
  ]
}

/** One row of filters above the table they narrow, with how many requests they leave. */
export function HistoryFilterBar({ entries, filters, onChange, shown }: FilterBarProps) {
  const set = (patch: Partial<HistoryFilters>): void => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <SearchInput value={filters.query} onChange={(query) => set({ query })} />
      <FilterSelects entries={entries} filters={filters} set={set} />
      <span className="ml-auto text-xs text-muted-foreground">{`Showing ${shown} of ${entries.length}`}</span>
    </div>
  )
}

interface FilterSelectsProps {
  entries: HistoryEntry[]
  filters: HistoryFilters
  set: (patch: Partial<HistoryFilters>) => void
}

function FilterSelects({ entries, filters, set }: FilterSelectsProps) {
  return selects(entries).map(({ key, width, ...spec }) => (
    <OptionSelect
      key={key}
      {...spec}
      className={cn('h-7 text-xs', width)}
      value={filters[key]}
      onChange={(value) => set({ [key]: value })}
    />
  ))
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-64">
      <Search aria-hidden className="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
      <Input
        aria-label="Search history"
        placeholder="Search name, URL, status…"
        className="h-7 pl-8 text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
