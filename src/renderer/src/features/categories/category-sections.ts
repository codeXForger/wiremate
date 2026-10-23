import type { ComponentType } from 'react'
import type { CategoryId } from '@shared/protocols/categories'
import { SuitesSection } from '../suites/SuitesSection'

/** Extra sections a category pane shows below its collections. Test suites only run HTTP, so they live in API. */
export const CATEGORY_SECTIONS: Partial<Record<CategoryId, ComponentType>> = {
  api: SuitesSection
}
