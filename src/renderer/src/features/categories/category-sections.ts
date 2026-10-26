import type { ComponentType } from 'react'
import type { CategoryId } from '@shared/protocols/categories'
import { HistorySection } from '../history/HistorySection'
import { MessagesSection } from '../messages/MessagesSection'
import { SuitesSection } from '../suites/SuitesSection'

export type CategorySection = ComponentType<{ category: CategoryId }>

/**
 * Extra parts a category pane shows below its collections. API keeps the history of the requests it sent, and its
 * test suites (suites only run HTTP). Network keeps the messages its TCP and UDP requests load and send.
 */
export const CATEGORY_SECTIONS: Partial<Record<CategoryId, CategorySection[]>> = {
  api: [HistorySection, SuitesSection],
  network: [MessagesSection]
}
