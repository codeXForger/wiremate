import { afterEach, describe, expect, it, vi } from 'vitest'
import { SaveQueue } from './save-queue'
import { diffById } from './workspace-persistence'

describe('SaveQueue', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs only the last write per key, after the delay', async () => {
    vi.useFakeTimers()
    const queue = new SaveQueue(vi.fn(), 100)
    const first = vi.fn(() => Promise.resolve())
    const second = vi.fn(() => Promise.resolve())
    queue.schedule('a', first)
    queue.schedule('a', second)
    expect(queue.isPending('a')).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(queue.isPending('a')).toBe(false)
  })

  it('flushes now, drops on clear and reports failures', async () => {
    const onError = vi.fn()
    const queue = new SaveQueue(onError, 10_000)
    const write = vi.fn(() => Promise.resolve())
    queue.schedule('a', write)
    queue.schedule('b', () => Promise.reject(new Error('disk full')))
    await queue.flush()
    expect(write).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(new Error('disk full'))
    const dropped = vi.fn(() => Promise.resolve())
    queue.schedule('c', dropped)
    queue.clear()
    await queue.flush()
    expect(dropped).not.toHaveBeenCalled()
  })
})

describe('diffById', () => {
  it('finds changed and removed items by identity', () => {
    const same = { v: 1 }
    expect(diffById({ a: same, b: { v: 2 }, c: { v: 3 } }, { a: same, b: { v: 2 }, d: { v: 4 } })).toEqual({
      changed: [{ v: 2 }, { v: 4 }],
      removed: ['c']
    })
  })
})
