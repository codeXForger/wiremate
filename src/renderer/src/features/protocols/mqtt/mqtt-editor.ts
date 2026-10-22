import { createStreamEditor } from '../stream-form/create-stream-editor'
import { MqttOptions } from './MqttOptions'

export const MqttEditor = createStreamEditor<'mqtt'>({
  target: { key: 'brokerUrl', label: 'Broker URL', placeholder: 'mqtt://host:1883' },
  fields: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'topic', label: 'Topic', placeholder: 'sensors/+/temperature' }
  ],
  message: { key: 'payload', label: 'Payload' },
  extras: MqttOptions
})
