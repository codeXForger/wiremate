import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { openRequest, renderApp } from '../../../test/render-app'

describe('TabBar', () => {
  it('switches with the keyboard and closes tabs', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await openRequest(user, 'GraphQL', /Countries/)
    const first = screen.getByRole('tab', { name: /List users/ })
    first.focus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Close List users' }))
    expect(screen.getByRole('tab', { name: /Countries/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Close Countries' }))
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renames a request by double clicking its tab', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.dblClick(screen.getByRole('tab', { name: /List users/ }))
    const input = within(screen.getByRole('tablist', { name: 'Open requests' })).getByRole('textbox', { name: 'Name' })
    expect(input).toHaveFocus()
    await user.clear(input)
    await user.type(input, 'Search users{Enter}')
    expect(screen.getByRole('tab', { name: /Search users/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('treeitem', { name: /Search users/ })).toBeInTheDocument()
  })

  it('renames from the keyboard with F2 and cancels with Escape', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    screen.getByRole('tab', { name: /List users/ }).focus()
    await user.keyboard('{F2}')
    await user.keyboard('zzz{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /List users/ })).toBeInTheDocument()
  })

  it('cuts long names with an ellipsis and shows the full name on hover', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    const longName = 'List every user in the organisation including archived ones'
    useWorkspaceStore.getState().renameNode(useTabStore.getState().activeId!, longName)
    const title = await within(screen.getByRole('tablist', { name: 'Open requests' })).findByText(longName)
    expect(title).toHaveAttribute('title', longName)
    expect(title).toHaveClass('truncate', 'min-w-0')
  })
})
