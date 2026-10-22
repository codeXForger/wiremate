import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

  it("drops onto a request into that request's collection", async () => {
    const { user } = await renderApp()
    await user.click(screen.getByRole('button', { name: 'New HTTP request' }))
    const transfer = drag(item(/HTTP request/), item(/List users/))
    expect(item(/Public APIs/).className).toContain('outline-primary')
    fireEvent.drop(item(/List users/), { dataTransfer: transfer })
    expect(parentOf('HTTP request')).toBe('f_api')
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
