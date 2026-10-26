import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HttpResult, WireRequest, WireResponse } from '@shared/types/http'
import { useConsoleStore } from '@/stores/console-store'
import { useSessionVariables } from '@/stores/session-variables'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { openRequest, renderApp, type User } from '../../../test/render-app'
import { echoResponse, installBridge } from '../../../test/wiremate-stub'

async function writeScript(user: User, phase: 'Pre-request' | 'Post-response', code: string) {
  await user.click(screen.getByRole('tab', { name: /^Scripts/ }))
  await user.click(screen.getByRole('tab', { name: phase }))
  await user.click(screen.getByRole('textbox', { name: `${phase} script` }))
  await user.paste(code)
}

async function send(user: User) {
  await user.click(screen.getByRole('button', { name: 'Send' }))
  return screen.findByText(/^(200 OK|Failed)$/)
}

function localVariable(name: string): string | undefined {
  const local = useWorkspaceStore.getState().environments.find((env) => env.name === 'Local')
  return local?.variables.find((row) => row.key === name)?.value
}

describe('request scripts', () => {
  it('runs post-response tests, shows the results and saves variables', async () => {
    installBridge()
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await writeScript(
      user,
      'Post-response',
      `wm.test('status is 200', () => wm.expect(wm.response.status).toBe(200))
       wm.test('is slow', () => wm.expect(wm.response.time).toBeGreaterThan(1000))
       wm.env.set('lastMethod', wm.response.json().method)`
    )
    expect(screen.getByRole('tab', { name: 'Scripts 1' })).toBeInTheDocument()
    await send(user)

    await user.click(screen.getByRole('tab', { name: 'Tests 1/2' }))
    expect(screen.getByText('1 passed, 1 failed')).toBeInTheDocument()
    const results = screen.getByRole('list', { name: 'Test results' })
    expect(within(results).getByRole('listitem', { name: 'Passed: status is 200' })).toBeInTheDocument()
    expect(within(results).getByRole('listitem', { name: 'Failed: is slow' })).toHaveTextContent(
      'expected 34 to be greater than 1000'
    )
    expect(screen.getByLabelText('Response time 34 ms')).toHaveAttribute('title', 'Time to first byte: 12 ms')
    expect(localVariable('lastMethod')).toBe('GET')
  })

  it('lets the pre-request script set variables used by the request', async () => {
    const bridge = installBridge()
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.clear(screen.getByRole('textbox', { name: 'Request URL' }))
    await user.paste('{{baseUrl}}/users/{{userId}}')
    await writeScript(user, 'Pre-request', "wm.env.set('userId', '42'); console.log('picked', wm.env.get('userId'))")
    await send(user)
    expect(bridge.sendHttp).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:3000/users/42' }),
      expect.stringMatching(/^xfer_/)
    )
    expect(useConsoleStore.getState().entries.map((entry) => entry.message)).toContain('picked 42')
    expect(screen.getByRole('tab', { name: 'Tests' })).toBeInTheDocument()
  })

  it('cancels a request that is still on its way', async () => {
    installBridge(() => new Promise(() => undefined))
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await writeScript(user, 'Post-response', "wm.env.set('ran', 'yes')")
    await user.click(screen.getByRole('button', { name: 'Send' }))
    const pending = await screen.findByRole('status', { name: 'Sending request' })
    expect(pending).toHaveTextContent('Sending request…')
    await user.click(within(pending).getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Sending request' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Request cancelled')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
    expect(localVariable('ran')).toBeUndefined()
    expect(useConsoleStore.getState().entries.at(-1)).toMatchObject({ level: 'warn', message: 'Request cancelled' })
  })

  it('hides the previous response while a new one is on its way', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let respond: (result: HttpResult) => void = () => undefined
    installBridge((request) =>
      request.url.includes('slow') ? new Promise((resolve) => (respond = resolve)) : echoResponse(request)
    )
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await send(user)
    expect(screen.getByRole('textbox', { name: 'Response body' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), '?slow=1')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    const pending = await screen.findByRole('status', { name: 'Sending request' })
    expect(screen.queryByRole('textbox', { name: 'Response body' })).not.toBeInTheDocument()
    expect(screen.queryByText('200 OK')).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(pending).toHaveTextContent(/1\.[5-9]\d s/)

    act(() => respond(echoResponse({ method: 'GET', url: 'https://httpbin.org/get?slow=1', headers: [], body: null })))
    expect(await screen.findByText('200 OK')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Sending request' })).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('runs the post-response script on a 404 and shows a script error in the Tests tab', async () => {
    const notFound = (request: WireRequest): HttpResult => ({
      ...(echoResponse(request) as WireResponse),
      status: 404,
      statusText: 'Not Found',
      body: '<html>Not Found</html>'
    })
    installBridge(notFound)
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await writeScript(
      user,
      'Post-response',
      `wm.test('is 404', () => wm.expect(wm.response.status).toBe(404))
       const data = wm.response.json()
       wm.test('never runs', () => {})`
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(await screen.findByRole('tab', { name: /^Tests 1\/1\s*·\s*script error$/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Post-response script failed: wm.response.json() could not read the body as JSON (404 Not Found'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Tests written after the failing line did not run.')
    expect(screen.getByRole('listitem', { name: 'Passed: is 404' })).toBeInTheDocument()
  })

  it('shows network errors in place of the body', async () => {
    installBridge(() => ({ kind: 'error', error: 'connect ECONNREFUSED', durationMs: 3 }))
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await send(user)
    expect(screen.getByRole('alert')).toHaveTextContent('connect ECONNREFUSED')
  })

  it('keeps variables for the session when no environment is active', async () => {
    installBridge()
    const { user } = await renderApp()
    useWorkspaceStore.getState().setActiveEnvironment(null)
    await openRequest(user, 'API', /List users/)
    await writeScript(user, 'Post-response', "wm.env.set('token', 'abc')")
    await send(user)
    expect(useSessionVariables.getState().variables).toEqual({ token: 'abc' })
    expect(useConsoleStore.getState().entries.at(-1)?.message).toMatch(/kept for this session only/)
    await user.click(screen.getByRole('tab', { name: 'Tests' }))
    expect(screen.getByText(/No tests ran/)).toBeInTheDocument()
  })
})
