import { Admin } from '@platformatic/kafka'
import type {
  KafkaAdminAction,
  KafkaAdminOutcome,
  KafkaAdminRequest,
  KafkaAdminResult,
  KafkaClusterInfo
} from '@shared/types/kafka'
import type { KafkaConnection } from '@shared/types/protocol'
import { KafkaClientOptions } from '../kafka-client-options'
import { describeKafkaError } from '../kafka-errors'
import { GroupAdmin } from './group-admin'
import { TopicAdmin } from './topic-admin'

type Handler<A extends KafkaAdminAction> = (admin: Admin, request: KafkaAdminRequest<A>) => Promise<KafkaAdminResult<A>>

async function describeCluster(admin: Admin): Promise<KafkaClusterInfo> {
  const metadata = await admin.metadata({ topics: [] })
  const brokers = [...metadata.brokers].map(([id, { host, port, rack }]) => ({ id, host, port, rack: rack ?? null }))
  return { clusterId: metadata.id, controllerId: metadata.controllerId, brokers: brokers.sort((a, b) => a.id - b.id) }
}

const HANDLERS: { [A in KafkaAdminAction]: Handler<A> } = {
  cluster: describeCluster,
  listTopics: (admin) => TopicAdmin.listTopics(admin),
  describeTopic: (admin, request) => TopicAdmin.describeTopic(admin, request),
  createTopic: (admin, request) => TopicAdmin.createTopic(admin, request),
  deleteTopic: (admin, request) => TopicAdmin.deleteTopic(admin, request),
  addPartitions: (admin, request) => TopicAdmin.addPartitions(admin, request),
  alterTopicConfig: (admin, request) => TopicAdmin.alterTopicConfig(admin, request),
  deleteRecords: (admin, request) => TopicAdmin.deleteRecords(admin, request),
  listGroups: (admin) => GroupAdmin.listGroups(admin),
  describeGroup: (admin, request) => GroupAdmin.describeGroup(admin, request),
  deleteGroup: (admin, request) => GroupAdmin.deleteGroup(admin, request),
  resetOffsets: (admin, request) => GroupAdmin.resetOffsets(admin, request),
  deleteGroupOffsets: (admin, request) => GroupAdmin.deleteGroupOffsets(admin, request)
}

/** One short retry, so a cluster that is down is reported at once rather than after a long backoff. */
const ADMIN_RETRIES = { retries: 1, retryDelay: 250 }

/** Runs one admin request on a fresh client, closed afterwards; failures come back as text, never as a throw. */
export class KafkaAdminService {
  public async run<A extends KafkaAdminAction>(
    connection: KafkaConnection,
    request: KafkaAdminRequest<A>
  ): Promise<KafkaAdminOutcome<A>> {
    let admin: Admin | undefined
    try {
      admin = new Admin({ ...KafkaClientOptions.base(connection), ...ADMIN_RETRIES })
      const handler = HANDLERS[request.action] as Handler<A>
      return { ok: true, value: await handler(admin, request) }
    } catch (error) {
      return { ok: false, error: describeKafkaError(error) }
    } finally {
      await admin?.close().catch(() => undefined)
    }
  }
}
