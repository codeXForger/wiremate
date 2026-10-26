import { isSuiteId } from '@shared/suites/suite-factory'
import { isEnvironmentId } from '../environments/environment-actions'
import { historyCategoryOf } from '../history/history-entry'

export type TabKind = 'request' | 'suite' | 'environment' | 'history'

/** What an open tab shows, told apart by the id's prefix (req_, suite_, env_, history_). */
export function tabKind(id: string): TabKind {
  if (isSuiteId(id)) return 'suite'
  if (historyCategoryOf(id) !== null) return 'history'
  return isEnvironmentId(id) ? 'environment' : 'request'
}
