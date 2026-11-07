import type { KafkaBroker, KafkaClusterInfo } from '@shared/types/kafka'
import { Hint } from '@/components/Hint'
import { Section } from './AdminParts'
import { AdminTable, type AdminColumn } from './AdminTable'

function brokerColumns(controllerId: number): AdminColumn<KafkaBroker>[] {
  return [
    { header: 'Broker', cell: (b) => (b.id === controllerId ? `${b.id} (controller)` : b.id), numeric: true },
    { header: 'Host', cell: (b) => <span className="font-mono">{`${b.host}:${b.port}`}</span> },
    { header: 'Rack', cell: (b) => b.rack ?? '—' }
  ]
}

/** The cluster's id and its brokers, the controller marked. */
export function ClusterView({ cluster }: { cluster: KafkaClusterInfo | undefined }) {
  if (!cluster) return <Hint>Loading the cluster… Refresh if the brokers were not reachable.</Hint>
  const table = { columns: brokerColumns(cluster.controllerId), rows: cluster.brokers }
  return (
    <div className="h-full overflow-auto">
      <Section title={`Cluster ${cluster.clusterId}`}>
        <AdminTable label="Brokers" {...table} rowKey={(b) => String(b.id)} empty="No brokers." />
      </Section>
    </div>
  )
}
