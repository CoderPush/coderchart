import { describe, expect, it } from 'vitest'
import { doesUrlMatchPatterns, patternToRegExp } from '../url'

describe('pattern utilities', () => {
  it('converts patterns with wildcards into regular expressions', () => {
    const regex = patternToRegExp('https://example.com/*')
    expect(regex.test('https://example.com/path')).toBe(true)
    expect(regex.test('https://example.com/another/segment')).toBe(true)
    expect(regex.test('https://other.com/')).toBe(false)
  })

  it('matches URLs against provided patterns', () => {
    const patterns = ['https://chatgpt.com/*', 'https://chat.openai.com/*']
    expect(doesUrlMatchPatterns('https://chatgpt.com/c/foo', patterns)).toBe(true)
    expect(doesUrlMatchPatterns('https://example.com', patterns)).toBe(false)
  })
})
