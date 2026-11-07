import type { DeleteConfirmation } from '@/stores/ui-store'
import { kafkaRequest, kafkaSessions } from './kafka-actions'

/** What is open, in words: where a producer sends, or what a consumer reads. */
function describeClient(
  name: string,
  { mode, topic, groupId, brokers }: { mode: string; topic: string; groupId: string; brokers: string }
): string {
  if (mode === 'consumer') return `The consumer "${name}" is reading ${topic} in the group ${groupId}.`
  return `The producer "${name}" is connected to ${brokers}.`
}

/** The confirmation to show before closing a request whose producer or consumer is connected, or null. */
export function kafkaCloseConfirmation(requestId: string, then: () => void): DeleteConfirmation | null {
  const request = kafkaRequest(requestId)
  if (!request || !kafkaSessions.isOpen(requestId)) return null
  return {
    title: 'Disconnect from Kafka?',
    message: describeClient(request.name, request.config),
    note: 'Closing the tab disconnects it.',
    confirmLabel: 'Disconnect and close',
    onConfirm: () => {
      void kafkaSessions.close(requestId)
      then()
    }
  }
}
