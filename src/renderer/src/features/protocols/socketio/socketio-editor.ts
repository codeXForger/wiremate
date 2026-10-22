import { createStreamEditor } from '../stream-form/create-stream-editor'

export const SocketIoEditor = createStreamEditor<'socketio'>({
  target: { key: 'url', label: 'Server URL', placeholder: 'http://localhost:3000' },
  fields: [
    { key: 'path', label: 'Path' },
    { key: 'event', label: 'Event name' }
  ],
  message: { key: 'message', label: 'Event' }
})
