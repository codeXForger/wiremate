import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { goTo, renderApp } from '../../../test/render-app'
import { useDragStore } from './drag-store'
import { DRAG_MIME } from './tree-drag'

function dataTransfer(): DataTransfer {
  const data = new Map<string, string>()
  return {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
    effectAllowed: 'all',
    dropEffect: 'none'
  } as unknown as DataTransfer
}

function item(name: RegExp): HTMLElement {
  return screen.getByRole('treeitem', { name })
}

function drag(source: HTMLElement, target: HTMLElement): DataTransfer {
  const transfer = dataTransfer()
  fireEvent.dragStart(source, { dataTransfer: transfer })
  fireEvent.dragOver(target, { dataTransfer: transfer })
  return transfer
}

/** jsdom has no DragEvent, so fireEvent drops relatedTarget; a MouseEvent carries it. */
function leave(element: HTMLElement, relatedTarget: EventTarget): void {
  fireEvent(element, new MouseEvent('dragleave', { bubbles: true, relatedTarget }))
}

/** Row heights are 28px in the app; jsdom has no layout, so give the target one and point at the right spot. */
const OFFSETS = { before: 2, inside: 14, after: 26 }

function drop(source: HTMLElement, target: HTMLElement, position: keyof typeof OFFSETS): void {
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 200, 28))
  const transfer = dataTransfer()
  const clientY = 100 + OFFSETS[position]
  fireEvent.dragStart(source, { dataTransfer: transfer })
  // jsdom has no DragEvent and drops clientY from a plain Event; a MouseEvent carries it (dragover and drop
  // do not read dataTransfer).
  fireEvent(target, new MouseEvent('dragover', { bubbles: true, cancelable: true, clientY }))
  fireEvent(target, new MouseEvent('drop', { bubbles: true, cancelable: true, clientY }))
}

function names(): string[] {
  return screen.getAllByRole('treeitem').map((row) => row.textContent?.replace(/^(GET|HTTP)/, '').trim() ?? '')
}

function parentOf(name: string): string | null | undefined {
  return useWorkspaceStore.getState().nodes.find((node) => node.name === name)?.parentId
}

describe('drag and drop in the collections tree', () => {
  it('moves a request into another collection and highlights the target', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New collection' }))
    const target = item(/^New collection$/)
    const transfer = drag(item(/List users/), target)
    expect(transfer.getData(DRAG_MIME)).toBe(
      useWorkspaceStore.getState().nodes.find((n) => n.name === 'List users')?.id
    )
    expect(target.className).toContain('outline-primary')
    fireEvent.drop(target, { dataTransfer: transfer })
    expect(parentOf('List users')).toBe(useWorkspaceStore.getState().nodes.find((n) => n.name === 'New collection')?.id)
    expect(useDragStore.getState().draggingId).toBeNull()
  })

  it('moves a request out to the section root', async () => {
    await renderApp()
    const tree = screen.getByRole('tree', { name: 'API collections' })
    const transfer = drag(item(/List users/), tree)
    expect(tree.className).toContain('bg-primary/5')
    fireEvent.drop(tree, { dataTransfer: transfer })
    expect(parentOf('List users')).toBeNull()
  })

  it('moves a collection into another one', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New collection' }))
    const transfer = drag(item(/^New collection$/), item(/Public APIs/))
    fireEvent.drop(item(/Public APIs/), { dataTransfer: transfer })
    expect(parentOf('New collection')).toBe('f_api')
  })

  it('refuses to drop a collection into its own subfolder', async () => {
    const { user } = await renderApp()
    await goTo(user, 'Kafka')
    fireEvent.contextMenu(item(/^Orders$/))
    await user.click(await screen.findByRole('menuitem', { name: /New folder/ }))
    const child = item(/^New collection$/)
    const transfer = drag(item(/^Orders$/), child)
    expect(child.className).not.toContain('outline-primary')
    fireEvent.drop(child, { dataTransfer: transfer })
    expect(parentOf('Orders')).toBeNull()
    expect(parentOf('New collection')).toBe('f_orders')
    expect(useDragStore.getState().draggingId).toBeNull()
  })

  it('does nothing when dropping onto a request or its current parent', async () => {
    await renderApp()
    const transfer = drag(item(/List users/), item(/Public APIs/))
    fireEvent.drop(item(/Public APIs/), { dataTransfer: transfer })
    expect(parentOf('List users')).toBe('f_api')
    fireEvent.dragLeave(item(/Public APIs/))
    fireEvent.dragEnd(item(/List users/))
    expect(useDragStore.getState()).toMatchObject({ draggingId: null, overTarget: null })
  })

  it("places a request below another one, inside that one's collection", async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New HTTP request' }))
    const transfer = drag(item(/HTTP request/), item(/List users/))
    expect(item(/List users/).className).toContain('inset_0_-2px_0')
    fireEvent.drop(item(/List users/), { dataTransfer: transfer })
    expect(parentOf('HTTP request')).toBe('f_api')
    expect(names()).toEqual(['Public APIs', 'List users', 'HTTP request'])
  })

  it('reorders by the edge of the row the request is dropped on', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New HTTP request' }))
    drop(item(/HTTP request/), item(/List users/), 'after')
    drop(item(/HTTP request/), item(/List users/), 'before')
    expect(names()).toEqual(['Public APIs', 'HTTP request', 'List users'])
    drop(item(/HTTP request/), item(/Public APIs/), 'before')
    expect(names()).toEqual(['HTTP request', 'Public APIs', 'List users'])
    expect(parentOf('HTTP request')).toBeNull()
    drop(item(/HTTP request/), item(/Public APIs/), 'inside')
    expect(names()).toEqual(['Public APIs', 'List users', 'HTTP request'])
    expect(parentOf('HTTP request')).toBe('f_api')
  })

  it('keeps the order when a request is renamed', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New HTTP request' }))
    drop(item(/HTTP request/), item(/List users/), 'before')
    const id = useWorkspaceStore.getState().nodes.find((n) => n.name === 'HTTP request')!.id
    act(() => useWorkspaceStore.getState().renameNode(id, 'Zebra'))
    expect(names()).toEqual(['Public APIs', 'Zebra', 'List users'])
  })

  it('ignores drag events that did not start in the tree', async () => {
    await renderApp()
    fireEvent.dragOver(item(/Public APIs/))
    expect(useDragStore.getState().overTarget).toBeNull()
  })

  it('clears the highlight when the pointer leaves a target', async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New collection' }))
    const target = item(/^New collection$/)
    drag(item(/List users/), target)
    fireEvent.dragLeave(target)
    expect(useDragStore.getState().overTarget).toBeNull()
    const tree = screen.getByRole('tree', { name: 'API collections' })
    fireEvent.dragOver(tree)
    leave(target, tree)
    expect(useDragStore.getState().overTarget).toBe('__root__')
    leave(tree, document.body)
    expect(useDragStore.getState().overTarget).toBeNull()
  })
})
