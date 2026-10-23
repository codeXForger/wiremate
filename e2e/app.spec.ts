import { mkdtempSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

let app: ElectronApplication
let page: Page
let server: Server
let base = ''

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

test.beforeAll(async () => {
  await startServer()
  const home = mkdtempSync(join(tmpdir(), 'wiremate-e2e-'))
  app = await electron.launch({ args: ['.'], env: { ...process.env, WIREMATE_HOME: home } })
  page = await app.firstWindow()
  await page.setViewportSize({ width: 1440, height: 900 })
})

test.afterAll(async () => {
  await app.close()
  server.close()
})

test('opens the demo workspace with its requests', async () => {
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText(/Demo workspace/)
  await expect(page.getByRole('treeitem', { name: /List users/ })).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/shell.png' })
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
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/http.png' })
  await consolePanel.getByRole('button', { name: 'Close console' }).click()
})

test('cancels a request that is still on its way', async () => {
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.fill(`${base}/slow`)
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled()
  await url.fill(`${base}/echo`)
})

test('edits a request in the real window', async () => {
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.click()
  await url.press('End')
  await url.pressSequentially('?page=2')
  await expect(url).toHaveValue(`${base}/echo?page=2`)
  await expect(page.getByLabel('Unsaved changes')).toBeVisible()
})

test('drags a request into another collection', async () => {
  const sections = page.getByRole('navigation', { name: 'Sections' })
  await sections.getByRole('button', { name: 'API' }).click()
  await page.getByRole('button', { name: 'New collection' }).click()
  await page
    .getByRole('treeitem', { name: 'List users' })
    .dragTo(page.getByRole('treeitem', { name: 'New collection' }))
  const rows = page.getByRole('tree', { name: 'API collections' }).getByRole('treeitem')
  await expect(rows.nth(0)).toHaveText('New collection')
  await expect(rows.nth(1)).toHaveText(/List users/)
  await expect(rows.nth(2)).toHaveText('Public APIs')
})

test('renames a request by double clicking it', async () => {
  await page.getByRole('treeitem', { name: /List users/ }).dblclick()
  const input = page.getByRole('textbox', { name: 'Name' })
  await expect(input).toBeFocused()
  await input.fill('All users')
  await input.press('Enter')
  await expect(page.getByRole('treeitem', { name: /All users/ })).toBeVisible()
})

test('renames from a tab and cuts long names with an ellipsis', async () => {
  const longName = 'All users in the organisation including archived and suspended accounts'
  await page.getByRole('treeitem', { name: /All users/ }).click()
  await page.getByRole('tab', { name: /All users/ }).dblclick()
  const input = page.getByRole('tablist', { name: 'Open requests' }).getByRole('textbox', { name: 'Name' })
  await input.fill(longName)
  await input.press('Enter')
  const title = page.getByRole('tablist', { name: 'Open requests' }).getByTitle(longName)
  await expect(title).toHaveCSS('text-overflow', 'ellipsis')
  const clipped = await title.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(clipped).toBe(true)
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/tab-ellipsis.png' })
})

test('shows the MQTT section', async () => {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'MQTT' }).click()
  await page.getByRole('treeitem', { name: /Sensor telemetry/ }).click()
  await expect(page.getByRole('switch', { name: 'Retain message' })).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/mqtt.png' })
})

test('connects a WebSocket session', async () => {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Realtime' }).click()
  await page.getByRole('treeitem', { name: /Echo socket/ }).click()
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Connected', { exact: true })).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/websocket.png' })
})

test('builds and runs a test suite', async () => {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'API' }).click()
  await page.getByRole('button', { name: 'New suite' }).click()
  const editor = page.getByRole('region', { name: 'Suite 1 suite' })
  await editor.getByRole('button', { name: 'Add request or folder' }).click()
  await page.getByRole('menuitem', { name: 'GET HTTP request' }).click()
  await editor.getByRole('button', { name: 'Run suite' }).click()
  await editor.getByRole('tab', { name: 'Results' }).click()
  await expect(editor.getByRole('status', { name: 'Run summary' })).toContainText('1 passed, 0 failed')
  await expect(editor.getByRole('status', { name: 'Run summary' })).toContainText('Tests 1/1 passed')
  await editor.getByRole('tab', { name: 'History 1' }).click()
  await expect(editor.getByRole('list', { name: 'Past runs' }).getByRole('listitem')).toHaveCount(1)
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/suite.png' })
})
