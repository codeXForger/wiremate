import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { renderApp } from '../../../test/render-app'

async function openMenu(name: RegExp) {
  fireEvent.contextMenu(screen.getByRole('treeitem', { name }))
  return screen.findByRole('menu')
}

describe('Explorer', () => {
  it('collapses and expands folders', async () => {
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

  it('creates folders from the header and the context menu', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New folder' }))
    expect(screen.getByRole('treeitem', { name: /^New folder$/ })).toBeInTheDocument()
    await user.click(await openMenu(/Realtime/).then(() => screen.getByRole('menuitem', { name: /New folder/ })))
    const nested = useWorkspaceStore.getState().nodes.filter((n) => n.parentId === 'f_realtime' && n.kind === 'folder')
    expect(nested).toHaveLength(1)
  })

  it('creates a request inside the folder chosen from the context menu', async () => {
    const { user } = await renderApp()
    await openMenu(/List users/)
    await user.click(screen.getByRole('menuitem', { name: /New request/ }))
    await user.click(screen.getByRole('button', { name: /^Kafka/ }))
    const created = useWorkspaceStore.getState().nodes.find((n) => n.protocol === 'kafka' && n.parentId === 'f_api')
    expect(created?.name).toBe('Kafka request')
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

  it('deletes a folder and closes tabs for removed requests', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('treeitem', { name: /Echo socket/ }))
    expect(screen.getByRole('tab', { name: /Echo socket/ })).toBeInTheDocument()
    await openMenu(/Realtime/)
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }))
    expect(screen.queryByRole('treeitem', { name: /Realtime/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Echo socket/ })).not.toBeInTheDocument()
  })

  it('shows an empty state for a workspace without requests', async () => {
    await renderApp()
    useWorkspaceStore.setState({ nodes: [], requests: {} })
    expect(await screen.findByText(/No requests yet/)).toBeInTheDocument()
  })
})
