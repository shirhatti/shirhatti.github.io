import { test, expect } from '@playwright/test'

/** Type a command into the xterm terminal and press Enter. */
async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  const textarea = page.locator('.terminal-content textarea')
  await textarea.focus()
  for (const ch of cmd) {
    await textarea.press(ch)
  }
  await textarea.press('Enter')
}

test.describe('Demo (less on .html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test('less opens html demo in a sandboxed iframe', async ({ page }) => {
    await typeCommand(page, 'less game-of-life')

    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('.demo-filename')).toHaveText('game-of-life')
    await expect(page).toHaveURL(/\/demo\/game-of-life/)

    const frame = page.locator('.demo-frame')
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts')

    // The demo's own document loaded inside the iframe
    await expect(
      page.frameLocator('.demo-frame').locator('canvas#board'),
    ).toBeAttached({ timeout: 5000 })

    await page.keyboard.press('q')
    await expect(page.locator('.demo-overlay')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('close button works after the demo takes focus', async ({ page }) => {
    await typeCommand(page, 'less game-of-life')
    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 3000 })

    // Clicking into the iframe moves keyboard focus into the demo
    await page.locator('.demo-frame').click()
    await page.locator('.demo-close-btn').click()
    await expect(page.locator('.demo-overlay')).not.toBeVisible({
      timeout: 3000,
    })

    await page.waitForTimeout(300)
    await typeCommand(page, 'help')
    await page.waitForTimeout(500)
    const text = await page.locator('.terminal-content').textContent()
    expect(text).toContain('Available Commands')
  })

  test('cat points html files at less', async ({ page }) => {
    await typeCommand(page, 'cat game-of-life')
    await page.waitForTimeout(500)
    const text = await page.locator('.terminal-content').textContent()
    expect(text).toContain('use less to view in an overlay')
  })

  test('deeplink opens the demo', async ({ page }) => {
    await page.goto('about:blank')
    await page.goto('/#/demo/game-of-life')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 5000 })
  })
})
