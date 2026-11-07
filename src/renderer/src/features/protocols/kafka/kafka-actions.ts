import { useMemo } from 'react'
import { parsePartition } from '@shared/kafka/kafka-text'
import { errorMessage } from '@shared/scripting/describe'
import type { KafkaOutgoing } from '@shared/types/kafka'
import type { KafkaConfig, RequestDocument } from '@shared/types/protocol'
import type { Variables } from '@shared/types/scripting'
import { interpolate, interpolateFields } from '@shared/utils/interpolate'
import { KafkaService } from '@/services/kafka-service'
import { streamSessionStore } from '@/stores/response-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { activeVariables } from '../../environments/active-variables'

/** The producers and consumers of every Kafka request; their sessions show in the response store. */
export const kafkaSessions = new KafkaService({ bridge: () => window.wiremate, store: streamSessionStore })

export function kafkaRequest(requestId: string): RequestDocument<'kafka'> | undefined {
  const request = useWorkspaceStore.getState().requests[requestId]
  return request?.protocol === 'kafka' ? request : undefined
}

/** The config with `{{variables}}` filled in: its text fields and its headers. */
export function resolveConfig(config: KafkaConfig, variables: Variables): KafkaConfig {
  const headers = config.headers.map((row) => ({
    ...row,
    key: interpolate(row.key, variables),
    value: interpolate(row.value, variables)
  }))
  return { ...interpolateFields(config, variables), headers }
}

/** The record a producer sends: enabled headers with a name, and a partition only when one is typed. */
export function outgoingRecord(config: KafkaConfig): KafkaOutgoing {
  const topic = config.topic.trim()
  if (topic === '') throw new Error('Add the topic to send to')
  const headers = config.headers
    .filter((row) => row.enabled && row.key.trim() !== '')
    .map(({ key, value }) => ({ key, value }))
  const partition = parsePartition(config.partition)
  return { topic, key: config.key, value: config.value, headers, ...(partition !== undefined && { partition }) }
}

function openSession(requestId: string): void {
  const request = kafkaRequest(requestId)
  if (!request || request.config.mode === 'admin') return
  const config = resolveConfig(request.config, activeVariables())
  void kafkaSessions.open(requestId, { ...config, mode: request.config.mode })
}

function produce(requestId: string): void {
  const request = kafkaRequest(requestId)
  if (!request) return
  try {
    void kafkaSessions.send(requestId, outgoingRecord(resolveConfig(request.config, activeVariables())))
  } catch (error) {
    kafkaSessions.report(requestId, errorMessage(error))
  }
}

export interface KafkaActions {
  open: () => void
  close: () => void
  produce: () => void
}

export function useKafkaActions(requestId: string): KafkaActions {
  return useMemo(
    () => ({
      open: () => openSession(requestId),
      close: () => void kafkaSessions.close(requestId),
      produce: () => produce(requestId)
    }),
    [requestId]
  )
}
