import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, renderApp, type User } from '../../../test/render-app'

const environment = (name: string) => useWorkspaceStore.getState().environments.find((env) => env.name === name)

async function openEnvironments(user: User) {
  await goTo(user, 'Env')
  return screen.getByRole('list', { name: 'Environments' })
}

describe('environments', () => {
  it('lists every environment and marks the active one', async () => {
    const { user } = await renderApp()
    const list = await openEnvironments(user)
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.getAttribute('aria-label'))
    ).toEqual(['Local', 'Staging'])
    expect(within(list).getByRole('listitem', { name: 'Local' })).toHaveTextContent('active')
    expect(within(list).getByRole('listitem', { name: 'Staging' })).not.toHaveTextContent('active')
  })

  it('opens an environment in a tab to add, edit and delete variables', async () => {
    const { user } = await renderApp()
    const list = await openEnvironments(user)
    await user.click(within(list).getByRole('listitem', { name: 'Staging' }))
    expect(screen.getByRole('tab', { name: /Staging/ })).toHaveAttribute('aria-selected', 'true')
    const editor = screen.getByRole('region', { name: 'Staging environment' })
    expect(within(editor).getByDisplayValue('https://staging.example.com')).toBeInTheDocument()

    await user.click(within(editor).getByRole('button', { name: 'Add variable' }))
    await user.type(within(editor).getAllByRole('textbox', { name: 'Key' }).at(-1)!, 'token')
    await user.type(within(editor).getAllByRole('textbox', { name: 'Value' }).at(-1)!, 'abc')
    expect(environment('Staging')?.variables.map(({ key, value }) => [key, value])).toEqual([
      ['baseUrl', 'https://staging.example.com'],
      ['token', 'abc']
    ])
    await user.click(within(editor).getByRole('button', { name: 'Remove baseUrl' }))
    expect(environment('Staging')?.variables.map(({ key }) => key)).toEqual(['token'])

    await user.click(within(editor).getByRole('button', { name: 'Use this environment' }))
    expect(useWorkspaceStore.getState().activeEnvironmentId).toBe('env_staging')
    expect(within(editor).queryByRole('button', { name: 'Use this environment' })).not.toBeInTheDocument()
  })

  it('adds, renames and deletes environments from the sidebar', async () => {
    const { user } = await renderApp()
    await openEnvironments(user)
    await user.click(screen.getByRole('button', { name: 'New environment' }))
    expect(screen.getByRole('region', { name: 'Environment 3 environment' })).toBeInTheDocument()
    expect(useWorkspaceStore.getState().activeEnvironmentId).toBe('env_local')

    const list = screen.getByRole('list', { name: 'Environments' })
    await user.dblClick(within(list).getByRole('listitem', { name: 'Environment 3' }))
    await user.clear(within(list).getByRole('textbox', { name: 'Name' }))
    await user.type(within(list).getByRole('textbox', { name: 'Name' }), 'Production{Enter}')
    expect(screen.getByRole('tab', { name: /Production/ })).toBeInTheDocument()

    await user.dblClick(screen.getByRole('tab', { name: /Production/ }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' EU{Enter}')
    expect(environment('Production EU')).toBeDefined()

    await user.click(within(list).getByRole('button', { name: 'Delete Production EU' }))
    expect(screen.queryByRole('tab', { name: /Production/ })).not.toBeInTheDocument()
    await user.click(within(list).getByRole('button', { name: 'Delete Local' }))
    expect(useWorkspaceStore.getState().activeEnvironmentId).toBeNull()
    await user.click(within(list).getByRole('button', { name: 'Delete Staging' }))
    expect(screen.getByText(/No environments yet/)).toBeInTheDocument()
    expect(useTabStore.getState().openIds).toEqual([])
  })

  it('switches environments from the title bar', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('combobox', { name: 'Environment' }))
    await user.click(await screen.findByRole('option', { name: 'No environment' }))
    expect(useWorkspaceStore.getState().activeEnvironmentId).toBeNull()
    await user.click(screen.getByRole('combobox', { name: 'Environment' }))
    await user.click(await screen.findByRole('option', { name: 'Staging' }))
    expect(useWorkspaceStore.getState().activeEnvironmentId).toBe('env_staging')
  })
})
