import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { createRequest, openRequest, renderApp } from '../../../test/render-app'

type User = Awaited<ReturnType<typeof renderApp>>['user']

function activeConfig(): Record<string, unknown> {
  const id = useTabStore.getState().activeId!
  return useWorkspaceStore.getState().requests[id]!.config as unknown as Record<string, unknown>
}

async function choose(user: User, label: string, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('HTTP editor', () => {
  it('edits method, url, params and headers, and sends', async () => {
    const { user } = await renderApp()
    await openRequest(user, /List users/)
    await choose(user, 'Method', /^POST$/)
    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), '?page=1')
    expect(activeConfig()).toMatchObject({ method: 'POST', url: 'https://httpbin.org/get?page=1' })
    expect(screen.getByLabelText('Unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add param' }))
    await user.type(screen.getByRole('textbox', { name: 'Key' }), 'limit')
    await user.type(screen.getByRole('textbox', { name: 'Value' }), '10')
    await user.click(screen.getByRole('checkbox', { name: 'Enable limit' }))
    expect(activeConfig()['params']).toMatchObject([{ key: 'limit', value: '10', enabled: false }])
    await user.click(screen.getByRole('button', { name: 'Remove limit' }))
    expect(activeConfig()['params']).toEqual([])

    await user.click(screen.getByRole('tab', { name: 'Headers 1' }))
    expect(screen.getByDisplayValue('Accept')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('200 OK')).toBeInTheDocument()
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Response body' }).value).toContain(
      '"simulated": true'
    )
    await user.click(screen.getByRole('tab', { name: 'Headers 2' }))
    expect(screen.getByText('x-wiremate')).toBeInTheDocument()
  })

  it('edits the body and auth', async () => {
    const { user } = await renderApp()
    await openRequest(user, /List users/)
    await user.click(screen.getByRole('tab', { name: 'Body' }))
    expect(screen.getByText('This request has no body.')).toBeInTheDocument()
    await choose(user, 'Body type', /^json$/)
    await user.type(screen.getByRole('textbox', { name: 'Request body' }), '1')
    expect(activeConfig()['body']).toEqual({ mode: 'json', content: '1' })

    await user.click(screen.getByRole('tab', { name: 'Auth' }))
    await choose(user, 'Auth type', /^bearer$/)
    await user.type(screen.getByLabelText('Token'), 'abc')
    await choose(user, 'Auth type', /^basic$/)
    await user.type(screen.getByLabelText('Username'), 'me')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(activeConfig()['auth']).toMatchObject({ type: 'basic', token: 'abc', username: 'me' })
  })
})

describe('GraphQL editor', () => {
  it('edits query and variables and sends', async () => {
    const { user } = await renderApp()
    await openRequest(user, /Countries/)
    await user.clear(screen.getByRole('textbox', { name: 'Variables' }))
    await user.type(screen.getByRole('textbox', { name: 'Variables' }), '1')
    await user.type(screen.getByRole('textbox', { name: 'Query' }), '#')
    expect(activeConfig()).toMatchObject({ variables: '1' })
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('200 OK')).toBeInTheDocument()
  })
})

describe('streaming editors', () => {
  it('runs a WebSocket session', async () => {
    const { user } = await renderApp()
    await openRequest(user, /Echo socket/)
    expect(screen.getByText(/Connect to start a session/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send message/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'ping')
    await user.click(screen.getByRole('button', { name: /Send message/ }))
    const events = screen.getByRole('list', { name: 'Session events' })
    expect(within(events).getAllByText('ping')).toHaveLength(2)
    expect(within(events).getByLabelText('Sent')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(screen.getByText('Disconnected', { selector: 'li span' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('list', { name: 'Session events' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    expect(screen.getByRole('button', { name: 'Add header' })).toBeInTheDocument()
  })

  it.each([
    [/^Socket\.IO/, 'Event name', 'chat'],
    [/^RabbitMQ/, 'Routing key', 'orders.created'],
    [/^Kafka/, 'Topic', 'orders']
  ])('binds spec fields for %s', async (protocol, field, value) => {
    const { user } = await renderApp()
    await createRequest(user, protocol)
    const input = screen.getByLabelText(field)
    await user.clear(input)
    await user.type(input, value)
    expect(Object.values(activeConfig())).toContain(value)
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByText('Connected', { exact: true })).toBeInTheDocument()
  })

  it.each([/^TCP/, /^UDP/])('edits host, port and payload for %s', async (protocol) => {
    const { user } = await renderApp()
    await createRequest(user, protocol)
    const host = screen.getByRole('textbox', { name: 'Host' })
    await user.clear(host)
    await user.type(host, 'example.com')
    const port = screen.getByLabelText('Port')
    await user.clear(port)
    expect(port).toHaveValue('')
    await user.type(port, '7')
    expect(activeConfig()).toMatchObject({ host: 'example.com', port: 7 })
    await choose(user, 'Encoding', /^hex$/)
    await user.type(screen.getByRole('textbox', { name: 'Payload' }), 'ff')
    expect(activeConfig()).toMatchObject({ encoding: 'hex', payload: 'ff' })
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByText('Connected to example.com:7 (simulated)')).toBeInTheDocument()
  })

  it('switches MCP transport and mode', async () => {
    const { user } = await renderApp()
    await openRequest(user, /Everything server/)
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Server command' }).value).toContain(
      'server-everything'
    )
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByRole('region', { name: 'Tools' })).toHaveTextContent('echo')
    await choose(user, 'Transport', /^http$/)
    await user.type(screen.getByRole('textbox', { name: 'Server URL' }), 'http://localhost:8080/mcp')
    expect(activeConfig()).toMatchObject({ transport: 'http', url: 'http://localhost:8080/mcp' })
    await choose(user, 'Mode', /Host a mock server/)
    expect(screen.getByText('Mock server mode')).toBeInTheDocument()
  })
})
