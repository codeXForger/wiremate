import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { services } from '@/services'
import { renderApp } from '../../../test/render-app'

async function openCreateDialog(user: Awaited<ReturnType<typeof renderApp>>['user']) {
  await user.click(screen.getByRole('button', { name: 'Switch workspace' }))
  await user.click(await screen.findByRole('menuitem', { name: /New workspace/ }))
  return screen.findByRole('dialog', { name: 'New workspace' })
}

describe('workspaces', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates the form before creating', async () => {
    const { user } = await renderApp()
    const dialog = await openCreateDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Create workspace' }))
    expect(
      within(dialog)
        .getAllByRole('alert')
        .map((a) => a.textContent)
    ).toEqual(['Give the workspace a name', 'Choose a folder to store the workspace in'])
  })

  it('creates a workspace from a picked folder and switches to it', async () => {
    vi.spyOn(services.folderPicker, 'pick').mockResolvedValue('/work/payments')
    const { user } = await renderApp()
    const dialog = await openCreateDialog(user)
    await user.type(within(dialog).getByLabelText('Name'), 'Payments')
    await user.click(within(dialog).getByRole('button', { name: 'Browse…' }))
    expect(within(dialog).getByLabelText('Folder')).toHaveValue('/work/payments')
    await user.click(within(dialog).getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('/work/payments')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/No requests yet/)).toBeInTheDocument()
  })

  it('keeps the typed folder when the picker is cancelled', async () => {
    vi.spyOn(services.folderPicker, 'pick').mockResolvedValue(null)
    const { user } = await renderApp()
    const dialog = await openCreateDialog(user)
    await user.type(within(dialog).getByLabelText('Folder'), '/typed')
    await user.click(within(dialog).getByRole('button', { name: 'Browse…' }))
    expect(within(dialog).getByLabelText('Folder')).toHaveValue('/typed')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches back to the demo workspace from the menu', async () => {
    vi.spyOn(services.folderPicker, 'pick').mockResolvedValue('/work/x')
    const { user } = await renderApp()
    const dialog = await openCreateDialog(user)
    await user.type(within(dialog).getByLabelText('Name'), 'X')
    await user.click(within(dialog).getByRole('button', { name: 'Browse…' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create workspace' }))
    await user.click(await screen.findByRole('button', { name: 'Switch workspace' }))
    await user.click(await screen.findByRole('menuitem', { name: /Demo workspace/ }))
    expect(await screen.findByRole('treeitem', { name: /List users/ })).toBeInTheDocument()
  })
})
