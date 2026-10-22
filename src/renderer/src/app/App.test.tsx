import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_IDS } from '@shared/protocols/categories'
import { useTabStore } from '@/stores/tab-store'
import { goTo, renderApp } from '../../test/render-app'

describe('App shell', () => {
  it('opens the first workspace and shows its path and request count', async () => {
    await renderApp()
    expect(screen.getByRole('button', { name: 'Switch workspace' })).toHaveTextContent('Demo workspace')
    expect(screen.getByText('~/WireMate/demo')).toBeInTheDocument()
    expect(screen.getByText('8 requests')).toBeInTheDocument()
    expect(screen.getByText(/Open a request from the sidebar/)).toBeInTheDocument()
  })

  it('lists every section in the rail with API selected', async () => {
    await renderApp()
    const rail = screen.getByRole('navigation', { name: 'Sections' })
    const labels = within(rail)
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(labels).toEqual([...CATEGORY_IDS.map((id) => CATEGORIES[id].label), 'Env', 'History', 'Settings'])
    expect(within(rail).getByRole('button', { name: 'API' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows each section with its own menu and collections', async () => {
    const { user } = await renderApp()
    await goTo(user, 'MQTT')
    expect(screen.getByRole('heading', { name: 'MQTT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New MQTT request' })).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: 'MQTT collections' })).toHaveTextContent('Home sensors')
    expect(screen.queryByRole('treeitem', { name: /List users/ })).not.toBeInTheDocument()
    await goTo(user, 'Network')
    expect(screen.getByRole('button', { name: 'New TCP request' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New UDP request' })).toBeInTheDocument()
    await goTo(user, 'GraphQL')
    expect(screen.getByRole('button', { name: 'New GraphQL request' })).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: 'GraphQL collections' })).toHaveTextContent('Countries')
    await goTo(user, 'API')
    expect(screen.queryByRole('button', { name: 'New GraphQL request' })).not.toBeInTheDocument()
  })

  it('switches to utility views', async () => {
    const { user } = await renderApp()
    await goTo(user, 'History')
    expect(screen.getByText(/newest first/)).toBeInTheDocument()
    await goTo(user, 'Settings')
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeDisabled()
  })

  it('toggles the theme from settings', async () => {
    const { user } = await renderApp()
    expect(document.documentElement).toHaveClass('dark')
    await goTo(user, 'Settings')
    await user.click(screen.getByRole('switch', { name: 'Dark theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('asks which protocol to use when a section has several', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Network')
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: /New request/ }))
    const dialog = await screen.findByRole('dialog', { name: 'New Network request' })
    expect(within(dialog).getByRole('button', { name: /^TCP/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^UDP/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /^Kafka/ })).not.toBeInTheDocument()
  })

  it('creates the request directly when a section has one protocol', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Kafka')
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: /New request/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Kafka request/ })).toBeInTheDocument()
  })

  it('handles keyboard shortcuts for new, save and close', async () => {
    const { user } = await renderApp()
    fireEvent.keyDown(window, { key: 'n', metaKey: true })
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

  it('uses API for ⌘N while a utility view is open', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Settings')
    fireEvent.keyDown(window, { key: 'n', metaKey: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /HTTP request/ })).toBeInTheDocument()
  })
})
