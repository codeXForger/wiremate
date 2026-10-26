import { CATEGORIES, type CategoryId } from '@shared/protocols/categories'
import type { HistoryEntry } from '@shared/types/history'
import { createId } from '@shared/utils/id'
import { tallyTests } from '@shared/utils/test-results'
import type { PipelineResult } from '@/services/request-pipeline'

export interface SentRequest {
  category: CategoryId
  requestId: string
  requestName: string
  environmentName: string | null
  at: number
}

/** What a send leaves in the history: the request as it went out and how the response came back. */
export function historyEntry(sent: SentRequest, { request, response }: PipelineResult): HistoryEntry {
  const tests = tallyTests(response.tests)
  const { status, statusText, durationMs, sizeBytes } = response
  const entry = { id: createId('hist'), ...sent, method: request.method, url: request.url }
  const outcome = { status, statusText, durationMs, sizeBytes, testsPassed: tests.passed, testsFailed: tests.failed }
  return response.error ? { ...entry, ...outcome, error: response.error } : { ...entry, ...outcome }
}

export function historyTabId(category: CategoryId): string {
  return `history_${category}`
}

export function historyCategoryOf(tabId: string): CategoryId | null {
  return tabId.startsWith('history_') ? (tabId.slice('history_'.length) as CategoryId) : null
}

export function historyTitle(category: CategoryId): string {
  return `History · ${CATEGORIES[category].label} requests`
}
