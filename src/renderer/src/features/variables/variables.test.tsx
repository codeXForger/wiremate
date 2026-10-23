import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { editor as MonacoEditor } from 'monaco-editor'
import { useSessionVariables } from '@/stores/session-variables'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, openRequest, renderApp, type User } from '../../../test/render-app'
import { variableDecorations } from './use-editor-variables'
import { PopoverTimers } from './use-variable-popover'

function urlInput() {
  return screen.getByRole<HTMLInputElement>('textbox', { name: 'Request URL' })
}

function placeholder(name: string) {
  return urlInput().parentElement!.querySelector<HTMLElement>(`[data-variable="${name}"]`)!
}

function localValue(name: string) {
  return useWorkspaceStore
    .getState()
    .environments.find((env) => env.name === 'Local')
    ?.variables.find((row) => row.key === name)?.value
}

async function setUrl(user: User, url: string) {
  await openRequest(user, 'API', /List users/)
  await user.clear(urlInput())
  await user.paste(url)
}

/** Puts the caret at `offset` and clicks, as a real click would. */
function clickAt(input: HTMLInputElement, offset: number) {
  input.setSelectionRange(offset, offset)
  fireEvent.click(input)
}

describe('variables in fields', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('colours defined and missing variables in the URL', async () => {
    const { user } = await renderApp()
    await setUrl(user, '{{baseUrl}}/users/{{userId}}')
    expect(placeholder('baseUrl')).toHaveClass('wm-variable-defined')
    expect(placeholder('userId')).toHaveClass('wm-variable-missing')
    expect(urlInput()).toHaveClass('text-transparent')
    await user.clear(urlInput())
    await user.paste('https://plain.test')
    expect(urlInput()).not.toHaveClass('text-transparent')
  })

  it('sets a missing variable from the popover', async () => {
    const { user } = await renderApp()
    await setUrl(user, '{{baseUrl}}/users/{{userId}}')
    clickAt(urlInput(), 22)
    const popover = await screen.findByRole('dialog', { name: 'Variable userId' })
    expect(popover).toHaveTextContent('Not set in Local')
    const value = within(popover).getByRole('textbox', { name: 'Value of userId' })
    expect(value).toHaveValue('')
    await user.type(value, '42{Enter}')
    expect(localValue('userId')).toBe('42')
    expect(screen.queryByRole('dialog', { name: 'Variable userId' })).not.toBeInTheDocument()
    expect(placeholder('userId')).toHaveClass('wm-variable-defined')
  })

  it('shows and edits a value on hover, and stays open while editing', async () => {
    const { user } = await renderApp()
    await setUrl(user, '{{baseUrl}}/users')
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 80, 20))
    fireEvent.mouseMove(urlInput(), { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(urlInput(), { clientX: 12, clientY: 10 })
    const popover = await screen.findByRole('dialog', { name: 'Variable baseUrl' })
    expect(popover).toHaveTextContent('Value in Local')
    const value = within(popover).getByRole('textbox', { name: 'Value of baseUrl' })
    expect(value).toHaveValue('http://localhost:3000')
    await user.clear(value)
    await user.type(value, 'http://api.test')
    fireEvent.mouseLeave(popover)
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(screen.getByRole('dialog', { name: 'Variable baseUrl' })).toBeInTheDocument()
    fireEvent.blur(value)
    expect(localValue('baseUrl')).toBe('http://api.test')

    fireEvent.mouseMove(urlInput(), { clientX: 500, clientY: 500 })
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(screen.queryByRole('dialog', { name: 'Variable baseUrl' })).not.toBeInTheDocument()
  })

  it('closes on Escape without saving, and ignores clicks outside placeholders', async () => {
    const { user } = await renderApp()
    await setUrl(user, 'x/{{baseUrl}}')
    clickAt(urlInput(), 0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    clickAt(urlInput(), 5)
    const value = await screen.findByRole('textbox', { name: 'Value of baseUrl' })
    await user.type(value, '/changed{Escape}')
    expect(localValue('baseUrl')).toBe('http://localhost:3000')
  })

  it('writes to the session when no environment is active', async () => {
    const { user } = await renderApp()
    useWorkspaceStore.getState().setActiveEnvironment(null)
    await setUrl(user, '{{token}}')
    clickAt(urlInput(), 3)
    const popover = await screen.findByRole('dialog', { name: 'Variable token' })
    expect(popover).toHaveTextContent('Not set in this session')
    await user.type(within(popover).getByRole('textbox'), 'abc{Enter}')
    expect(useSessionVariables.getState().variables).toEqual({ token: 'abc' })
  })

  it('colours headers and auth fields but not the environment editor', async () => {
    const { user } = await renderApp()
    await openRequest(user, 'API', /List users/)
    await user.click(screen.getByRole('tab', { name: 'Headers 1' }))
    const value = screen.getByDisplayValue('application/json')
    await user.clear(value)
    await user.paste('Bearer {{token}}')
    expect(value.parentElement!.querySelector('[data-variable="token"]')).toHaveClass('wm-variable-missing')

    await goTo(user, 'Env')
    const add = screen.getByRole('button', { name: 'Add variable' })
    await user.click(add)
    const cell = within(add.parentElement!).getAllByRole('textbox', { name: 'Value' }).at(-1)!
    await user.type(cell, '{{{{nested}}')
    expect(cell.parentElement!.querySelector('[data-variable]')).toBeNull()
  })
})

describe('variable helpers', () => {
  it('decorates placeholders in an editor model', () => {
    const text = 'a {{x}} {{y}}'
    const model = {
      getValue: () => text,
      getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 })
    } as unknown as MonacoEditor.ITextModel
    expect(variableDecorations(model, { x: '1' })).toEqual([
      {
        range: { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 8 },
        options: { inlineClassName: 'wm-variable-defined' }
      },
      {
        range: { startLineNumber: 1, startColumn: 9, endLineNumber: 1, endColumn: 14 },
        options: { inlineClassName: 'wm-variable-missing' }
      }
    ])
  })

  it('opens after a pause on hover and closes on close', () => {
    vi.useFakeTimers()
    const setTarget = vi.fn()
    const timers = new PopoverTimers(setTarget)
    const target = { name: 'x', anchor: () => new DOMRect() }
    timers.show(target, 100)
    expect(setTarget).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(setTarget).toHaveBeenCalledWith(target)
    timers.setEditing(true)
    timers.close()
    timers.hideSoon()
    vi.advanceTimersByTime(500)
    expect(setTarget).toHaveBeenLastCalledWith(null)
    vi.useRealTimers()
  })
})
