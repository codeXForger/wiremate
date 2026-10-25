import { copyFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

let app: ElectronApplication
let page: Page
let server: Server
let base = ''

/** Stands in for the home folder, so the default workspace and app data never touch the real ones. */
const home = mkdtempSync(join(tmpdir(), 'wiremate-e2e-'))
const defaultWorkspace = join(home, 'WireMate', 'Default')

/** A local echo server, so the tests do not depend on the network. */
async function startServer(): Promise<void> {
  server = createServer((req, res) => {
    if (req.url === '/slow') return void setTimeout(() => res.end('late'), 10_000)
    res.writeHead(200, { 'content-type': 'application/json', 'x-e2e': 'yes' })
    res.end(JSON.stringify({ method: req.method, url: req.url, token: 'abc123' }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

async function launch(): Promise<void> {
  app = await electron.launch({ args: ['.'], env: { ...process.env, WIREMATE_HOME: home } })
  page = await app.firstWindow()
  await page.setViewportSize({ width: 1440, height: 900 })
}

const section = (name: string) => page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name })
const screenshot = async (name: string) => {
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: `test-results/${name}.png` })
}

test.beforeAll(async () => {
  await startServer()
  await launch()
})

test.afterAll(async () => {
  await app.close()
  server.close()
})

test('starts in an empty Default workspace in the home folder', async () => {
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText(/Default/)
  await expect(page.getByText(/No collections yet/)).toBeVisible()
  await expect(page.getByText(defaultWorkspace)).toBeVisible()
  expect(existsSync(join(defaultWorkspace, 'wiremate.json'))).toBe(true)
  await screenshot('empty')
})

test('creates an HTTP request, runs its scripts and sends it', async () => {
  await page.getByRole('button', { name: 'New HTTP request' }).click()
  await expect(page.getByRole('tab', { name: /HTTP request/ })).toBeVisible()
  await page.getByRole('textbox', { name: 'Request URL' }).fill(`${base}/echo`)
  await page.getByRole('tab', { name: 'Scripts' }).click()
  await page.getByRole('tab', { name: 'Post-response' }).click()
  await page.locator('.monaco-editor').first().click()
  await page.keyboard.insertText(
    "wm.test('status is 200', () => wm.expect(wm.response.status).toBe(200))\n" +
      "wm.env.set('token', wm.response.json().token)\nconsole.log('token saved')"
  )
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('200 OK')).toBeVisible()
  await page.getByRole('tab', { name: 'Tests 1/1' }).click()
  await expect(page.getByRole('listitem', { name: 'Passed: status is 200' })).toBeVisible()

  await page.getByRole('button', { name: 'Console' }).click()
  const consolePanel = page.getByRole('region', { name: 'Console' })
  await expect(consolePanel.getByRole('listitem', { name: `request: GET ${base}/echo` })).toBeVisible()
  await expect(consolePanel.getByRole('listitem', { name: 'post-response: token saved' })).toBeVisible()
  const logLine = consolePanel.getByRole('listitem', { name: 'post-response: token saved' })
  await logLine.getByText('token saved').click({ clickCount: 3 })
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain('token saved')
  await logLine.hover()
  await logLine.getByRole('button', { name: 'Copy entry' }).click()
  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toMatch(/post-response HTTP request token saved$/)
  await screenshot('http')
  await consolePanel.getByRole('button', { name: 'Close console' }).click()
})

test('cancels a request that is still on its way', async () => {
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.fill(`${base}/slow`)
  await page.getByRole('button', { name: 'Send' }).click()
  const pending = page.getByRole('status', { name: 'Sending request' })
  await expect(pending).toContainText('Sending request…')
  await screenshot('sending')
  await pending.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled()
  await url.fill(`${base}/echo`)
})

test('saves edits on its own, and right away with Cmd/Ctrl+S', async () => {
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.click()
  await url.press('End')
  await url.pressSequentially('?page=2')
  await expect(url).toHaveValue(`${base}/echo?page=2`)
  await page.getByRole('tab', { name: 'Params 1' }).click()
  await expect(page.getByRole('textbox', { name: 'Key' })).toHaveValue('page')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByLabel('Unsaved changes')).toBeHidden()
})

test('drags a request into a new collection and renames it', async () => {
  await section('API').click()
  await page.getByRole('button', { name: 'New collection' }).click()
  await page
    .getByRole('treeitem', { name: /HTTP request/ })
    .dragTo(page.getByRole('treeitem', { name: 'New collection' }))
  const rows = page.getByRole('tree', { name: 'API collections' }).getByRole('treeitem')
  await expect(rows.nth(0)).toHaveText('New collection')
  await expect(rows.nth(1)).toHaveText(/HTTP request/)

  await page.getByRole('treeitem', { name: /HTTP request/ }).dblclick()
  const input = page.getByRole('textbox', { name: 'Name' })
  await expect(input).toBeFocused()
  await input.fill('Echo')
  await input.press('Enter')
  await expect(page.getByRole('treeitem', { name: /Echo/ })).toBeVisible()
})

