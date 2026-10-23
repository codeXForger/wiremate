import { isSuiteId } from '@shared/suites/suite-factory'
import { isEnvironmentId } from '../environments/environment-actions'

export type TabKind = 'request' | 'suite' | 'environment'

/** What an open tab shows, told apart by the id's prefix (req_, suite_, env_). */
export function tabKind(id: string): TabKind {
  if (isSuiteId(id)) return 'suite'
  return isEnvironmentId(id) ? 'environment' : 'request'
}
