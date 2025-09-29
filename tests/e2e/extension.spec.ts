import { expect, test } from './fixtures/extension'

const CHAT_GPT_URL = 'https://chatgpt.com/c/example'

const mockChatGptHtml = `
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>ChatGPT mock</title></head>
  <body>
    <main>
      <article>
        <pre><code>graph TD; A-->B;</code></pre>
      </article>
    </main>
  </body>
</html>
`

test.describe('CoderChart extension e2e', () => {
  test('renders mermaid diagrams on ChatGPT pages', async ({ page, context }) => {
    await context.route('https://chatgpt.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: mockChatGptHtml,
      })
    })

    await page.goto(CHAT_GPT_URL)

    const diagram = page.locator('svg')
    await expect(diagram).toHaveCount(1)
    await expect(diagram).toBeVisible()

    const container = page.locator('[data-coderchart-container="true"]').first()
    const diagramToggle = container.getByRole('button', { name: 'Diagram' })
    const codeToggle = container.getByRole('button', { name: 'Code' })
    const diagramPane = container.locator('[data-coderchart-pane="diagram"]')
    const codePane = container.locator('[data-coderchart-pane="code"]')

    await expect(diagramToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(codeToggle).toHaveAttribute('aria-pressed', 'false')
    await expect(diagramPane).toBeVisible()
    await expect(codePane).toBeHidden()

    await codeToggle.click()

    await expect(codeToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(diagramToggle).toHaveAttribute('aria-pressed', 'false')
    await expect(diagramPane).toBeHidden()
    await expect(codePane).toBeVisible()
  })
})
