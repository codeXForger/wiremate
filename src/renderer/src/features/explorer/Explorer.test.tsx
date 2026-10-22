import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, renderApp } from '../../../test/render-app'

async function openMenu(name: RegExp) {
  fireEvent.contextMenu(screen.getByRole('treeitem', { name }))
  return screen.findByRole('menu')
}

describe('Collections tree', () => {
  it('collapses and expands collections', async () => {
    const { user } = await renderApp()
    const folder = screen.getByRole('treeitem', { name: /Public APIs/ })
    expect(folder).toHaveAttribute('aria-expanded', 'true')
    await user.click(folder)
    expect(folder).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('treeitem', { name: /List users/ })).not.toBeInTheDocument()
    folder.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('treeitem', { name: /List users/ })).toBeInTheDocument()
  })

  it('opens a request in a tab and marks it active', async () => {
    const { user } = await renderApp()
    const item = screen.getByRole('treeitem', { name: /Countries/ })
    await user.click(item)
    expect(item).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Countries/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('creates collections that belong to the current section', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Kafka')
    await user.click(screen.getByRole('button', { name: 'New collection' }))
    expect(screen.getByRole('treeitem', { name: /^New collection$/ })).toBeInTheDocument()
    await goTo(user, 'API')
    expect(screen.queryByRole('treeitem', { name: /^New collection$/ })).not.toBeInTheDocument()
    await openMenu(/Public APIs/)
    await user.click(screen.getByRole('menuitem', { name: /New folder/ }))
    const nested = useWorkspaceStore.getState().nodes.find((n) => n.parentId === 'f_api' && n.kind === 'folder')
    expect(nested?.category).toBe('api')
  })

  it('offers only the section protocols when adding to a collection', async () => {
    const { user } = await renderApp()
    await openMenu(/List users/)
    await user.click(screen.getByRole('menuitem', { name: /New request/ }))
    expect(screen.queryByRole('button', { name: /^Kafka/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^GraphQL/ }))
    const created = useWorkspaceStore.getState().nodes.find((n) => n.name === 'GraphQL request')
    expect(created?.parentId).toBe('f_api')
  })

  it('adds a request straight away in a single-protocol section', async () => {
    const { user } = await renderApp()
    await goTo(user, 'MQTT')
    await openMenu(/Home sensors/)
    await user.click(screen.getByRole('menuitem', { name: /New request/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: /MQTT request/ })).toBeInTheDocument()
  })

  it('renames with Enter and cancels with Escape', async () => {
    const { user } = await renderApp()
    await openMenu(/Countries/)
    await user.click(screen.getByRole('menuitem', { name: /Rename/ }))
    const input = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(input)
    await user.type(input, 'Nations{Enter}')
    expect(screen.getByRole('treeitem', { name: /Nations/ })).toBeInTheDocument()
    await openMenu(/Nations/)
    await user.click(screen.getByRole('menuitem', { name: /Rename/ }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'zzz{Escape}')
    expect(screen.getByRole('treeitem', { name: /Nations/ })).toBeInTheDocument()
  })

  it('ignores blank names on blur', async () => {
    const { user } = await renderApp()
    await openMenu(/Countries/)
    await user.click(screen.getByRole('menuitem', { name: /Rename/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    fireEvent.blur(screen.getByRole('textbox', { name: 'Name' }))
    expect(screen.getByRole('treeitem', { name: /Countries/ })).toBeInTheDocument()
  })

  it('deletes a collection and closes tabs for removed requests', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Realtime')
    await user.click(screen.getByRole('treeitem', { name: /Echo socket/ }))
    expect(screen.getByRole('tab', { name: /Echo socket/ })).toBeInTheDocument()
    await openMenu(/Chat/)
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }))
    expect(screen.queryByRole('treeitem', { name: /Chat/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Echo socket/ })).not.toBeInTheDocument()
    expect(screen.getByText(/No collections yet/)).toBeInTheDocument()
  })
})
