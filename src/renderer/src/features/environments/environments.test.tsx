import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { renderApp } from '../../../test/render-app'

describe('environments', () => {
  it('edits variables of the active environment', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Env' }))
    expect(screen.getByText(/Variables in Local/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add variable' }))
    await user.type(screen.getAllByRole('textbox', { name: 'Key' }).at(-1)!, 'token')
    expect(useWorkspaceStore.getState().environments[0]!.variables.at(-1)?.key).toBe('token')
  })

  it('adds an environment and can deselect all', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'Env' }))
    await user.click(screen.getByRole('button', { name: 'New environment' }))
    expect(screen.getByText(/Variables in Environment 3/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Environment' }))
    await user.click(await screen.findByRole('option', { name: 'No environment' }))
    expect(screen.getByText(/Pick an environment/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Environment' }))
    await user.click(await screen.findByRole('option', { name: 'Staging' }))
    expect(screen.getByText(/Variables in Staging/)).toBeInTheDocument()
  })
})
