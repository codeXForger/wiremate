import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HttpConfig } from '@shared/types/protocol'
import { services } from '@/services'
import { useConsoleStore } from '@/stores/console-store'
import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { answerDeleteDialog, goTo, renderApp, type User } from '../../../test/render-app'
import { echoResponse, installBridge } from '../../../test/wiremate-stub'

/** Adds an HTTP request to the "Public APIs" collection, or to the section root with `parentId` null. */
function addHttpRequest(name: string, config: Partial<HttpConfig>, parentId: string | null = 'f_api'): string {
  const store = useWorkspaceStore.getState()
  const id = store.addRequest(parentId, 'http')
  store.renameNode(id, name)
  store.updateConfig<'http'>(id, config)
  return id
}

async function openPicker(user: User) {
  await user.click(screen.getByRole('button', { name: 'Choose requests' }))
  return screen.findByRole('dialog', { name: 'Suite requests' })
}

/** Ticks the named requests or folders in the picker and adds them. */
async function addToSuite(user: User, ...names: string[]) {
  const dialog = await openPicker(user)
  for (const name of names) await user.click(within(dialog).getByRole('checkbox', { name }))
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))
}

/** Waits for the run to finish, then gives its dashboard: the header and the stat tiles by label. */
async function dashboard(editor: HTMLElement) {
  const header = () => within(editor).getByRole('status', { name: 'Run summary' })
  await waitFor(() => expect(header()).not.toHaveTextContent(/Running/))
  return { header: header(), tile: (label: string) => within(editor).getByRole('group', { name: label }) }
}

async function newSuite(user: User) {
  await goTo(user, 'API')
  expect(screen.getByText(/^No suites yet/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'New suite' }))
  return screen.getByRole('region', { name: 'Suite 1 suite' })
}

