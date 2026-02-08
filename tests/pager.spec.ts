import { test, expect } from '@playwright/test'

/** Type a command into the xterm terminal and press Enter. */
async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  // xterm.js uses a hidden textarea for input
  const textarea = page.locator('.terminal-content textarea')
  await textarea.focus()
  for (const ch of cmd) {
    await textarea.press(ch)
  }
  await textarea.press('Enter')
}

test.describe('Pager (less command)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    // Wait for welcome banner to finish rendering
    await page.waitForTimeout(1000)
  })

  test('less command opens pager and q closes it', async ({ page }) => {
    await typeCommand(page, 'less building-a-blog')

    // Pager overlay should appear
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 3000 })

    // Verify pager shows the post slug in the header
    await expect(page.locator('.pager-filename')).toHaveText('building-a-blog')

    // Press q to close the pager
    await page.keyboard.press('q')

    // Pager should be gone
    await expect(page.locator('.pager-overlay')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('terminal accepts input after closing pager', async ({ page }) => {
    // Open and close the pager
    await typeCommand(page, 'less building-a-blog')
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('q')
    await expect(page.locator('.pager-overlay')).not.toBeVisible({
      timeout: 3000,
    })

    // Small delay for focus to settle
    await page.waitForTimeout(300)

    // Now type a command — terminal should accept input
    await typeCommand(page, 'help')

    // Wait for help output to render, then check terminal has help text
    await page.waitForTimeout(500)
    const text = await page.locator('.terminal-content').textContent()
    expect(text).toContain('Available Commands')
  })

  test('Escape closes pager', async ({ page }) => {
    await typeCommand(page, 'less building-a-blog')
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('Escape')
    await expect(page.locator('.pager-overlay')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('pager keyboard navigation works', async ({ page }) => {
    await typeCommand(page, 'less building-a-blog')
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 3000 })

    const scrollArea = page.locator('.pager-scroll')

    // Start at top
    const initialScroll = await scrollArea.evaluate((el) => el.scrollTop)
    expect(initialScroll).toBe(0)

    // Press j to scroll down
    await page.keyboard.press('j')
    await page.waitForTimeout(100)
    const afterJ = await scrollArea.evaluate((el) => el.scrollTop)
    expect(afterJ).toBeGreaterThan(0)

    // Press g to go back to top
    await page.keyboard.press('g')
    await page.waitForTimeout(100)
    const afterG = await scrollArea.evaluate((el) => el.scrollTop)
    expect(afterG).toBe(0)

    // Clean up
    await page.keyboard.press('q')
  })

  test('deeplink opens pager and terminal works after close', async ({
    page,
  }) => {
    // NOTE: This test must NOT rely on beforeEach's goto('/') because the
    // deeplink detection runs once on mount. Navigate fresh to the deeplink URL.
    await page.goto('about:blank')
    await page.goto('/#/post/building-a-blog')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })

    // Pager should open automatically
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.pager-filename')).toHaveText('building-a-blog')

    // Close pager
    await page.keyboard.press('q')
    await expect(page.locator('.pager-overlay')).not.toBeVisible({
      timeout: 3000,
    })

    // Wait for focus to settle
    await page.waitForTimeout(300)

    // Verify terminal accepts input after deeplink pager close
    await typeCommand(page, 'help')
    await page.waitForTimeout(500)
    const text = await page.locator('.terminal-content').textContent()
    expect(text).toContain('Available Commands')
  })
})
