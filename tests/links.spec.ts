import { test, expect } from '@playwright/test'

/** Type a command into the terminal and press Enter. */
async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  const textarea = page.locator('.terminal-content textarea')
  await textarea.focus()
  for (const ch of cmd) {
    await textarea.press(ch)
  }
  await textarea.press('Enter')
}

/** Read all text from the ghostty-web canvas terminal buffer. */
async function getTerminalText(
  page: import('@playwright/test').Page,
): Promise<string> {
  return page.evaluate(
    () =>
      (
        window as unknown as { __getTerminalText?: () => string }
      ).__getTerminalText?.() ?? '',
  )
}

test.describe('Blog Post Links', () => {
  test('welcome banner displays recent posts', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await page.waitForTimeout(1000)

    const text = await getTerminalText(page)
    expect(text).toContain('Recent Posts')
    expect(text).toContain('building-a-blog')
  })

  test('less command navigates to post URL', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await page.waitForTimeout(1000)

    await typeCommand(page, 'less building-a-blog')
    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 3000 })

    // URL should contain the post slug
    await expect(page).toHaveURL(/\/post\/building-a-blog/)
  })

  test('deeplink loads correct post', async ({ page }) => {
    await page.goto('/#/post/building-a-blog')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })

    await expect(page.locator('.pager-overlay')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.pager-filename')).toHaveText('building-a-blog')
  })
})
