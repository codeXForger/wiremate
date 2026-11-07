import { recordLocation } from '@shared/kafka/kafka-text'
import type { KafkaHeader, KafkaResetTarget } from '@shared/types/kafka'
import { confirmDelete } from '@/features/confirm/confirm-delete'
import { runAdmin, runAdminStep } from './admin-client'
import { adminView, useAdminStore, type AdminView } from './admin-store'

function patch(requestId: string, change: Partial<AdminView>): void {
  useAdminStore.getState().patch(requestId, change)
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export async function loadCluster(requestId: string): Promise<void> {
  const cluster = await runAdmin(requestId, { action: 'cluster' })
  if (cluster) patch(requestId, { cluster })
}

export async function loadTopics(requestId: string): Promise<void> {
  const topics = await runAdmin(requestId, { action: 'listTopics' })
  if (topics) patch(requestId, { topics })
}

export async function loadGroups(requestId: string): Promise<void> {
  const groups = await runAdmin(requestId, { action: 'listGroups' })
  if (groups) patch(requestId, { groups })
}

export async function openTopic(requestId: string, topic: string): Promise<void> {
  const details = await runAdmin(requestId, { action: 'describeTopic', topic })
  if (details) patch(requestId, { topic: details })
}

export async function openGroup(requestId: string, groupId: string): Promise<void> {
  const details = await runAdmin(requestId, { action: 'describeGroup', groupId })
  if (details) patch(requestId, { group: details })
}

export function closeTopic(requestId: string): void {
  patch(requestId, { topic: undefined })
}

export function closeGroup(requestId: string): void {
  patch(requestId, { group: undefined })
}

/** Reloads the lists and whatever topic or group is open. */
export async function refreshAll(requestId: string): Promise<void> {
  const { topic, group } = adminView(requestId)
  await Promise.all([
    loadCluster(requestId),
    loadTopics(requestId),
    loadGroups(requestId),
    topic && openTopic(requestId, topic.name),
    group && openGroup(requestId, group.id)
  ])
}

export interface NewTopic {
  topic: string
  partitions: number
  replicas: number
  configs: KafkaHeader[]
}

export async function createTopic(requestId: string, input: NewTopic): Promise<boolean> {
  const done = (): string => `Created topic ${input.topic} with ${plural(input.partitions, 'partition')}`
  await runAdminStep(requestId, { action: 'createTopic', ...input }, done)
  await loadTopics(requestId)
  return true
}

export function askToDeleteTopic(requestId: string, topic: string): void {
  confirmDelete({
    title: 'Delete topic?',
    message: `The topic "${topic}" and every record in it will be deleted from the cluster.`,
    onConfirm: () => void deleteTopic(requestId, topic)
  })
}

async function deleteTopic(requestId: string, topic: string): Promise<void> {
  const deleted = await runAdmin(requestId, { action: 'deleteTopic', topic }, () => `Deleted topic ${topic}`)
  if (deleted === undefined) return
  if (adminView(requestId).topic?.name === topic) closeTopic(requestId)
  await loadTopics(requestId)
}

export async function addPartitions(requestId: string, topic: string, count: number): Promise<boolean> {
  const done = (): string => `Topic ${topic} now has ${plural(count, 'partition')}`
  await runAdminStep(requestId, { action: 'addPartitions', topic, count }, done)
  await Promise.all([openTopic(requestId, topic), loadTopics(requestId)])
  return true
}

/** Sets one config of a topic; it then overrides the broker's default. Dialog actions throw what the cluster refused. */
export async function setTopicConfig(requestId: string, topic: string, { key, value }: KafkaHeader): Promise<boolean> {
  const done = (): string => `Set ${key} = ${value} on ${topic}`
  await runAdminStep(requestId, { action: 'alterTopicConfig', topic, name: key, value }, done)
  await openTopic(requestId, topic)
  return true
}

export async function resetTopicConfig(requestId: string, topic: string, name: string): Promise<void> {
  const done = (): string => `${name} on ${topic} is back to its default`
  const changed = await runAdmin(requestId, { action: 'alterTopicConfig', topic, name, value: null }, done)
  if (changed !== undefined) await openTopic(requestId, topic)
}

export interface RecordsCut {
  topic: string
  partition: number
  before: string
}

/** Deletes the records of a partition before an offset; the partition then starts there. */
export async function deleteRecords(requestId: string, cut: RecordsCut): Promise<boolean> {
  const where = recordLocation({ ...cut, offset: '' })
  const done = ({ lowWatermark }: { lowWatermark: string }): string => `${where} now starts at offset ${lowWatermark}`
  await runAdminStep(requestId, { action: 'deleteRecords', ...cut }, done)
  await openTopic(requestId, cut.topic)
  return true
}

export interface OffsetReset {
  groupId: string
  topic: string
  target: KafkaResetTarget
  value: string
}

export async function resetOffsets(requestId: string, reset: OffsetReset): Promise<boolean> {
  const done = (): string => `Moved ${reset.groupId} on ${reset.topic} to ${reset.target} ${reset.value}`.trim()
  await runAdminStep(requestId, { action: 'resetOffsets', ...reset }, done)
  await openGroup(requestId, reset.groupId)
  return true
}

export function askToDeleteGroup(requestId: string, groupId: string): void {
  confirmDelete({
    title: 'Delete consumer group?',
    message: `The group "${groupId}" and its committed offsets will be deleted. It must have no active members.`,
    onConfirm: () => void deleteGroup(requestId, groupId)
  })
}

async function deleteGroup(requestId: string, groupId: string): Promise<void> {
  const deleted = await runAdmin(requestId, { action: 'deleteGroup', groupId }, () => `Deleted group ${groupId}`)
  if (deleted === undefined) return
  closeGroup(requestId)
  await loadGroups(requestId)
}

export function askToDeleteGroupOffsets(requestId: string, groupId: string, topic: string): void {
  confirmDelete({
    title: 'Delete committed offsets?',
    message: `The offsets "${groupId}" committed on ${topic} will be deleted; it starts over from its reset policy.`,
    confirmLabel: 'Delete offsets',
    onConfirm: () => void deleteGroupOffsets(requestId, groupId, topic)
  })
}

async function deleteGroupOffsets(requestId: string, groupId: string, topic: string): Promise<void> {
  const done = (): string => `Deleted the offsets of ${groupId} on ${topic}`
  const deleted = await runAdmin(requestId, { action: 'deleteGroupOffsets', groupId, topic }, done)
  if (deleted !== undefined) await openGroup(requestId, groupId)
}
