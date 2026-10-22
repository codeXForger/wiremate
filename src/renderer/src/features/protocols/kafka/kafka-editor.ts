import { createStreamEditor } from '../stream-form/create-stream-editor'

export const KafkaEditor = createStreamEditor<'kafka'>({
  target: { key: 'brokers', label: 'Brokers', placeholder: 'host:9092,host:9093' },
  fields: [
    { key: 'topic', label: 'Topic' },
    { key: 'groupId', label: 'Consumer group' },
    { key: 'key', label: 'Message key' }
  ],
  message: { key: 'value', label: 'Record' }
})
