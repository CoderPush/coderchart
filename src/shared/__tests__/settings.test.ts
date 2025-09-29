import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings } from '../settings'

describe('normalizeSettings', () => {
  it('falls back to defaults when data is missing', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('strips invalid patterns and preserves valid configuration', () => {
    const result = normalizeSettings({
      autoRender: false,
      hostPatterns: ['  https://valid.com/*  ', '', 123 as unknown as string],
    })

    expect(result.autoRender).toBe(false)
    expect(result.hostPatterns).toEqual(['https://valid.com/*'])
  })

  it('reverts to defaults when pattern list becomes empty', () => {
    const result = normalizeSettings({
      autoRender: true,
      hostPatterns: [],
    })

    expect(result).toEqual(DEFAULT_SETTINGS)
  })
})
