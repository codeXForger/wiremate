import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConsoleStore, CONSOLE_LIMIT } from '@/stores/console-store'
import { openRequest, renderApp } from '../../../test/render-app'
import { installBridge } from '../../../test/wiremate-stub'
import { formatClock } from './console-filter'

describe('console', () => {
  it('shows what was sent, what came back and script logs', async () => {
    installBridge()
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.click(screen.getByRole('button', { name: 'Console' }))
    const panel = screen.getByRole('region', { name: 'Console' })
    expect(within(panel).getByText(/show up here/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Scripts/ }))
    await user.click(screen.getByRole('tab', { name: 'Post-response' }))
    await user.click(screen.getByRole('textbox', { name: 'Post-response script' }))
    await user.paste("console.log('status', wm.response.status); console.error('oops')")
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const request = await within(panel).findByRole('listitem', { name: 'request: GET https://httpbin.org/get' })
    expect(request).toHaveTextContent('List users')
    expect(request).toHaveTextContent('Accept: application/json')
    expect(within(panel).getByRole('listitem', { name: /^response: 200 OK · 34 ms/ })).toHaveTextContent('x-echo: yes')
    expect(within(panel).getByRole('listitem', { name: 'post-response: status 200' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Console/ })).toHaveTextContent('Console1')

    await user.click(within(panel).getByRole('combobox', { name: 'Log level' }))
    await user.click(await screen.findByRole('option', { name: 'error' }))
    expect(within(panel).getAllByRole('listitem')).toHaveLength(1)

    await user.click(within(panel).getByRole('button', { name: 'Clear console' }))
    expect(within(panel).queryAllByRole('listitem')).toHaveLength(0)
    await user.click(within(panel).getByRole('button', { name: 'Close console' }))
    expect(screen.queryByRole('region', { name: 'Console' })).not.toBeInTheDocument()
  })

  it('toggles with Ctrl+` and keeps only the newest entries', async () => {
    await renderApp()
    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    expect(screen.getByRole('region', { name: 'Console' })).toBeInTheDocument()
    const entry = { id: 'x', at: 0, source: 'system' as const, level: 'log' as const, message: 'm' }
    useConsoleStore.getState().append(Array.from({ length: CONSOLE_LIMIT + 5 }, (_, i) => ({ ...entry, id: `e${i}` })))
    expect(useConsoleStore.getState().entries).toHaveLength(CONSOLE_LIMIT)
    expect(useConsoleStore.getState().entries[0]?.id).toBe('e5')
  })

  it('formats timestamps with milliseconds', () => {
    expect(formatClock(new Date(2026, 0, 2, 3, 4, 5, 6).getTime())).toBe('03:04:05.006')
  })
})
