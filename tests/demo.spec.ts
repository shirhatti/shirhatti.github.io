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

async function terminalText(page: import('@playwright/test').Page) {
  await page.waitForTimeout(500)
  return (await page.locator('.terminal-content').textContent()) ?? ''
}

test.describe('Demos (./demos/<name>)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test('running a demo path opens it in a sandboxed iframe', async ({
    page,
  }) => {
    await typeCommand(page, './demos/game-of-life')

    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('.demo-filename')).toHaveText('game-of-life')
    await expect(page).toHaveURL(/#\/demos\/game-of-life/)
    await expect(page.locator('.demo-frame')).toHaveAttribute(
      'sandbox',
      'allow-scripts',
    )
    await expect(
      page.frameLocator('.demo-frame').locator('canvas#board'),
    ).toBeAttached({ timeout: 5000 })

    await page.keyboard.press('q')
    await expect(page.locator('.demo-overlay')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('relative path from inside ~/demos works', async ({ page }) => {
    await typeCommand(page, 'cd demos')
    await typeCommand(page, './game-of-life')
    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 3000 })
  })

  test('close button works after the demo takes focus', async ({ page }) => {
    await typeCommand(page, './demos/game-of-life')
    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 3000 })

    await page.locator('.demo-frame').click()
    await page.locator('.demo-close-btn').click()
    await expect(page.locator('.demo-overlay')).not.toBeVisible({
      timeout: 3000,
    })

    await page.waitForTimeout(300)
    await typeCommand(page, 'help')
    expect(await terminalText(page)).toContain('Available Commands')
  })

  test('ls marks demos as executable', async ({ page }) => {
    await typeCommand(page, 'ls demos')
    expect(await terminalText(page)).toContain('game-of-life*')
  })

  test('less and cat point at running the demo', async ({ page }) => {
    await typeCommand(page, 'less demos/game-of-life')
    await expect(page.locator('.demo-overlay')).not.toBeVisible()
    await typeCommand(page, 'cat demos/game-of-life')
    const text = await terminalText(page)
    expect(text).toContain('Is an executable')
    expect(text).toContain('run it with ./demos/game-of-life')
  })

  test('non-executables and directories are rejected', async ({ page }) => {
    await typeCommand(page, './demos')
    await typeCommand(page, './posts/2016/04/11-building-a-blog.md')
    await typeCommand(page, './demos/nope')
    const text = await terminalText(page)
    expect(text).toContain('./demos: Is a directory')
    expect(text).toContain('Permission denied')
    expect(text).toContain('./demos/nope: No such file or directory')
  })

  test('welcome banner lists demos separately from posts', async ({ page }) => {
    const text = await terminalText(page)
    expect(text).toContain('Demos:')
    expect(text).toContain('./demos/game-of-life')
  })

  test('deeplink opens the demo', async ({ page }) => {
    await page.goto('about:blank')
    await page.goto('/#/demos/game-of-life')
    await page.waitForSelector('.terminal-content', { timeout: 5000 })
    await expect(page.locator('.demo-overlay')).toBeVisible({ timeout: 5000 })
  })
})