test('renames from a tab and cuts long names with an ellipsis', async () => {
  const longName = 'Echo every request back including headers, the body and query parameters'
  const tabs = page.getByRole('tablist', { name: 'Open requests' })
  await tabs.getByRole('tab', { name: /Echo/ }).dblclick()
  await tabs.getByRole('textbox', { name: 'Name' }).fill(longName)
  await tabs.getByRole('textbox', { name: 'Name' }).press('Enter')
  const title = tabs.getByTitle(longName)
  await expect(title).toHaveCSS('text-overflow', 'ellipsis')
  expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  await tabs.getByRole('tab', { name: /Echo/ }).dblclick()
  await tabs.getByRole('textbox', { name: 'Name' }).fill('Echo')
  await tabs.getByRole('textbox', { name: 'Name' }).press('Enter')
})

test('orders requests inside a collection by dragging, and keeps the order on rename', async () => {
  await page.getByRole('treeitem', { name: 'New collection' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'New request' }).click()
  const tree = page.getByRole('tree', { name: 'API collections' })
  const second = tree.getByRole('treeitem', { name: /HTTP request/ })
  await second.dblclick()
  await tree.getByRole('textbox', { name: 'Name' }).fill('Second')
  await tree.getByRole('textbox', { name: 'Name' }).press('Enter')
  await page.getByRole('textbox', { name: 'Request URL' }).fill(`${base}/echo?second=1`)
  const names = () => tree.getByRole('treeitem').allTextContents()
  await expect.poll(names).toEqual(['New collection', 'GETEcho', 'GETSecond'])

  // Dropping on the top edge of a row puts the request above it.
  await tree.getByRole('treeitem', { name: /Second/ }).dragTo(tree.getByRole('treeitem', { name: /Echo/ }), {
    targetPosition: { x: 40, y: 3 }
  })
  await expect.poll(names).toEqual(['New collection', 'GETSecond', 'GETEcho'])
  await screenshot('reordered')

  await tree.getByRole('treeitem', { name: /Second/ }).dblclick()
  await tree.getByRole('textbox', { name: 'Name' }).fill('Zulu')
  await tree.getByRole('textbox', { name: 'Name' }).press('Enter')
  await expect.poll(names).toEqual(['New collection', 'GETZulu', 'GETEcho'])
})

test('creates MQTT and WebSocket requests in their own sections', async () => {
  await section('MQTT').click()
  await page.getByRole('button', { name: 'New MQTT request' }).click()
  await expect(page.getByRole('switch', { name: 'Retain message' })).toBeVisible()
  await section('Realtime').click()
  await page.getByRole('button', { name: 'New WebSocket request' }).click()
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Connected', { exact: true })).toBeVisible()
  await screenshot('websocket')
})

test('builds and runs a test suite', async () => {
  await section('API').click()
  await page.getByRole('button', { name: 'New suite' }).click()
  const editor = page.getByRole('region', { name: 'Suite 1 suite' })
  await editor.getByRole('button', { name: 'Choose requests' }).click()
  const picker = page.getByRole('dialog', { name: 'Suite requests' })
  await picker.getByRole('textbox', { name: 'Search requests and folders' }).fill('ech')
  await expect(picker.getByRole('checkbox')).toHaveCount(2)
  await picker.getByRole('textbox', { name: 'Search requests and folders' }).fill('')
  await picker.getByRole('checkbox', { name: 'New collection' }).check()
  await expect(picker.getByRole('checkbox', { name: 'Echo' })).toBeDisabled()
  await screenshot('suite-picker')
  await picker.getByRole('button', { name: 'Save' }).click()
  await editor.getByRole('button', { name: 'Choose requests' }).click()
  await expect(picker.getByRole('checkbox', { name: 'New collection' })).toBeChecked()
  await picker.getByRole('button', { name: 'Cancel' }).click()
  await editor.getByRole('button', { name: 'Run suite' }).click()
  await expect(editor.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true')
  await expect(editor.getByRole('status', { name: 'Run summary' })).toContainText('All passed')
  await expect(editor.getByRole('group', { name: 'Requests' })).toContainText('2 passed, 0 failed')
  await expect(editor.getByRole('group', { name: 'Tests' })).toContainText('1 passed, 0 failed')
  await screenshot('suite-dashboard')

  // Answer the save dialog in the main process, then check a real PDF was written.
  const pdfPath = join(home, 'report.pdf')
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: path })
  }, pdfPath)
  await editor.getByRole('button', { name: 'Download PDF' }).click()
  await expect(editor.getByText('PDF saved')).toBeVisible()
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-')
  if (process.env['SCREENSHOTS']) copyFileSync(pdfPath, 'test-results/report.pdf')
  await editor.getByRole('tab', { name: 'History 1' }).click()
  await expect(editor.getByRole('list', { name: 'Past runs' }).getByRole('listitem')).toHaveCount(1)
  await screenshot('suite')
})

