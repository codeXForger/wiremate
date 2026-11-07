import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '@shared/protocols/defaults'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { installKafkaCluster, type FakeKafkaCluster } from '../../../../test/kafka-cluster'
import { answerDeleteDialog, createRequest, openRequest, renderApp, type User } from '../../../../test/render-app'
import { installBridge } from '../../../../test/wiremate-stub'

function activeConfig(): Record<string, unknown> {
  const id = useTabStore.getState().activeId!
  return useWorkspaceStore.getState().requests[id]!.config as unknown as Record<string, unknown>
}

function events() {
  return within(screen.getByRole('list', { name: 'Session events' }))
}

async function choose(user: User, label: string, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function fill(user: User, label: string, value: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (value !== '') await user.type(input, value)
}

async function startCluster() {
  installBridge()
  const cluster = installKafkaCluster()
  const { user } = await renderApp()
  return { user, cluster }
}

/** A record produced by someone else, e.g. another app. */
async function produceElsewhere(cluster: FakeKafkaCluster, topic: string, value: string) {
  await act(() => cluster.produceKafka('elsewhere', { topic, key: '', value, headers: [] }))
}

async function openAdmin(user: User) {
  await createRequest(user, 'Kafka', 'Kafka')
  await choose(user, 'Mode', /^Admin$/)
}

describe('Kafka producer', () => {
  it('connects, then sends a record with a key and headers to a partition', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders', 2)
    await openRequest(user, 'Kafka', /Orders topic/)
    expect(screen.getByText('Connect the producer to send')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(await events().findByText(/Connected to localhost:9092/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled()

    await fill(user, 'Topic', 'orders')
    await fill(user, 'Partition', '1')
    await fill(user, 'Key', 'order-7')
    await fill(user, 'Value', 'paid')
    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    await user.click(screen.getByRole('button', { name: 'Add header' }))
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'source')
    await user.type(screen.getByRole('textbox', { name: 'Value' }), 'web')
    expect(screen.getByRole('tab', { name: 'Headers (1)' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Record' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(events().getByText('paid')).toBeInTheDocument()
    expect(events().getByText('orders[1]@0')).toBeInTheDocument()
    expect(events().getByLabelText('Record details')).toHaveTextContent('key order-7 · source: web')
    expect(cluster.topics.get('orders')!.partitions[1]!.records).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(cluster.openSessions()).toEqual([])
  })

  it('says why a record cannot be sent', async () => {
    const { user } = await startCluster()
    await openRequest(user, 'Kafka', /Orders topic/)
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await fill(user, 'Topic', '')
    await user.click(await screen.findByRole('button', { name: 'Send' }))
    expect(events().getByText('Add the topic to send to')).toBeInTheDocument()
  })

  it('reports brokers it cannot reach', async () => {
    const { user } = await startCluster()
    await openRequest(user, 'Kafka', /Orders topic/)
    await fill(user, 'Brokers', 'down:9092')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(await events().findByText('Cannot reach down:9092')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('sets acks, compression and SASL credentials', async () => {
    const { user } = await startCluster()
    await openRequest(user, 'Kafka', /Orders topic/)
    await user.click(screen.getByRole('tab', { name: 'Options' }))
    await choose(user, 'Acks', /Leader only/)
    await choose(user, 'Compression', /^gzip$/)
    await user.click(screen.getByRole('switch', { name: 'Idempotent' }))
    await user.click(screen.getByRole('tab', { name: 'Connection' }))
    await choose(user, 'Authentication', /SCRAM-SHA-256/)
    await fill(user, 'Username', 'app')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('switch', { name: 'TLS' }))
    expect(activeConfig()).toMatchObject({
      acks: 'leader',
      compression: 'gzip',
      idempotent: true,
      auth: 'SCRAM-SHA-256',
      username: 'app',
      ssl: true
    })
  })

  it('asks before closing a tab whose producer is connected', async () => {
    const { user, cluster } = await startCluster()
    await openRequest(user, 'Kafka', /Orders topic/)
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.click(screen.getByRole('button', { name: /Close Orders topic/ }))
    const text = await answerDeleteDialog(user, 'Disconnect and close')
    expect(text).toContain('The producer "Orders topic" is connected to localhost:9092.')
    expect(cluster.openSessions()).toEqual([])
  })
})

describe('Kafka consumer', () => {
  it('reads from the beginning in its group, commits, and stops after a number of records', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await produceElsewhere(cluster, 'orders', 'first')
    await createRequest(user, 'Kafka', 'Kafka')
    await choose(user, 'Mode', /^Consumer$/)
    await fill(user, 'Topics', 'orders')
    await fill(user, 'Consumer group', 'billing')
    await choose(user, 'Start from', /Earliest/)
    await user.click(screen.getByRole('button', { name: 'Start consuming' }))

    expect(events().getByText(/Joined the group; assigned orders\[0\]/)).toBeInTheDocument()
    expect(events().getByText('first')).toBeInTheDocument()
    await produceElsewhere(cluster, 'orders', 'second')
    expect(events().getByText('second')).toBeInTheDocument()
    expect(cluster.groups.get('billing')!.offsets.get('orders:0')).toBe(2)

    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(cluster.openSessions()).toEqual([])
  })

  it('starts from a time, with options for commits and limits', async () => {
    const { user } = await startCluster()
    await createRequest(user, 'Kafka', 'Kafka')
    await choose(user, 'Mode', /^Consumer$/)
    await choose(user, 'Start from', /A date and time/)
    await fill(user, 'Start time', '2026-10-26T09:30')
    await fill(user, 'Stop after (records)', '5')
    await user.click(screen.getByRole('switch', { name: 'Commit offsets as records arrive' }))
    await user.click(screen.getByRole('switch', { name: 'Read committed transactions only' }))
    expect(activeConfig()).toMatchObject({
      startFrom: 'timestamp',
      startTimestamp: '2026-10-26T09:30',
      maxMessages: 5,
      autoCommit: false,
      readCommitted: true
    })
  })
})

describe('Kafka admin', () => {
  it('lists topics, hides internal ones, and creates a topic with configs', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders', 3)
    cluster.createTopic('__consumer_offsets')
    await openAdmin(user)
    const topics = await screen.findByRole('table', { name: 'Topics' })
    expect(within(topics).getByText('orders')).toBeInTheDocument()
    expect(within(topics).queryByText('__consumer_offsets')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Internal topics' }))
    expect(screen.getByText('__consumer_offsets')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Filter topics' }), 'nothing')
    expect(screen.getByText('No topic matches.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New topic' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Create topic' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Give the topic a name')
    await user.type(within(dialog).getByLabelText('Name'), 'payments')
    await user.clear(within(dialog).getByLabelText('Partitions'))
    await user.type(within(dialog).getByLabelText('Partitions'), '4')
    await user.click(within(dialog).getByRole('button', { name: 'Add config' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Key' }), 'retention.ms')
    await user.type(within(dialog).getByRole('textbox', { name: 'Value' }), '1000')
    await user.click(within(dialog).getByRole('button', { name: 'Create topic' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cluster.topics.get('payments')!.partitions).toHaveLength(4)
    expect(cluster.topics.get('payments')!.configs.get('retention.ms')).toBe('1000')
    expect(events().getByText('Created topic payments with 4 partitions')).toBeInTheDocument()
  })

  it('shows the error of a create the cluster refuses', async () => {
    const { user } = await startCluster()
    await openAdmin(user)
    await user.click(await screen.findByRole('button', { name: 'New topic' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'orders')
    await user.clear(within(dialog).getByLabelText('Replication factor'))
    await user.type(within(dialog).getByLabelText('Replication factor'), '3')
    await user.click(within(dialog).getByRole('button', { name: 'Create topic' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/larger than available brokers/)
    await user.keyboard('{Escape}')
    expect(events().getByText(/larger than available brokers/)).toBeInTheDocument()
  })

  it('opens a topic: grows its partitions, edits its configs, deletes records, then the topic', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await produceElsewhere(cluster, 'orders', 'a')
    await produceElsewhere(cluster, 'orders', 'b')
    await openAdmin(user)
    await user.click(await screen.findByText('orders'))
    expect(await screen.findByText('Partitions (1) · 2 records')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add partitions' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add partitions' }))
    expect(await screen.findByText('Partitions (2) · 2 records')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit retention.ms' }))
    const edit = screen.getByRole('dialog')
    await user.clear(within(edit).getByLabelText('Value'))
    await user.type(within(edit).getByLabelText('Value'), '5000')
    await user.click(within(edit).getByRole('button', { name: 'Save' }))
    expect(cluster.topics.get('orders')!.configs.get('retention.ms')).toBe('5000')
    expect(await screen.findByText('Topic')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset retention.ms' }))
    expect(cluster.topics.get('orders')!.configs.has('retention.ms')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Delete records of partition 0' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete records' }))
    expect(events().getByText('orders[0] now starts at offset 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete topic' }))
    await answerDeleteDialog(user)
    expect(await screen.findByText('The cluster has no topics yet.')).toBeInTheDocument()
    expect(cluster.topics.has('orders')).toBe(false)
  })

  it('sets a new config and goes back to the list', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await openAdmin(user)
    await user.click(await screen.findByText('orders'))
    await user.click(await screen.findByRole('button', { name: 'Set config' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Name the config')
    await user.type(within(dialog).getByLabelText('Name'), 'max.message.bytes')
    await user.type(within(dialog).getByLabelText('Value'), '2048')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(cluster.topics.get('orders')!.configs.get('max.message.bytes')).toBe('2048')
    await user.click(screen.getByRole('button', { name: 'All topics' }))
    expect(screen.getByRole('table', { name: 'Topics' })).toBeInTheDocument()
  })

  it('shows a consumer group: its lag, a reset of its offsets, and their deletion', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await produceElsewhere(cluster, 'orders', 'a')
    await produceElsewhere(cluster, 'orders', 'b')
    cluster.groups.set('billing', { members: new Set(), offsets: new Map([['orders:0', 2]]) })
    await openAdmin(user)
    await user.click(screen.getByRole('tab', { name: 'Consumer groups' }))
    await user.click(await screen.findByText('billing'))
    const topics = await screen.findByRole('table', { name: 'Topics' })
    expect(within(topics).getAllByRole('row')[1]).toHaveTextContent('orders10')

    await user.click(screen.getByRole('button', { name: 'Reset offsets on orders' }))
    await choose(user, 'Move to', /An exact offset/)
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('An exact offset'), 'x')
    await user.click(within(dialog).getByRole('button', { name: 'Reset offsets' }))
    expect(within(dialog).getByRole('alert')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('An exact offset'))
    await user.type(within(dialog).getByLabelText('An exact offset'), '0')
    await user.click(within(dialog).getByRole('button', { name: 'Reset offsets' }))
    expect(cluster.groups.get('billing')!.offsets.get('orders:0')).toBe(0)
    const reset = await screen.findByRole('table', { name: 'Topics' })
    expect(within(reset).getAllByRole('row')[1]).toHaveTextContent('orders12')

    await user.click(screen.getByRole('button', { name: 'Delete offsets on orders' }))
    await answerDeleteDialog(user, 'Delete offsets')
    expect(await screen.findAllByText('Nothing committed yet.')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Delete group' }))
    await answerDeleteDialog(user)
    expect(cluster.groups.has('billing')).toBe(false)
    expect(await screen.findByText('No consumer group has joined yet.')).toBeInTheDocument()
  })

  it('resets a group to the earliest offset or a time', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await produceElsewhere(cluster, 'orders', 'a')
    cluster.groups.set('billing', { members: new Set(), offsets: new Map([['orders:0', 1]]) })
    await openAdmin(user)
    await user.click(screen.getByRole('tab', { name: 'Consumer groups' }))
    await user.click(await screen.findByText('billing'))
    await user.click(await screen.findByRole('button', { name: 'Reset offsets on orders' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset offsets' }))
    expect(cluster.groups.get('billing')!.offsets.get('orders:0')).toBe(0)
    await user.click(await screen.findByRole('button', { name: 'Reset offsets on orders' }))
    await choose(user, 'Move to', /A date and time/)
    await user.type(screen.getByLabelText('A date and time'), '2999-01-01T00:00:00Z')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset offsets' }))
    expect(cluster.groups.get('billing')!.offsets.get('orders:0')).toBe(1)
  })

  it('shows a live group with its members', async () => {
    const { user, cluster } = await startCluster()
    cluster.createTopic('orders')
    await act(() =>
      cluster.openKafka('member', {
        ...PROTOCOL_DEFAULTS.kafka(),
        mode: 'consumer',
        topic: 'orders',
        groupId: 'billing'
      })
    )
    await openAdmin(user)
    await user.click(screen.getByRole('tab', { name: 'Consumer groups' }))
    expect(await screen.findByText('Stable')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Filter groups' }), 'bill')
    await user.click(screen.getByText('billing'))
    const members = await screen.findByRole('table', { name: 'Members' })
    expect(within(members).getByText('orders[0]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All groups' }))
    expect(screen.getByRole('table', { name: 'Groups' })).toBeInTheDocument()
  })

  it('shows the brokers of the cluster and refreshes', async () => {
    const { user, cluster } = await startCluster()
    await openAdmin(user)
    await user.click(screen.getByRole('tab', { name: 'Cluster' }))
    expect(await screen.findByText('Cluster fake-cluster')).toBeInTheDocument()
    expect(screen.getByText('1 (controller)')).toBeInTheDocument()
    cluster.createTopic('later')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await user.click(screen.getByRole('tab', { name: 'Topics' }))
    expect(await screen.findByText('later')).toBeInTheDocument()
  })

  it('logs why the cluster could not be reached', async () => {
    const { user } = await startCluster()
    await createRequest(user, 'Kafka', 'Kafka')
    await fill(user, 'Brokers', 'down:9092')
    await choose(user, 'Mode', /^Admin$/)
    expect(await screen.findByText('Admin activity')).toBeInTheDocument()
    expect(events().getAllByText('Cannot reach down:9092').length).toBeGreaterThan(0)
    expect(screen.getByText(/Loading the topics of the cluster/)).toBeInTheDocument()
  })
})
