import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/settings'
import { chromeMock, emitRuntimeInstalled, setChromeStorageSync } from 'test/mocks/chrome'

const SETTINGS_KEY = 'settings'

describe('background script', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('initialises default settings on fresh install', async () => {
    setChromeStorageSync({})

    await import('../index')

    await emitRuntimeInstalled({ reason: 'install' })

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ [SETTINGS_KEY]: DEFAULT_SETTINGS })
  })

  it('normalises existing settings when present', async () => {
    setChromeStorageSync({
      [SETTINGS_KEY]: {
        autoRender: 'nope',
        hostPatterns: ['  https://chatgpt.com/*  ', ''],
      },
    })

    await import('../index')

    await emitRuntimeInstalled({ reason: 'update', previousVersion: '0.9.0' })

    const payload = chromeMock.storage.sync.set.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(payload?.[SETTINGS_KEY]).toEqual({
      autoRender: true,
      hostPatterns: ['https://chatgpt.com/*'],
    })
  })
})
