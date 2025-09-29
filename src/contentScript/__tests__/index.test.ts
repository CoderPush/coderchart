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
})
