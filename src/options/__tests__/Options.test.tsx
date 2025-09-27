import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Options } from '../Options'
import { setChromeStorageSync, chromeMock } from 'test/mocks/chrome'

const SETTINGS_KEY = 'settings'

describe('Options page', () => {
  it('loads stored settings and allows saving changes', async () => {
    setChromeStorageSync({
      [SETTINGS_KEY]: {
        autoRender: false,
        hostPatterns: ['https://example.com/*'],
      },
    })

    const user = userEvent.setup()

    render(<Options />)

    const toggle = await screen.findByRole('checkbox', { name: /auto-render mermaid diagrams/i })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    expect(toggle).toBeChecked()

    const patternInputs = screen.getAllByPlaceholderText('https://example.com/*')
    const newPatternInput = patternInputs.at(-1)
    expect(newPatternInput).toBeDefined()
    await user.clear(newPatternInput as HTMLInputElement)
    await user.type(newPatternInput as HTMLInputElement, 'https://docs.example.com/*')

    const addButton = screen.getByRole('button', { name: /add pattern/i })
    await user.click(addButton)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(chromeMock.storage.sync.set).toHaveBeenCalled()
    })

    const payload = chromeMock.storage.sync.set.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(payload?.[SETTINGS_KEY]).toMatchObject({
      autoRender: true,
      hostPatterns: ['https://example.com/*', 'https://docs.example.com/*'],
    })
  })

  it('shows an error message when loading settings fails', async () => {
    chromeMock.storage.sync.get.mockRejectedValueOnce(new Error('nope'))

    render(<Options />)

    await waitFor(() => {
      expect(screen.getByText(/unable to load settings/i)).toBeInTheDocument()
    })
  })
})
