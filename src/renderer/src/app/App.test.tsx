import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTabStore } from '@/stores/tab-store'
import { createRequest, renderApp } from '../../test/render-app'

describe('App shell', () => {
  it('opens the first workspace and shows its path and request count', async () => {
    await renderApp()
    expect(screen.getByRole('button', { name: 'Switch workspace' })).toHaveTextContent('Demo workspace')
    expect(screen.getByText('~/WireMate/demo')).toBeInTheDocument()
    expect(screen.getByText('5 requests')).toBeInTheDocument()
    expect(screen.getByText(/Open a request from the sidebar/)).toBeInTheDocument()
  })

  it('switches sidebar views from the activity bar', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText(/newest first/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Requests' }))
    expect(screen.getByRole('tree', { name: 'Requests' })).toBeInTheDocument()
  })

  it('toggles the theme from settings', async () => {
    const { user } = await renderApp()
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('switch', { name: 'Dark theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('starts a request from the empty editor', async () => {
    const { user } = await renderApp()
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: /New request/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Pick what you want to talk to.')
  })

  it('handles keyboard shortcuts for new, save and close', async () => {
    const { user } = await renderApp()
    fireEvent.keyDown(window, { key: 'n', metaKey: true })
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^HTTP/ }))
    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), '/x')
    expect(useTabStore.getState().dirtyIds).toHaveLength(1)
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(useTabStore.getState().dirtyIds).toHaveLength(0)
    fireEvent.keyDown(window, { key: 'w', metaKey: true })
    expect(useTabStore.getState().openIds).toHaveLength(0)
    fireEvent.keyDown(window, { key: 's', metaKey: true })
    fireEvent.keyDown(window, { key: 'w', metaKey: true })
    fireEvent.keyDown(window, { key: 'x', metaKey: true })
    fireEvent.keyDown(window, { key: 'n' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows each protocol in the new request dialog', async () => {
    const { user } = await renderApp()
    await createRequest(user, /^GraphQL/)
    expect(screen.getByRole('tab', { name: /GraphQL request/ })).toBeInTheDocument()
  })
})
