import { DEFAULT_SETTINGS, normalizeSettings, saveSettings } from '../shared/settings'

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get('settings')
  const existing = stored.settings

  if (existing === undefined) {
    await saveSettings(DEFAULT_SETTINGS)
    return
  }

  const normalized = normalizeSettings(existing)
  await saveSettings(normalized)
})
