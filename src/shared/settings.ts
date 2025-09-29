export type ExtensionSettings = {
  autoRender: boolean
  hostPatterns: string[]
}

const STORAGE_KEY = 'settings'

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoRender: true,
  hostPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
}

type GetSettingsOptions = {
  throwOnError?: boolean
}

export async function getSettings(options: GetSettingsOptions = {}): Promise<ExtensionSettings> {
  try {
    const stored = await chrome.storage.sync.get(STORAGE_KEY)
    return normalizeSettings(stored[STORAGE_KEY])
  } catch (err) {
    console.warn('Failed to load settings, falling back to defaults', err)
    if (options.throwOnError) {
      throw err
    }
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const normalized = normalizeSettings(settings)
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalized })
}

export function normalizeSettings(input: unknown): ExtensionSettings {
  if (!input || typeof input !== 'object') {
    return DEFAULT_SETTINGS
  }

  const record = input as Partial<ExtensionSettings>
  const autoRender = typeof record.autoRender === 'boolean' ? record.autoRender : DEFAULT_SETTINGS.autoRender
  const hostPatterns = Array.isArray(record.hostPatterns)
    ? record.hostPatterns
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : DEFAULT_SETTINGS.hostPatterns

  return {
    autoRender,
    hostPatterns: hostPatterns.length > 0 ? hostPatterns : DEFAULT_SETTINGS.hostPatterns,
  }
}
