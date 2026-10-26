import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { services } from '@/services'
import { useMessageStore } from '@/stores/message-store'
import { useTabStore } from '@/stores/tab-store'
import { saveQueue } from '@/stores/workspace-persistence'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { answerDeleteDialog, createRequest, goTo, renderApp, type User } from '../../../test/render-app'

function activeConfig(): Record<string, unknown> {
  const id = useTabStore.getState().activeId!
  return useWorkspaceStore.getState().requests[id]!.config as unknown as Record<string, unknown>
}

async function choose(user: User, label: string, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function typeInto(user: User, label: string, text: string) {
  const field = screen.getByRole('textbox', { name: label })
  await user.clear(field)
  await user.type(field, text)
}

async function saveAs(user: User, name: string) {
  await user.click(screen.getByRole('button', { name: 'Save as message' }))
  const dialog = await screen.findByRole('dialog', { name: 'Save as message' })
  if (name) await user.type(within(dialog).getByLabelText('Name'), name)
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))
}

function savedNames() {
  return within(screen.getByRole('list', { name: 'Saved messages' }))
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'))
}

describe('saved messages', () => {
  it('saves payloads from a request and lists them in the Network section', async () => {
    const { user } = await renderApp()
    await createRequest(user, 'Network', 'TCP')
    expect(screen.getByText(/No saved messages yet/)).toBeInTheDocument()
    await typeInto(user, 'Payload', 'LOGIN admin')
    await choose(user, 'Line ending', /CRLF/)
    await saveAs(user, 'Login')
    expect(screen.getByText('Saved as "Login"')).toBeInTheDocument()
    expect(screen.getByText('Loaded "Login" · 1 of 1')).toBeInTheDocument()

    await choose(user, 'Encoding', /^hex$/)
    await typeInto(user, 'Payload', 'de ad be ef')
    await saveAs(user, '')
    expect(savedNames()).toEqual(['Login', 'Message 2'])
    const sidebar = screen.getByRole('list', { name: 'Saved messages' })
    expect(within(sidebar).getByText('13 B')).toBeInTheDocument()
    expect(within(sidebar).getByText('4 B')).toBeInTheDocument()
    expect(useMessageStore.getState().messages).toMatchObject([
      { name: 'Login', payload: 'LOGIN admin', encoding: 'text', lineEnding: 'crlf', position: 1 },
      { name: 'Message 2', payload: 'de ad be ef', encoding: 'hex', position: 2 }
    ])
  })

  it('loads a message into any TCP or UDP request, then the next one in order', async () => {
    const { user } = await renderApp()
    act(() => {
      const { create } = useMessageStore.getState()
      create({ name: 'Hello', payload: 'hello', encoding: 'text', lineEnding: 'lf' })
      create({ name: 'Binary', payload: '01 02', encoding: 'hex', lineEnding: 'none' })
      create({ name: 'Bye', payload: 'bye', encoding: 'text', lineEnding: 'none' })
    })
    await createRequest(user, 'Network', 'UDP')
    await user.click(screen.getByRole('button', { name: 'Load message' }))
    const dialog = await screen.findByRole('dialog', { name: 'Load a message' })
    expect(within(dialog).getByRole('textbox', { name: 'Message preview' })).toHaveValue('hello')
    await user.click(within(dialog).getByRole('button', { name: /^Binary/ }))
    expect(within(dialog).getByRole('textbox', { name: 'Message preview' })).toHaveValue('01 02')
    await user.click(within(dialog).getByRole('button', { name: 'Load' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(activeConfig()).toMatchObject({ payload: '01 02', encoding: 'hex', lineEnding: 'none' })
    expect(screen.getByRole('textbox', { name: 'Payload' })).toHaveValue('01 02')
    expect(screen.getByText('Loaded "Binary" · 2 of 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load next message' }))
    expect(activeConfig()).toMatchObject({ payload: 'bye', encoding: 'text' })
    expect(screen.getByRole('button', { name: 'Load next message' })).toBeDisabled()

    await createRequest(user, 'Network', 'TCP')
    expect(screen.queryByText(/^Loaded/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load message' }))
    const search = await screen.findByRole('textbox', { name: 'Search messages' })
    await user.type(search, 'hell')
    const choices = within(screen.getByRole('dialog')).getByRole('list', { name: 'Saved messages' })
    expect(within(choices).getAllByRole('listitem')).toHaveLength(1)
    await user.dblClick(screen.getByRole('button', { name: /^Hello/ }))
    expect(activeConfig()).toMatchObject({ payload: 'hello', lineEnding: 'lf' })
  })

  it('says when nothing matches', async () => {
    const { user } = await renderApp()
    await createRequest(user, 'Network', 'TCP')
    await user.click(screen.getByRole('button', { name: 'Load message' }))
    expect(await screen.findByText(/No saved messages match/)).toBeInTheDocument()
  })

  it('writes, edits, orders and deletes messages in their own tab', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Network')
    await user.click(screen.getByRole('button', { name: 'New message' }))
    await user.click(screen.getByRole('button', { name: 'New message' }))
    const editor = screen.getByRole('region', { name: 'Message 2 message' })
    expect(within(editor).getByText('2 of 2')).toBeInTheDocument()
    await typeInto(user, 'Message payload', 'ab cd')
    await choose(user, 'Encoding', /^hex$/)
    expect(within(editor).getByText('2 B')).toBeInTheDocument()
    await typeInto(user, 'Message payload', 'abc')
    expect(within(editor).getByText('invalid hex')).toBeInTheDocument()

    expect(within(editor).getByRole('button', { name: 'Move down' })).toBeDisabled()
    await user.click(within(editor).getByRole('button', { name: 'Move up' }))
    expect(savedNames()).toEqual(['Message 2', 'Message 1'])
    expect(within(editor).getByText('1 of 2')).toBeInTheDocument()
    await user.click(within(editor).getByRole('button', { name: 'Move down' }))
    expect(savedNames()).toEqual(['Message 1', 'Message 2'])

    await user.dblClick(screen.getByRole('tab', { name: /Message 2/ }))
    await user.keyboard('{Control>}a{/Control}Handshake{Enter}')
    expect(savedNames()).toEqual(['Message 1', 'Handshake'])

    await user.click(within(editor).getByRole('button', { name: 'Delete message' }))
    expect(await answerDeleteDialog(user)).toContain('The saved message "Handshake" will be deleted.')
    expect(savedNames()).toEqual(['Message 1'])
    expect(screen.queryByRole('tab', { name: /Handshake/ })).not.toBeInTheDocument()
  })

  it('keeps messages in the workspace', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Network')
    await user.click(screen.getByRole('button', { name: 'New message' }))
    await typeInto(user, 'Message payload', 'kept')
    await act(() => saveQueue.flush())
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId!
    expect(await services.messages.listMessages(workspaceId)).toMatchObject([{ name: 'Message 1', payload: 'kept' }])

    await user.click(screen.getByRole('button', { name: 'Delete Message 1' }))
    await answerDeleteDialog(user)
    await act(() => saveQueue.flush())
    expect(await services.messages.listMessages(workspaceId)).toEqual([])
  })
})
