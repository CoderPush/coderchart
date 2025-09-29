import { waitFor } from '@testing-library/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setChromeStorageSync } from 'test/mocks/chrome'

const mermaidInitialize = vi.fn()
const mermaidRender = vi.fn().mockResolvedValue({
  svg: '<svg width="100" height="60"></svg>',
})

vi.mock('mermaid', () => ({
  default: {
    initialize: mermaidInitialize,
    render: mermaidRender,
  },
}))

describe('content script', () => {
  beforeEach(() => {
    vi.resetModules()
    mermaidInitialize.mockClear()
    mermaidRender.mockClear()
    document.body.innerHTML = '<pre><code>graph TD; A-->B;</code></pre>'
    setChromeStorageSync({
      settings: {
        autoRender: true,
        hostPatterns: ['https://chatgpt.com/*'],
      },
    })
    window.history.replaceState({}, '', 'https://chatgpt.com/conversation')
  })

  it('renders detected mermaid blocks when active', async () => {
    await import('../index')

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(mermaidInitialize).toHaveBeenCalled()
    expect(mermaidRender).toHaveBeenCalledWith(expect.stringMatching(/^coderchart-/), expect.stringContaining('graph TD'))
  })

  it('allows toggling between diagram and code views and persists selection', async () => {
    await import('../index')

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    const container = document.querySelector('[data-coderchart-container="true"]') as HTMLElement
    expect(container).toBeTruthy()

    await waitFor(() => {
      expect(container.dataset['view']).toBe('diagram')
    })

    const diagramPane = container.querySelector('[data-coderchart-pane="diagram"]') as HTMLElement
    const codePane = container.querySelector('[data-coderchart-pane="code"]') as HTMLElement
    expect(diagramPane).toBeTruthy()
    expect(codePane).toBeTruthy()
    expect(diagramPane.style.display).toBe('block')
    expect(codePane.style.display).toBe('none')

    const codeToggle = container.querySelector('button[data-coderchart-label="Code"]') as HTMLButtonElement
    expect(codeToggle).toBeTruthy()
    codeToggle.click()

    expect(container.dataset['view']).toBe('code')
    expect(diagramPane.style.display).toBe('none')
    expect(codePane.style.display).toBe('block')

    const codeElement = document.querySelector('code') as HTMLElement
    codeElement.textContent = 'graph TD; X-->Y;'

    await waitFor(() => {
      expect(mermaidRender.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    expect(container.dataset['view']).toBe('code')
    expect(diagramPane.style.display).toBe('none')
    expect(codePane.style.display).toBe('block')
  })
})
