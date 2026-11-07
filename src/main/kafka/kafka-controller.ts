import { ipcMain } from 'electron'
import { AppEvent, IpcChannel } from '@shared/ipc'
import type { KafkaAdminRequest, KafkaOutgoing, KafkaSessionSpec } from '@shared/types/kafka'
import type { KafkaConnection } from '@shared/types/protocol'
import { pushTo, SenderWatch } from '../sessions/sender-watch'
import type { KafkaAdminService } from './admin/kafka-admin-service'
import type { KafkaManager } from './kafka-manager'

/** Exposes Kafka producers, consumers and admin calls to the renderer; session events go back to their window. */
export class KafkaController {
  private readonly senders: SenderWatch

  public constructor(
    private readonly sessions: KafkaManager,
    private readonly admin: KafkaAdminService
  ) {
    this.senders = new SenderWatch(() => sessions.closeAll())
  }

  public register(): void {
    ipcMain.handle(IpcChannel.openKafka, (event, sessionId: string, spec: KafkaSessionSpec) => {
      this.senders.watch(event.sender)
      this.sessions.open(sessionId, spec, pushTo(event.sender, AppEvent.kafkaEvent))
    })
    ipcMain.handle(IpcChannel.produceKafka, (_event, sessionId: string, message: KafkaOutgoing) =>
      this.sessions.produce(sessionId, message)
    )
    ipcMain.handle(IpcChannel.closeKafka, (_event, sessionId: string) => this.sessions.close(sessionId))
    ipcMain.handle(IpcChannel.kafkaAdmin, (_event, connection: KafkaConnection, request: KafkaAdminRequest) =>
      this.admin.run(connection, request)
    )
  }
}
