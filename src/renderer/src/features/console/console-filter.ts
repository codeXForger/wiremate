import type { ConsoleEntry, ConsoleSource, LogLevel } from '@shared/types/scripting'

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

export const SOURCE_LABEL: Record<ConsoleSource, string> = {
  pre: 'pre-request',
  post: 'post-response',
  request: 'request',
  response: 'response',
  system: 'wiremate'
}

/** An entry as plain text, the way it reads in the console, with its headers and body when it has them. */
export function entryText(entry: ConsoleEntry): string {
  const line = [formatClock(entry.at), SOURCE_LABEL[entry.source], entry.requestName, entry.message]
  const text = line.filter((part) => part !== undefined && part !== '').join(' ')
  return entry.detail ? `${text}\n${entry.detail}` : text
}

export function entriesText(entries: ConsoleEntry[]): string {
  return entries.map(entryText).join('\n\n')
}
