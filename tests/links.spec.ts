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

test.describe('Blog Post Links', () => {
  test('welcome banner displays recent posts', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await page.waitForTimeout(1000)

    const text = await page.locator('.terminal-content').textContent()
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
