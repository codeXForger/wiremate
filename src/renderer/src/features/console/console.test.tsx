import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useConsoleStore, CONSOLE_LIMIT } from '@/stores/console-store'
import { openRequest, renderApp } from '../../../test/render-app'
import { installBridge } from '../../../test/wiremate-stub'
import { entryText, formatClock } from './console-filter'

describe('console', () => {
  it('shows what was sent, what came back and script logs', async () => {
    // Chromium's scrollIntoView returns a promise; an effect must not hand that to React as its cleanup.
    const returnsPromise = (() => Promise.resolve()) as unknown as () => void
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(returnsPromise)
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
    scroll.mockRestore()
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

  it('copies an entry, or everything shown, as text', async () => {
    // user-event puts its own clipboard in place, so read back what was written.
    installBridge()
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(screen.getByRole('button', { name: 'Console' }))
    const panel = screen.getByRole('region', { name: 'Console' })
    expect(within(panel).getByRole('list', { name: 'Console entries' }).parentElement).toHaveClass('select-text')

    const request = await within(panel).findByRole('listitem', { name: /^request: GET/ })
    await user.click(within(request).getByRole('button', { name: 'Copy entry' }))
    expect(await navigator.clipboard.readText()).toMatch(
      /^\d\d:\d\d:\d\d\.\d{3} request List users GET https:\/\/httpbin\.org\/get\nAccept: application\/json$/
    )
    expect(await within(request).findByRole('button', { name: 'Copied' })).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Copy all' }))
    const all = await navigator.clipboard.readText()
    expect(all).toMatch(/request List users GET https:\/\/httpbin\.org\/get[\s\S]*response List users 200 OK/)
    expect(all).toContain('"method":"GET"')
  })

  it('formats timestamps with milliseconds', () => {
    expect(formatClock(new Date(2026, 0, 2, 3, 4, 5, 6).getTime())).toBe('03:04:05.006')
  })
})

describe('entryText', () => {
  it('leaves out what an entry does not have', () => {
    const at = new Date(2026, 0, 1, 9, 30, 0, 5).getTime()
    expect(entryText({ id: 'a', at, source: 'system', level: 'warn', message: 'careful' })).toBe(
      '09:30:00.005 wiremate careful'
    )
  })
})
