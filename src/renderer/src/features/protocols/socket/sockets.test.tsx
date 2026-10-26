import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResponseStore } from '@/stores/response-store'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { answerDeleteDialog, createRequest, renderApp, type User } from '../../../../test/render-app'
import { installSocketNetwork } from '../../../../test/socket-network'
import { installBridge } from '../../../../test/wiremate-stub'

function activeId(): string {
  return useTabStore.getState().activeId!
}

function activeConfig(): Record<string, unknown> {
  return useWorkspaceStore.getState().requests[activeId()]!.config as unknown as Record<string, unknown>
}

function events() {
  return within(screen.getByRole('list', { name: 'Session events' }))
}

async function choose(user: User, label: string, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function setNumber(user: User, label: string, value: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  await user.type(input, value)
}

async function typePayload(user: User, text: string) {
  const payload = screen.getByRole('textbox', { name: 'Payload' })
  await user.clear(payload)
  await user.type(payload, text)
}

async function showTab(user: User, index: number) {
  await user.click(screen.getAllByRole('tab', { name: /(TCP|UDP) connection/ })[index]!)
}

async function saveConnection(user: User) {
  await user.click(screen.getByRole('button', { name: 'Save connection' }))
}

async function startNetwork() {
  installBridge()
  const network = installSocketNetwork()
  const { user } = await renderApp()
  return { user, network }
}

describe('TCP', () => {
  it('runs a server and a client side by side, and they talk in real time', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await choose(user, 'Mode', /^Server$/)
    expect(activeConfig()).toMatchObject({ mode: 'server' })
    await setNumber(user, 'Listen port', '7000')
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    expect(events().getByText('Listening on 127.0.0.1:7000')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled()

    await createRequest(user, 'Network', 'TCP')
    await setNumber(user, 'Server port', '7000')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(events().getByText(/^Connected to 127.0.0.1:7000 from 127.0.0.1:50000$/)).toBeInTheDocument()
    await typePayload(user, 'hello server')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(events().getByText('hello server')).toBeInTheDocument()

    await showTab(user, 0)
    expect(events().getByText('hello server')).toBeInTheDocument()
    expect(events().getByText('127.0.0.1:50000 connected')).toBeInTheDocument()
    expect(screen.getByText('1 peer')).toBeInTheDocument()
    await choose(user, 'Send to', /127.0.0.1:50000/)
    await typePayload(user, 'hello client')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await showTab(user, 1)
    const received = events().getByText('hello client').closest('li')!
    expect(within(received).getByLabelText('Received')).toBeInTheDocument()
    expect(within(received).getByText('127.0.0.1:7000')).toBeInTheDocument()

    await showTab(user, 0)
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    await showTab(user, 1)
    expect(events().getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('reports a refused connection', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    const error = events().getByText('connect ECONNREFUSED 127.0.0.1:9000').closest('li')!
    expect(within(error).getByLabelText('Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByText('Open the socket to send')).toBeInTheDocument()
  })

  it('fills variables into the address and the payload', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await choose(user, 'Mode', /^Server$/)
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await createRequest(user, 'Network', 'TCP')
    const host = screen.getByRole('textbox', { name: 'Server host' })
    await user.clear(host)
    await user.type(host, '{{{{host}}')
    expect(activeConfig()).toMatchObject({ host: '{{host}}' })
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(events().getByText(/^Connected to \{\{host\}\}:9000/)).toBeInTheDocument()
    await typePayload(user, 'id={{{{missing}}')
    await choose(user, 'Line ending', /CRLF/)
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(new TextDecoder().decode(network.sent.at(-1)!.bytes)).toBe('id={{missing}}\r\n')
  })

  it('edits the socket options of a client and a server', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await user.click(screen.getByRole('tab', { name: 'Options' }))
    await setNumber(user, 'Connect timeout (ms)', '2500')
    await setNumber(user, 'Idle timeout (ms)', '30000')
    await setNumber(user, 'Receive buffer (bytes)', '1024')
    await setNumber(user, 'Keep-alive delay (ms)', '5000')
    await user.click(screen.getByRole('switch', { name: 'No delay (TCP_NODELAY)' }))
    await user.click(screen.getByRole('switch', { name: 'Keep-alive (SO_KEEPALIVE)' }))
    expect(activeConfig()['options']).toMatchObject({
      connectTimeoutMs: 2500,
      idleTimeoutMs: 30000,
      bufferSize: 1024,
      keepAliveDelayMs: 5000,
      noDelay: false,
      keepAlive: true
    })
    await setNumber(user, 'Idle timeout (ms)', 'abc')
    expect(screen.getByLabelText('Idle timeout (ms)')).toHaveValue('')
    await choose(user, 'Mode', /^Server$/)
    await setNumber(user, 'Max connections', '3')
    expect(activeConfig()['options']).toMatchObject({ maxConnections: 3, idleTimeoutMs: 0 })
    expect(screen.queryByLabelText('Connect timeout (ms)')).not.toBeInTheDocument()
  })
})

describe('UDP', () => {
  it('listens, sends to a destination and replies to whoever wrote', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await setNumber(user, 'Local port', '7001')
    await setNumber(user, 'Destination port', '7002')
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    expect(events().getByText('Listening on 0.0.0.0:7001')).toBeInTheDocument()

    await createRequest(user, 'Network', 'UDP')
    await setNumber(user, 'Local port', '7002')
    await setNumber(user, 'Destination port', '7001')
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await showTab(user, 0)
    await typePayload(user, 'ping')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(events().getByText('127.0.0.1:7002')).toBeInTheDocument()

    await showTab(user, 1)
    expect(events().getByText('ping')).toBeInTheDocument()
    await choose(user, 'Send to', /127.0.0.1:7001/)
    await choose(user, 'Encoding', /^hex$/)
    await typePayload(user, '70 6f 6e 67')
    expect(screen.queryByRole('combobox', { name: 'Line ending' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await showTab(user, 0)
    expect(events().getByText('pong')).toBeInTheDocument()
    await choose(user, 'Show data as', /^hex$/)
    expect(events().getByText('70 6f 6e 67')).toBeInTheDocument()
  })

  it('reports a malformed hex payload without sending it', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await choose(user, 'Encoding', /^hex$/)
    await typePayload(user, 'xyz')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(events().getByText('Hex payload needs pairs of 0-9 and a-f')).toBeInTheDocument()
    expect(network.sent).toHaveLength(0)
  })

  it('aims a broadcast at the broadcast address', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await choose(user, 'Mode', /^Broadcast$/)
    expect(activeConfig()).toMatchObject({ mode: 'broadcast', host: '255.255.255.255' })
    expect(screen.getByText('Sends to every host on the network segment')).toBeInTheDocument()
    await choose(user, 'Mode', /^Unicast$/)
    await choose(user, 'Mode', /^Broadcast$/)
    expect(activeConfig()).toMatchObject({ host: '255.255.255.255' })
  })

  it('joins a multicast group whose members all receive what is sent to it', async () => {
    const { user } = await startNetwork()
    for (const _ of [1, 2]) {
      await createRequest(user, 'Network', 'UDP')
      await choose(user, 'Mode', /^Multicast$/)
      const group = screen.getByRole('textbox', { name: 'Group address' })
      await user.clear(group)
      await user.type(group, '239.1.2.3')
      await setNumber(user, 'Group port', '5353')
      await user.click(screen.getByRole('button', { name: 'Listen' }))
    }
    expect(events().getByText('Listening on 0.0.0.0:5353, joined 239.1.2.3')).toBeInTheDocument()
    expect(screen.queryByLabelText('Destination host')).not.toBeInTheDocument()
    await typePayload(user, 'to the group')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(events().getAllByText('to the group')).toHaveLength(2)
    await showTab(user, 0)
    expect(events().getByText('to the group')).toBeInTheDocument()
  })

  it('edits the socket options', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await user.click(screen.getByRole('tab', { name: 'Options' }))
    await setNumber(user, 'TTL', '8')
    await setNumber(user, 'Receive buffer (SO_RCVBUF)', '4096')
    await setNumber(user, 'Send buffer (SO_SNDBUF)', '2048')
    await user.click(screen.getByRole('switch', { name: 'IPv6 (udp6)' }))
    await user.click(screen.getByRole('switch', { name: 'Reuse address' }))
    expect(screen.queryByLabelText('Multicast interface')).not.toBeInTheDocument()
    await choose(user, 'Mode', /^Multicast$/)
    await user.type(screen.getByLabelText('Multicast interface'), '192.168.1.5')
    await user.click(screen.getByRole('switch', { name: 'Multicast loopback' }))
    expect(activeConfig()['options']).toMatchObject({
      ttl: 8,
      recvBufferSize: 4096,
      sendBufferSize: 2048,
      ipv6: true,
      reuseAddr: false,
      multicastInterface: '192.168.1.5',
      multicastLoopback: false
    })
  })
})

describe('socket sessions', () => {
  it('can be cancelled while connecting', async () => {
    const bridge = installBridge()
    const { user } = await renderApp()
    await createRequest(user, 'Network', 'TCP')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(bridge.closeSocket).toHaveBeenCalledWith(expect.stringMatching(/^sock_/))
  })

  it('closes the socket of a deleted request', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await saveConnection(user)
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    expect(network.openSessions()).toHaveLength(1)
    act(() => useWorkspaceStore.getState().removeNode(activeId()))
    expect(network.openSessions()).toHaveLength(0)
  })

  it('needs the desktop bridge', async () => {
    const { user } = await renderApp()
    window.wiremate = undefined
    await createRequest(user, 'Network', 'TCP')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(events().getByText(/Sockets need the desktop app/)).toBeInTheDocument()
    act(() => useResponseStore.getState().clear(activeId()))
    expect(screen.getByText(/Connect to start a session/)).toBeInTheDocument()
  })

  it('asks before closing the tab of a connected client, and disconnects it', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await choose(user, 'Mode', /^Server$/)
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await createRequest(user, 'Network', 'TCP')
    await saveConnection(user)
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    const clientTab = screen.getAllByRole('tab', { name: /TCP connection/ })[1]!
    const closeClient = () => user.click(within(clientTab).getByRole('button', { name: /^Close/ }))

    await closeClient()
    expect(await answerDeleteDialog(user, 'Cancel')).toBe(
      'Close the connection?"TCP connection 2" is connected to 127.0.0.1:9000. Closing the tab disconnects it.CancelDisconnect and close'
    )
    expect(screen.getAllByRole('tab', { name: /TCP connection/ })).toHaveLength(2)
    expect(network.openSessions()).toHaveLength(2)

    await closeClient()
    await answerDeleteDialog(user, 'Disconnect and close')
    expect(screen.getAllByRole('tab', { name: /TCP connection/ })).toHaveLength(1)
    expect(network.openSessions()).toHaveLength(1)
    expect(events().getByText('127.0.0.1:50000 disconnected')).toBeInTheDocument()
    expect(screen.getByText('0 peers')).toBeInTheDocument()
  })

  it('asks before closing a running server or UDP socket with the keyboard', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await saveConnection(user)
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await user.keyboard('{Meta>}w{/Meta}')
    expect(await answerDeleteDialog(user, 'Cancel')).toContain('"UDP connection" is listening for UDP datagrams.')
    await createRequest(user, 'Network', 'TCP')
    await saveConnection(user)
    await choose(user, 'Mode', /^Server$/)
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await user.keyboard('{Meta>}w{/Meta}')
    expect(await answerDeleteDialog(user, 'Disconnect and close')).toContain(
      'The server "TCP connection" is running with 0 connected clients.'
    )
    expect(network.openSessions()).toHaveLength(1)
    expect(screen.queryByRole('tab', { name: /TCP connection/ })).not.toBeInTheDocument()
  })

  it('closes a tab at once when its socket is closed', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    await saveConnection(user)
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.click(screen.getByRole('button', { name: /^Close TCP connection/ }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /TCP connection/ })).not.toBeInTheDocument()
  })
})

