import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] })
  page = await app.firstWindow()
  await page.setViewportSize({ width: 1440, height: 900 })
})

test.afterAll(async () => {
  await app.close()
})

test('opens the demo workspace with its requests', async () => {
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText(/Demo workspace/)
  await expect(page.getByRole('treeitem', { name: /List users/ })).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/shell.png' })
})

test('creates an HTTP request and sends it', async () => {
  await page.getByRole('button', { name: 'New HTTP request' }).click()
  await expect(page.getByRole('tab', { name: /HTTP request/ })).toBeVisible()
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('200 OK')).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/http.png' })
})

test('edits a request in the real window', async () => {
  const url = page.getByRole('textbox', { name: 'Request URL' })
  await url.click()
  await url.press('End')
  await url.pressSequentially('?page=2')
  await expect(url).toHaveValue('https://httpbin.org/get?page=2')
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
