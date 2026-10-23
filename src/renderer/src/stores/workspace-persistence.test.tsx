import { act, cleanup, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { services } from '@/services'
import { useConsoleStore } from '@/stores/console-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, openRequest, renderApp } from '../../test/render-app'
import { saveQueue } from './workspace-persistence'

const stored = () => services.workspaces.openWorkspace('ws_demo')

describe('workspace persistence', () => {
  it('saves every kind of change and loads it all back after a restart', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), '?page=2')
    await user.click(screen.getByRole('tab', { name: /^Scripts/ }))
    await user.click(screen.getByRole('tab', { name: 'Post-response' }))
    await user.click(screen.getByRole('textbox', { name: 'Post-response script' }))
    await user.paste("wm.test('ok', () => {})")
    const store = useWorkspaceStore.getState()
    const folderId = store.addFolder(null, 'mqtt')
    store.renameNode(folderId, 'Factory')
    store.updateEnvironment('env_local', { name: 'Laptop' })
    store.setActiveEnvironment('env_staging')
    await goTo(user, 'Settings')
    await user.click(screen.getByRole('switch', { name: 'Dark theme' }))
    expect(screen.getByLabelText('Unsaved changes')).toBeInTheDocument()
    await act(() => saveQueue.flush())
    expect(screen.queryByLabelText('Unsaved changes')).not.toBeInTheDocument()

    const content = await stored()
    expect(content.settings).toEqual({ theme: 'light', activeEnvironmentId: 'env_staging' })
    expect(content.nodes.find((node) => node.id === folderId)).toMatchObject({ name: 'Factory', category: 'mqtt' })
    expect(content.environments.find((env) => env.id === 'env_local')?.name).toBe('Laptop')
    expect(Object.values(content.requests).find((r) => r.name === 'List users')?.config).toMatchObject({
      url: 'https://httpbin.org/get?page=2',
      scripts: { pre: '', post: "wm.test('ok', () => {})" }
    })

    cleanup()
    const restarted = await renderApp({ keepStorage: true })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(screen.getByRole('combobox', { name: 'Environment' })).toHaveTextContent('Staging')
    await openRequest(restarted.user, 'API', /List users/)
    expect(screen.getByRole('textbox', { name: 'Request URL' })).toHaveValue('https://httpbin.org/get?page=2')
    await goTo(restarted.user, 'MQTT')
    expect(screen.getByRole('treeitem', { name: /Factory/ })).toBeInTheDocument()
  })

  it('deletes the files of removed requests and environments', async () => {
    await renderApp()
    const store = useWorkspaceStore.getState()
    store.removeNode('f_api')
    useWorkspaceStore.setState({ environments: store.environments.filter((env) => env.id !== 'env_staging') })
    await saveQueue.flush()
    const content = await stored()
    expect(content.requests['r_f_api_0']).toBeUndefined()
    expect(content.nodes.some((node) => node.id === 'f_api')).toBe(false)
    expect(content.environments.map((env) => env.id)).toEqual(['env_local'])
  })

  it('does not write anything when a workspace is merely opened', async () => {
    await renderApp()
    const save = vi.spyOn(services.workspaces, 'saveTree')
    await useWorkspaceStore.getState().openWorkspace('ws_demo')
    await saveQueue.flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('reports a failed save in the console', async () => {
    await renderApp()
    vi.spyOn(services.workspaces, 'saveTree').mockRejectedValue(new Error('read-only folder'))
    useWorkspaceStore.getState().addFolder(null, 'api')
    await saveQueue.flush()
    expect(useConsoleStore.getState().entries.at(-1)).toMatchObject({
      level: 'error',
      message: 'Could not save the workspace: read-only folder'
    })
  })

  it('opens the most recently used workspace and starts new ones empty', async () => {
    await renderApp()
    await useWorkspaceStore.getState().createWorkspace({ name: 'Fresh', path: '/work/fresh' })
    cleanup()
    // The fresh workspace has no "List users" for renderApp to wait for.
    await renderApp({ keepStorage: true }).catch(() => undefined)
    expect(await screen.findByRole('button', { name: 'Switch workspace' })).toHaveTextContent('Fresh')
    expect(
      within(screen.getByRole('tree', { name: 'API collections' })).getByText(/No collections yet/)
    ).toBeInTheDocument()
  })
})
