import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { HttpConfig } from '@shared/types/protocol'
import { services } from '@/services'
import { useConsoleStore } from '@/stores/console-store'
import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, renderApp, type User } from '../../../test/render-app'
import { echoResponse, installBridge } from '../../../test/wiremate-stub'

function addHttpRequest(name: string, config: Partial<HttpConfig>): string {
  const store = useWorkspaceStore.getState()
  const id = store.addRequest('f_api', 'http')
  store.renameNode(id, name)
  store.updateConfig<'http'>(id, config)
  return id
}

async function addToSuite(user: User, name: string) {
  await user.click(screen.getByRole('button', { name: 'Add request or folder' }))
  // Request entries start with their method badge ("GET List users").
  await user.click(await screen.findByRole('menuitem', { name: new RegExp(`^(GET )?${name}$`) }))
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
    const editor = await newSuite(user)
    expect(screen.getByRole('tab', { name: /Suite 1/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(editor).getByRole('button', { name: 'Run suite' })).toBeDisabled()

    await addToSuite(user, 'Public APIs')
    await addToSuite(user, 'List users')
    const list = within(editor).getByRole('list', { name: 'Suite requests' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.getAttribute('aria-label'))
    ).toEqual(['1. Public APIs', '2. List users'])
    expect(within(list).getByText('3 HTTP requests')).toBeInTheDocument()
    await user.click(within(list).getByRole('button', { name: 'Move List users up' }))
    expect(within(list).getAllByRole('listitem')[0]).toHaveAccessibleName('1. List users')

    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    await user.click(within(editor).getByRole('tab', { name: 'Results' }))
    const summary = await within(editor).findByRole('status', { name: 'Run summary' })
    expect(summary).toHaveTextContent('3 passed, 1 failed')
    expect(summary).toHaveTextContent('Tests 1/1 passed')
    const results = within(editor).getByRole('list', { name: 'Run results' })
    expect(Array.from(results.children).map((row) => row.getAttribute('aria-label'))).toEqual([
      'passed: List users',
      'failed: Broken',
      'passed: List users',
      'passed: Login'
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
    const workspacePath = useWorkspaceStore.getState().workspaces[0]!.path
    expect(await services.suites.listRuns(workspacePath, suiteId)).toHaveLength(1)
    expect((await services.suites.listSuites(workspacePath))[0]?.items).toHaveLength(2)
  })

  it('stops on the first failure, edits options and removes items', async () => {
    installBridge(() => ({ kind: 'error', error: 'down', durationMs: 1 }))
    const { user } = await renderApp()
    addHttpRequest('Second', { url: 'https://api.test/2' })
    const editor = await newSuite(user)
    await addToSuite(user, 'List users')
    await addToSuite(user, 'Second')
    await addToSuite(user, 'Second')
    await user.click(within(editor).getByRole('switch', { name: 'Stop on first failure' }))
    fireEvent.change(within(editor).getByLabelText('Delay (ms)'), { target: { value: '-5' } })
    const suite = () => useSuiteStore.getState().suites[0]!
    expect(suite().options).toEqual({ stopOnFailure: true, delayMs: 0 })
    await user.click(within(editor).getAllByRole('button', { name: 'Remove Second' })[0]!)
    await user.click(within(editor).getByRole('button', { name: 'Move List users down' }))
    expect(suite().items).toHaveLength(2)

    await user.click(within(editor).getByRole('button', { name: 'Run suite' }))
    await user.click(within(editor).getByRole('tab', { name: 'Results' }))
    const summary = await within(editor).findByRole('status', { name: 'Run summary' })
    expect(summary).toHaveTextContent('0 passed, 1 failed')
    expect(summary).toHaveTextContent('1 skipped')
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
