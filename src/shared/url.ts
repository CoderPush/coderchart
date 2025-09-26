const specialCharsRegex = /[.+?^${}()|[\]\\]/g

function escapeForRegex(value: string): string {
  return value.replace(specialCharsRegex, '\\$&')
}

export function patternToRegExp(pattern: string): RegExp {
  const sanitized = pattern.trim()
  const placeholder = '\u0000'
  const withPlaceholders = sanitized.replace(/\*/g, placeholder)
  const escaped = escapeForRegex(withPlaceholders)
  const regexSource = escaped.replace(new RegExp(placeholder, 'g'), '.*')
  return new RegExp(`^${regexSource}$`)
}

export function doesUrlMatchPatterns(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      const regex = patternToRegExp(pattern)
      return regex.test(url)
    } catch (err) {
      console.warn(`Failed to evaluate pattern "${pattern}"`, err)
      return false
    }
  })
}
