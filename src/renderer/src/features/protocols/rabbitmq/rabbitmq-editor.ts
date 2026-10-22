import { createStreamEditor } from '../stream-form/create-stream-editor'

export const RabbitMqEditor = createStreamEditor<'rabbitmq'>({
  target: { key: 'url', label: 'AMQP URL', placeholder: 'amqp://user:pass@host:5672' },
  fields: [
    { key: 'exchange', label: 'Exchange' },
    { key: 'routingKey', label: 'Routing key' },
    { key: 'queue', label: 'Consume queue' }
  ],
  message: { key: 'message', label: 'Message' }
})
