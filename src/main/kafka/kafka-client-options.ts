import type { BaseOptions } from '@platformatic/kafka'
import { splitList } from '@shared/kafka/kafka-text'
import type { KafkaConnection } from '@shared/types/protocol'

/** Gives up on a broker that does not answer within this time. */
const CONNECT_TIMEOUT_MS = 10_000

/** Turns how the user said to reach a cluster into what every client of the library takes. */
export class KafkaClientOptions {
  public static base(connection: KafkaConnection): BaseOptions {
    const bootstrapBrokers = splitList(connection.brokers)
    if (bootstrapBrokers.length === 0) throw new Error('Add at least one broker, e.g. localhost:9092')
    return {
      clientId: connection.clientId.trim() || 'wiremate',
      bootstrapBrokers,
      connectTimeout: CONNECT_TIMEOUT_MS,
      ...KafkaClientOptions.security(connection)
    }
  }

  private static security({ auth, username, password, ssl }: KafkaConnection): Partial<BaseOptions> {
    return {
      ...(ssl && { tls: {} }),
      ...(auth !== 'none' && { sasl: { mechanism: auth, username, password } })
    }
  }
}
