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
  await page.getByRole('button', { name: 'New request' }).first().click()
  await page.getByRole('button', { name: /HTTP REST and plain HTTP/ }).click()
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

test('connects a WebSocket session', async () => {
  await page.getByRole('treeitem', { name: /Echo socket/ }).click()
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Connected', { exact: true })).toBeVisible()
  if (process.env['SCREENSHOTS']) await page.screenshot({ path: 'test-results/websocket.png' })
})
