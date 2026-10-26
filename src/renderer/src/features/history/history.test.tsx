import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '@shared/types/history'
import { services } from '@/services'
import { useHistoryStore } from '@/stores/history-store'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { answerDeleteDialog, goTo, openRequest, renderApp, type User } from '../../../test/render-app'
import { installBridge } from '../../../test/wiremate-stub'
import { filterChoices, filterHistory, NO_ENVIRONMENT, NO_FILTERS } from './history-filter'

async function openHistory(user: User) {
  await goTo(user, 'API')
  await user.click(screen.getByRole('button', { name: /^History/ }))
  return screen.getByRole('region', { name: 'History · API requests' })
}

function rows(page: HTMLElement) {
  return within(within(page).getByRole('table', { name: 'Sent requests' }))
    .getAllByRole('row')
    .slice(1)
}

async function choose(user: User, filter: string, option: string) {
  const page = screen.getByRole('region', { name: 'History · API requests' })
  await user.click(within(page).getByRole('combobox', { name: filter }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('request history', () => {
  it('lives in the API pane and records every send, newest first', async () => {
    installBridge((request) =>
      request.url.includes('missing')
        ? {
            kind: 'response',
            status: 404,
            statusText: 'Not Found',
            headers: [],
            body: 'nope',
            sizeBytes: 4,
            timings: { firstByteMs: 1, totalMs: 9 }
          }
        : {
            kind: 'response',
            status: 200,
            statusText: 'OK',
            headers: [],
            body: '{}',
            sizeBytes: 2048,
            timings: { firstByteMs: 1, totalMs: 120 }
          }
    )
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('200 OK')
    useWorkspaceStore.getState().setActiveEnvironment('env_staging')
    await user.clear(screen.getByRole('textbox', { name: 'Request URL' }))
    await user.paste('https://api.test/missing')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('404 Not Found')

    expect(screen.getByRole('button', { name: /^History/ })).toHaveTextContent('History2')
    const page = await openHistory(user)
    expect(screen.getByRole('tab', { name: /History · API requests/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(page).getByText('Showing 2 of 2')).toBeInTheDocument()
    const [newest, oldest] = rows(page)
    expect(newest).toHaveTextContent('GETList usershttps://api.test/missingStaging404 Not Found')
    expect(oldest).toHaveTextContent('https://httpbin.org/getLocal200 OK120 ms2.0 KB')
    expect(await services.history.listHistory('ws_demo', 'api')).toHaveLength(2)
  })

  it('searches and filters, and opens the request from a row', async () => {
    const { user } = await renderApp()
    seed()
    const page = await openHistory(user)
    expect(rows(page)).toHaveLength(4)

    await user.type(within(page).getByRole('textbox', { name: 'Search history' }), 'orders')
    expect(rows(page)).toHaveLength(2)
    await user.clear(within(page).getByRole('textbox', { name: 'Search history' }))

    await choose(user, 'Status', '4xx')
    expect(rows(page).map((row) => row.textContent)).toEqual([expect.stringContaining('404')])
    await choose(user, 'Status', 'All statuses')
    await choose(user, 'Method', 'POST')
    expect(rows(page)).toHaveLength(1)
    await choose(user, 'Method', 'All methods')
    await choose(user, 'Environment', 'No environment')
    expect(rows(page)).toHaveLength(1)
    await choose(user, 'Environment', 'All environments')
    await choose(user, 'Tests', 'Failing')
    expect(rows(page)[0]).toHaveTextContent('Orders')
    expect(rows(page)).toHaveLength(1)
    await choose(user, 'Tests', 'No tests')
    expect(within(page).getByText('Showing 2 of 4')).toBeInTheDocument()
    await choose(user, 'Tests', 'All tests')

    await user.type(within(page).getByRole('textbox', { name: 'Search history' }), 'zzz')
    expect(within(page).getByText('No sent request matches these filters.')).toBeInTheDocument()
    await user.clear(within(page).getByRole('textbox', { name: 'Search history' }))

    const gone = rows(page).find((row) => row.textContent.includes('Gone'))!
    expect(gone).toHaveAttribute('title', 'The request was deleted')
    expect(gone).toHaveTextContent('Cancelled')
    await user.click(gone)
    expect(useTabStore.getState().activeId).toBe('history_api')
    const listUsers = rows(page).find((row) => row.textContent.includes('List users'))!
    await user.click(listUsers)
    expect(useTabStore.getState().activeId).toBe('r_f_api_0')
  })

  it('clears the history after confirming', async () => {
    const { user } = await renderApp()
    seed()
    const page = await openHistory(user)
    await user.click(within(page).getByRole('button', { name: 'Clear history' }))
    expect(await answerDeleteDialog(user, 'Cancel')).toContain('All 4 requests in the API history will be removed.')
    expect(rows(page)).toHaveLength(4)
    await user.click(within(page).getByRole('button', { name: 'Clear history' }))
    await answerDeleteDialog(user)
    expect(within(page).getByText('Requests you send show up here, newest first.')).toBeInTheDocument()
    expect(within(page).getByRole('button', { name: 'Clear history' })).toBeDisabled()
    expect(await services.history.listHistory('ws_demo', 'api')).toEqual([])
  })

  it('loads the history of the workspace that opens', async () => {
    const { user } = await renderApp()
    await services.history.addHistory('ws_demo', entry({ id: 'h_saved' }))
    await useWorkspaceStore.getState().createWorkspace({ name: 'Other', path: '/other' })
    await useWorkspaceStore.getState().openWorkspace('ws_demo')
    await goTo(user, 'API')
    expect(await screen.findByRole('button', { name: /^History/ })).toHaveTextContent('History1')
  })
})

function entry(patch: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'h_1',
    category: 'api',
    at: Date.now(),
    requestId: 'r_f_api_0',
    requestName: 'List users',
    method: 'GET',
    url: 'https://api.test/users',
    environmentName: 'Local',
    status: 200,
    statusText: 'OK',
    durationMs: 30,
    sizeBytes: 100,
    testsPassed: 0,
    testsFailed: 0,
    ...patch
  }
}

const SEED: HistoryEntry[] = [
  entry({ id: 'h_4', requestName: 'Create order', method: 'POST', url: 'https://api.test/orders', testsPassed: 2 }),
  entry({
    id: 'h_3',
    requestName: 'Orders',
    url: 'https://api.test/orders/9',
    status: 404,
    statusText: 'Not Found',
    testsFailed: 1,
    testsPassed: 1
  }),
  entry({
    id: 'h_2',
    requestName: 'Gone',
    requestId: 'req_gone',
    environmentName: null,
    status: 0,
    statusText: 'Error',
    error: 'Request cancelled',
    at: 1
  }),
  entry({ id: 'h_1' })
]

function seed() {
  useHistoryStore.setState({ entries: { api: SEED } })
}

describe('history filters', () => {
  it('lists the methods and environments that occur', () => {
    expect(filterChoices(SEED)).toEqual({ methods: ['GET', 'POST'], environments: ['Local', NO_ENVIRONMENT] })
  })

  it('matches search on name, URL, environment, status and method', () => {
    const search = (query: string) => filterHistory(SEED, { ...NO_FILTERS, query }).map((e) => e.id)
    expect(search('ORDERS')).toEqual(['h_4', 'h_3'])
    expect(search('404')).toEqual(['h_3'])
    expect(search('local')).toEqual(['h_4', 'h_3', 'h_1'])
    expect(search('post')).toEqual(['h_4'])
    expect(search('  ')).toHaveLength(4)
    expect(
      filterHistory(SEED, { ...NO_FILTERS, status: 'none', environment: NO_ENVIRONMENT }).map((e) => e.id)
    ).toEqual(['h_2'])
    expect(filterHistory(SEED, { ...NO_FILTERS, environment: 'Local', tests: 'passing' }).map((e) => e.id)).toEqual([
      'h_4'
    ])
  })
})
