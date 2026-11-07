import { describe, expect, it } from 'vitest'
import { wholeNumber } from './form-values'
import { lagByTopic } from './group-lag'

describe('admin values', () => {
  it('reads whole numbers with a minimum', () => {
    expect(wholeNumber(' 3 ', 'Partitions', 1)).toBe(3)
    expect(wholeNumber('0', 'Offset')).toBe(0)
    expect(() => wholeNumber('0', 'Partitions', 1)).toThrow('Partitions must be a whole number of at least 1')
    expect(() => wholeNumber('1.5', 'Partitions')).toThrow()
    expect(() => wholeNumber('', 'Partitions')).toThrow()
  })

  it('sums the lag of a group per topic', () => {
    const offset = (topic: string, partition: number, lag: string) => ({
      topic,
      partition,
      committed: '0',
      latest: lag,
      lag
    })
    expect(lagByTopic([offset('a', 0, '2'), offset('a', 1, '3'), offset('b', 0, '0')])).toEqual([
      { topic: 'a', partitions: 2, lag: 5n },
      { topic: 'b', partitions: 1, lag: 0n }
    ])
  })
})
