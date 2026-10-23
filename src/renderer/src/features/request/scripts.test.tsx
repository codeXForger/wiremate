import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConsoleStore } from '@/stores/console-store'
import { useSessionVariables } from '@/stores/session-variables'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { openRequest, renderApp, type User } from '../../../test/render-app'
import { installBridge } from '../../../test/wiremate-stub'

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
    expect(bridge.sendHttp).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://localhost:3000/users/42' }))
    expect(useConsoleStore.getState().entries.map((entry) => entry.message)).toContain('picked 42')
    expect(screen.getByRole('tab', { name: 'Tests' })).toBeInTheDocument()
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