describe('new connections', () => {
  function listed() {
    return within(screen.getByRole('tree', { name: 'Network connections' }))
  }

  it('open as unsaved drafts and join the list once saved', async () => {
    const { user } = await startNetwork()
    await createRequest(user, 'Network', 'TCP')
    expect(screen.getByText('New connection, not saved yet')).toBeInTheDocument()
    expect(listed().queryByRole('treeitem', { name: /TCP connection/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(events().getByText(/ECONNREFUSED/)).toBeInTheDocument()

    const name = screen.getByRole('textbox', { name: 'connection name' })
    await user.clear(name)
    await user.type(name, 'Device console{Enter}')
    expect(listed().getByRole('treeitem', { name: /Device console/ })).toBeInTheDocument()
    expect(screen.queryByText('New connection, not saved yet')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Device console/ })).toBeInTheDocument()

    await user.click(screen.getByRole('treeitem', { name: /Echo server/ }))
    await user.click(listed().getByRole('treeitem', { name: /Device console/ }))
    expect(screen.getByRole('textbox', { name: 'Server host' })).toHaveValue('127.0.0.1')
  })

  it('asks before discarding an unsaved one, and saves with Cmd+S', async () => {
    const { user, network } = await startNetwork()
    await createRequest(user, 'Network', 'UDP')
    await user.click(screen.getByRole('button', { name: 'Listen' }))
    await user.keyboard('{Meta>}w{/Meta}')
    expect(await answerDeleteDialog(user, 'Cancel')).toBe(
      'Discard this connection?"UDP connection" was never saved. Its connection closes too. Save it from the bar above its details to keep it.CancelDiscard'
    )
    await user.keyboard('{Meta>}w{/Meta}')
    await answerDeleteDialog(user, 'Discard')
    expect(screen.queryByRole('tab', { name: /UDP connection/ })).not.toBeInTheDocument()
    expect(useWorkspaceStore.getState().drafts).toEqual({})
    expect(network.openSessions()).toHaveLength(0)

    await createRequest(user, 'Network', 'UDP')
    await user.keyboard('{Meta>}s{/Meta}')
    expect(listed().getByRole('treeitem', { name: /UDP connection/ })).toBeInTheDocument()
  })
})