test('brings everything back after a restart', async () => {
  // An edit made right before quitting is still waiting to be written; closing the window must save it.
  await page.getByRole('tab', { name: /Echo/ }).click()
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.click()
  await url.press('End')
  await url.pressSequentially('&last=1')
  await app.close()
  await launch()

  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText(/Default/)
  await expect(page.getByRole('treeitem', { name: 'New collection' })).toBeVisible()
  await page.getByRole('treeitem', { name: /Echo/ }).click()
  await expect(page.getByRole('textbox', { name: 'Request URL' })).toHaveValue(`${base}/echo?page=2&last=1`)
  await expect(page.getByRole('tab', { name: 'Scripts 1' })).toBeVisible()
  await page.getByRole('list', { name: 'Test suites' }).getByRole('listitem', { name: 'Suite 1' }).click()
  await expect(page.getByRole('tab', { name: 'History 1' })).toBeVisible()
  await section('MQTT').click()
  await expect(page.getByRole('treeitem', { name: /MQTT request/ })).toBeVisible()

  const tree = JSON.parse(readFileSync(join(defaultWorkspace, 'collections.json'), 'utf8')) as { nodes: unknown[] }
  expect(tree.nodes).toHaveLength(5)
})

test('creates a second workspace in a chosen folder and switches between them', async () => {
  const folder = join(home, 'projects', 'payments')
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: /New workspace/ }).click()
  const dialog = page.getByRole('dialog', { name: 'New workspace' })
  await dialog.getByLabel('Name').fill('Payments')
  await dialog.getByLabel('Folder').fill(folder)
  await dialog.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText(/Payments/)
  await expect(page.getByText(/No collections yet/)).toBeVisible()
  expect(JSON.parse(readFileSync(join(folder, 'wiremate.json'), 'utf8'))).toMatchObject({ name: 'Payments' })

  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: /Default/ }).click()
  await section('API').click()
  await expect(page.getByRole('treeitem', { name: 'New collection' })).toBeVisible()
})

test('colours variables and edits their values in place', async () => {
  await section('Env').click()
  await page.getByRole('button', { name: 'New environment' }).click()
  await page.getByRole('button', { name: 'Add variable' }).click()
  await page.getByRole('textbox', { name: 'Key' }).last().fill('host')
  await page.getByRole('textbox', { name: 'Value' }).last().fill(base)
  await expect(page.getByRole('region', { name: 'Environment 1 environment' })).toBeVisible()
  await screenshot('environment')

  await section('API').click()
  await page.getByRole('button', { name: 'New HTTP request' }).click()
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.fill('{{host}}/echo?user={{userId}}')
  const field = url.locator('..')
  await expect(field.locator('[data-variable="host"]')).toHaveClass('wm-variable-defined')
  await expect(field.locator('[data-variable="userId"]')).toHaveClass('wm-variable-missing')

  // The coloured copy sits behind the input, so move the pointer to where it is rather than hovering it. A real
  // pointer never rests perfectly still; keep nudging it, as a hand would, until the popover shows.
  const host = (await field.locator('[data-variable="host"]').boundingBox())!
  const hostPopover = page.getByRole('dialog', { name: 'Variable host' })
  await expect(async () => {
    await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2)
    await page.mouse.move(host.x + host.width / 2 + 2, host.y + host.height / 2)
    await expect(hostPopover).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(hostPopover.getByRole('textbox', { name: 'Value of host' })).toHaveValue(base)
  await screenshot('variable-hover')

  const box = (await field.locator('[data-variable="userId"]').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const userPopover = page.getByRole('dialog', { name: 'Variable userId' })
  await expect(userPopover).toContainText('Not set in Environment 1')
  await userPopover.getByRole('textbox', { name: 'Value of userId' }).fill('42')
  await userPopover.getByRole('textbox', { name: 'Value of userId' }).press('Enter')
  await expect(field.locator('[data-variable="userId"]')).toHaveClass('wm-variable-defined')

  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('200 OK')).toBeVisible()
  await expect(page.getByText('"url":"/echo?user=42"')).toBeVisible()
  await screenshot('variables')
})

test('asks before deleting a request', async () => {
  const request = page.getByRole('treeitem', { name: /HTTP request/ })
  await request.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('The request "HTTP request" will be deleted. This cannot be undone.')
  await screenshot('confirm-delete')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(request).toBeVisible()

  await request.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(request).toHaveCount(0)
})
