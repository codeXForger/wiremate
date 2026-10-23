import type { ConsoleEntry, LogLevel } from '@shared/types/scripting'

export const LEVEL_FILTERS = ['all', 'log', 'info', 'warn', 'error'] as const
export type LevelFilter = (typeof LEVEL_FILTERS)[number]

export function filterEntries(entries: ConsoleEntry[], filter: LevelFilter): ConsoleEntry[] {
  return filter === 'all' ? entries : entries.filter((entry) => entry.level === filter)
}

export function countLevel(entries: ConsoleEntry[], level: LogLevel): number {
  return entries.filter((entry) => entry.level === level).length
}

export function formatClock(at: number): string {
  const time = new Date(at)
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0')
  return `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(time.getMilliseconds(), 3)}`
}