describe('test suites', () => {
  it('builds a suite from folders and requests, runs it and keeps its history', async () => {
    installBridge((request) =>
      request.url.endsWith('/broken') ? { kind: 'error', error: 'ECONNREFUSED', durationMs: 1 } : echoResponse(request)
    )
    const { user } = await renderApp()
    addHttpRequest('Login', {
      url: 'https://api.test/login',
      scripts: {
        pre: '',
        post: "wm.test('ok', () => wm.expect(wm.response.status).toBe(200)); wm.env.set('token', 't1')"
      }
    })
    addHttpRequest('Broken', { url: 'https://api.test/broken' })
    addHttpRequest('Health', { url: 'https://api.test/health' }, null)
    const editor = await newSuite(user)
    expect(screen.getByRole('tab', { name: /Suite 1/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(editor).getByRole('button', { name: 'Run suite' })).toBeDisabled()

    await addToSuite(user, 'Public APIs')
    await addToSuite(user, 'Health')
    const list = within(editor).getByRole('list', { name: 'Suite requests' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.getAttribute('aria-label'))
    ).toEqual(['1. Public APIs', '2. Health'])
    expect(within(list).getByText('3 HTTP requests')).toBeInTheDocument()
    await user.click(within(list).getByRole('button', { name: 'Move Health up' }))
    expect(within(list).getAllByRole('listitem')[0]).toHaveAccessibleName('1. Health')

    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    const { header, tile } = await dashboard(editor)
    expect(header).toHaveTextContent('1 failed')
    expect(header).toHaveTextContent('Local')
    expect(tile('Requests')).toHaveTextContent('Requests43 passed, 1 failed')
    expect(tile('Tests')).toHaveTextContent('Tests11 passed, 0 failed')
    expect(tile('Average response')).toHaveTextContent('over 3 responses')
    expect(tile('Slowest')).toHaveTextContent('34 ms')
    expect(within(editor).getByRole('group', { name: 'Pass rate' })).toHaveTextContent('100%of tests passed')
    expect(
      within(editor).getByRole('img', { name: 'Requests (4 of 4): 3 passed, 1 failed, 0 skipped' })
    ).toBeInTheDocument()
    expect(within(editor).getByRole('list', { name: 'Status codes' })).toHaveTextContent(
      'Status codes2xx 3No response 1'
    )
    expect(within(editor).getByRole('listitem', { name: 'failed: Broken' })).toHaveTextContent('no response')
    const results = within(editor).getByRole('list', { name: 'Run results' })
    await user.click(within(editor).getByRole('button', { name: 'Failed 1' }))
    expect(Array.from(results.children).map((row) => row.getAttribute('aria-label'))).toEqual(['failed: Broken'])
    await user.click(within(editor).getByRole('button', { name: 'All 4' }))
    expect(Array.from(results.children).map((row) => row.getAttribute('aria-label'))).toEqual([
      'passed: Health',
      'passed: List users',
      'passed: Login',
      'failed: Broken'
    ])
    expect(within(results).getByRole('listitem', { name: 'failed: Broken' })).toHaveTextContent('ECONNREFUSED')
    expect(within(results).getByRole('listitem', { name: 'passed: Login' })).toHaveTextContent('1/1 tests')
    const local = useWorkspaceStore.getState().environments[0]!
    expect(local.variables.find((row) => row.key === 'token')?.value).toBe('t1')
    expect(
      useConsoleStore.getState().entries.some((entry) => entry.message.startsWith('GET https://api.test/login'))
    ).toBe(true)

    await user.click(within(editor).getByRole('tab', { name: 'History 1' }))
    await user.click(within(editor).getByRole('button', { name: /Local.*3 passed, 1 failed/ }))
    expect(within(editor).getByRole('status', { name: 'Run summary' })).toHaveTextContent('Local')
    await user.click(within(editor).getByRole('button', { name: 'All runs' }))
    expect(within(editor).getByRole('list', { name: 'Past runs' })).toBeInTheDocument()

    const suiteId = useTabStore.getState().activeId!
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId!
    expect(await services.suites.listRuns(workspaceId, suiteId)).toHaveLength(1)
    expect((await services.suites.listSuites(workspaceId))[0]?.items).toHaveLength(2)
  })

  it('stops on the first failure, edits options and removes items', async () => {
    installBridge(() => ({ kind: 'error', error: 'down', durationMs: 1 }))
    const { user } = await renderApp()
    addHttpRequest('Second', { url: 'https://api.test/2' })
    addHttpRequest('Third', { url: 'https://api.test/3' })
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await addToSuite(user, 'Second', 'Third')
    await user.click(within(editor).getByRole('switch', { name: 'Stop on first failure' }))
    fireEvent.change(within(editor).getByLabelText('Delay (ms)'), { target: { value: '-5' } })
    const suite = () => useSuiteStore.getState().suites[0]!
    expect(suite().options).toEqual({ stopOnFailure: true, delayMs: 0 })
    await user.click(within(editor).getByRole('button', { name: 'Remove Third' }))
    await user.click(within(editor).getByRole('button', { name: 'Move List users down' }))
    expect(suite().items).toHaveLength(2)

    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    const { header, tile } = await dashboard(editor)
    expect(header).toHaveTextContent('1 failed')
    expect(tile('Requests')).toHaveTextContent('0 passed, 1 failed, 1 skipped')
    expect(within(editor).getByRole('group', { name: 'Pass rate' })).toHaveTextContent('0%of requests passed')
  })

  it('stops a running suite', async () => {
    installBridge((request) => (request.url.endsWith('/hang') ? new Promise(() => undefined) : echoResponse(request)))
    const { user } = await renderApp()
    addHttpRequest('Hangs', { url: 'https://api.test/hang' })
    addHttpRequest('Never sent', { url: 'https://api.test/later' })
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await addToSuite(user, 'Hangs')
    await addToSuite(user, 'Never sent')
    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    await user.click(await within(editor).findByRole('button', { name: 'Stop run' }))

    const { header, tile } = await dashboard(editor)
    expect(header).toHaveTextContent('Stopped')
    expect(tile('Requests')).toHaveTextContent('1 passed, 0 failed, 2 skipped')
    const results = within(editor).getByRole('list', { name: 'Run results' })
    expect(within(results).getByRole('listitem', { name: 'skipped: Hangs' })).toHaveTextContent(
      'Cancelled because the run was stopped'
    )
    expect(within(editor).getByRole('button', { name: 'Run suite' })).toBeEnabled()
    expect(useSuiteStore.getState().history[useSuiteStore.getState().suites[0]!.id]?.[0]?.stopped).toBe(true)
  })

  it('saves the run as a PDF report in two visible steps, then says where in a toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const bridge = installBridge()
    const { user } = await renderApp()
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    const { header } = await dashboard(editor)
    const run = useSuiteStore.getState().history[useSuiteStore.getState().suites[0]!.id]![0]!

    let choose: (path: string | null) => void = () => undefined
    let create: () => void = () => undefined
    vi.mocked(bridge.chooseReportFile).mockReturnValueOnce(new Promise((resolve) => (choose = resolve)))
    vi.mocked(bridge.savePdfReport).mockReturnValueOnce(new Promise((resolve) => (create = () => resolve())))
    await user.click(within(header).getByRole('button', { name: 'Download PDF' }))
    expect(within(header).getByRole('button', { name: 'Choose where to save…' })).toBeDisabled()
    expect(bridge.chooseReportFile).toHaveBeenCalledWith(
      expect.stringMatching(/^Suite 1 \d{4}-\d\d-\d\d \d\d-\d\d\.pdf$/)
    )
    act(() => choose('/reports/run.pdf'))
    expect(await within(header).findByRole('button', { name: 'Creating PDF…' })).toBeDisabled()
    expect(bridge.savePdfReport).toHaveBeenCalledWith(run, '/reports/run.pdf')
    act(() => create())

    const toast = await screen
      .findByRole('status', { name: '' })
      .catch(() => screen.getByText('Report saved').closest('li')!)
    expect(toast).toHaveTextContent('Report saved/reports/run.pdf')
    expect(await within(header).findByRole('button', { name: 'Download PDF' })).toBeEnabled()
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(screen.queryByText('Report saved')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('goes back to the button when cancelled and explains failures in a toast', async () => {
    const bridge = installBridge()
    const { user } = await renderApp()
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    const { header } = await dashboard(editor)
    const download = () => user.click(within(header).getByRole('button', { name: 'Download PDF' }))
    const notifications = () => screen.getByRole('list', { name: 'Notifications' })

    vi.mocked(bridge.chooseReportFile).mockResolvedValueOnce(null)
    await download()
    expect(await within(header).findByRole('button', { name: 'Download PDF' })).toBeEnabled()
    expect(bridge.savePdfReport).not.toHaveBeenCalled()
    expect(within(notifications()).queryAllByRole('listitem')).toHaveLength(0)

    vi.mocked(bridge.savePdfReport).mockRejectedValueOnce(new Error('disk full'))
    await download()
    expect(await within(notifications()).findByRole('alert')).toHaveTextContent('Could not save the reportdisk full')
    await user.click(within(notifications()).getByRole('button', { name: 'Dismiss' }))
    expect(within(notifications()).queryByRole('alert')).not.toBeInTheDocument()

    vi.mocked(bridge.chooseReportFile).mockRejectedValueOnce(
      new Error("No handler registered for 'report:choose-file'")
    )
    await download()
    expect(await within(notifications()).findByText(/Restart WireMate to finish updating/)).toBeInTheDocument()
    await user.click(within(notifications()).getByRole('button', { name: 'Dismiss' }))

    window.wiremate = { ...bridge, chooseReportFile: undefined } as unknown as typeof bridge
    await download()
    expect(await within(notifications()).findByText(/Restart WireMate to finish updating/)).toBeInTheDocument()
  })

  it('offers no PDF outside the desktop app', async () => {
    installBridge()
    const { user } = await renderApp()
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    await dashboard(editor)
    delete window.wiremate
    await user.click(within(editor).getByRole('tab', { name: /^Requests/ }))
    await user.click(within(editor).getByRole('tab', { name: 'Results' }))
    expect(within(editor).queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument()
  })

  it('switches to the results when a run starts', async () => {
    installBridge()
    const { user } = await renderApp()
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    expect(within(editor).getByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    expect(within(editor).getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true')
    expect((await dashboard(editor)).header).toHaveTextContent('All passed')
  })

  it('picks items in a searchable tree where a folder covers what is inside it', async () => {
    const { user } = await renderApp()
    addHttpRequest('Create user', { url: 'https://api.test/users' })
    await newSuite(user)
    await addToSuite(user, 'List users')
    const dialog = await openPicker(user)
    const list = within(dialog).getByRole('list', { name: 'Requests and folders' })
    expect(within(dialog).getByRole('checkbox', { name: 'List users' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Create user' })).not.toBeChecked()
    expect(within(dialog).getByText('No changes')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.type(within(dialog).getByRole('textbox', { name: 'Search requests and folders' }), 'create')
    expect(
      within(list)
        .getAllByRole('checkbox')
        .map((box) => box.getAttribute('aria-label'))
    ).toEqual(['Public APIs', 'Create user'])
    await user.clear(within(dialog).getByRole('textbox', { name: 'Search requests and folders' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Search requests and folders' }), 'nothing like it')
    expect(within(dialog).getByText('Nothing matches the search.')).toBeInTheDocument()
    await user.clear(within(dialog).getByRole('textbox', { name: 'Search requests and folders' }))

    await user.click(within(dialog).getByRole('checkbox', { name: 'Create user' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Public APIs' }))
    expect(within(dialog).getByRole('checkbox', { name: 'Create user' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Create user' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'List users' })).toBeDisabled()
    expect(within(dialog).getByText('1 to add · 1 to remove')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(useSuiteStore.getState().suites[0]!.items.map((item) => item.nodeId)).toEqual(['f_api'])
  })

  it('removes what is unticked and keeps the order of what stays', async () => {
    const { user } = await renderApp()
    addHttpRequest('Create user', { url: 'https://api.test/users' })
    addHttpRequest('Delete user', { url: 'https://api.test/users/1' })
    await newSuite(user)
    await addToSuite(user, 'Delete user', 'List users')
    const nodeIds = () => useSuiteStore.getState().suites[0]!.items.map((item) => item.nodeId)
    const [list, del] = [nodeIds()[0], nodeIds()[1]]
    const dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('checkbox', { name: 'List users' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Create user' }))
    expect(within(dialog).getByText('1 to add · 1 to remove')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(nodeIds()[0]).toBe(del)
    expect(nodeIds()).not.toContain(list)
    expect(nodeIds()).toHaveLength(2)
  })

  it('cancels the picker without adding anything', async () => {
    const { user } = await renderApp()
    await newSuite(user)
    const dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('checkbox', { name: 'List users' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useSuiteStore.getState().suites[0]!.items).toEqual([])
  })

  it('reorders by drag and drop and flags deleted requests', async () => {
    const { user } = await renderApp()
    addHttpRequest('Other', { url: 'https://api.test/other' })
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await addToSuite(user, 'Other')
    const rows = () => within(editor).getAllByRole('listitem')
    fireEvent.dragStart(rows()[1]!)
    fireEvent.dragOver(rows()[0]!)
    fireEvent.drop(rows()[0]!)
    fireEvent.dragEnd(rows()[0]!)
    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['1. Other', '2. List users'])

    const otherId = useSuiteStore.getState().suites[0]!.items[0]!.nodeId
    useWorkspaceStore.getState().removeNode(otherId)
    expect(await within(editor).findByText('It was deleted from the workspace')).toBeInTheDocument()
  })

  it('renames and deletes suites from the sidebar', async () => {
    const { user } = await renderApp()
    await newSuite(user)
    const sidebar = screen.getByRole('list', { name: 'Test suites' })
    await user.dblClick(within(sidebar).getByRole('listitem', { name: 'Suite 1' }))
    await user.clear(within(sidebar).getByRole('textbox', { name: 'Name' }))
    await user.type(within(sidebar).getByRole('textbox', { name: 'Name' }), 'Smoke{Enter}')
    expect(screen.getByRole('tab', { name: /Smoke/ })).toBeInTheDocument()

    await user.dblClick(screen.getByRole('tab', { name: /Smoke/ }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' tests{Enter}')
    expect(within(sidebar).getByRole('listitem', { name: 'Smoke tests' })).toBeInTheDocument()

    await user.click(within(sidebar).getByRole('button', { name: 'Delete Smoke tests' }))
    expect(await answerDeleteDialog(user)).toContain('"Smoke tests" and its run history will be deleted.')
    expect(screen.queryByRole('tab', { name: /Smoke/ })).not.toBeInTheDocument()
    expect(screen.getByText(/^No suites yet/)).toBeInTheDocument()
  })

  it('lives only in the API section', async () => {
    const { user } = await renderApp()
    expect(screen.getByRole('region', { name: 'Test suites section' })).toBeInTheDocument()
    await goTo(user, 'GraphQL')
    expect(screen.queryByRole('region', { name: 'Test suites section' })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Sections' })).queryByRole('button', { name: 'Tests' })
    ).toBeNull()
  })

  it('opens a suite from the sidebar and reloads suites with the workspace', async () => {
    const { user } = await renderApp()
    await newSuite(user)
    await user.click(screen.getByRole('button', { name: 'Close Suite 1' }))
    await user.click(
      within(screen.getByRole('list', { name: 'Test suites' })).getByRole('listitem', { name: 'Suite 1' })
    )
    expect(screen.getByRole('region', { name: 'Suite 1 suite' })).toBeInTheDocument()
    await useWorkspaceStore.getState().openWorkspace('ws_demo')
    expect(useSuiteStore.getState().suites.map((suite) => suite.name)).toEqual(['Suite 1'])
  })
})
