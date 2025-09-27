import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, ExtensionSettings, getSettings, saveSettings, normalizeSettings } from '../shared/settings'

import './Options.css'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const defaultState = cloneSettings(DEFAULT_SETTINGS)
const SAVE_STATUS_RESET_DELAY_MS = 2400

export const Options = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultState)
  const [newPattern, setNewPattern] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const resetStatusTimeout = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true
    getSettings()
      .then((loaded) => {
        if (!mounted) return
        setSettings(cloneSettings(loaded))
      })
      .catch((error) => {
        console.warn('Failed to load settings', error)
        if (mounted) {
          setErrorMessage('Unable to load settings. Using defaults.')
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (resetStatusTimeout.current !== null) {
        window.clearTimeout(resetStatusTimeout.current)
      }
    }
  }, [])

  const normalizedPatterns = useMemo(() => settings.hostPatterns.map((pattern) => pattern.trim()), [settings.hostPatterns])

  const canAddPattern = useMemo(() => {
    const candidate = newPattern.trim()
    if (!candidate) return false
    return !normalizedPatterns.includes(candidate)
  }, [newPattern, normalizedPatterns])

  const handleToggleAutoRender = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, autoRender: checked }))
  }

  const handlePatternChange = (index: number, value: string) => {
    setSettings((prev) => {
      const hostPatterns = [...prev.hostPatterns]
      hostPatterns[index] = value
      return { ...prev, hostPatterns }
    })
  }

  const handleRemovePattern = (index: number) => {
    setSettings((prev) => {
      const hostPatterns = prev.hostPatterns.filter((_, i) => i !== index)
      return { ...prev, hostPatterns }
    })
  }

  const handleAddPattern = () => {
    const candidate = newPattern.trim()
    if (!candidate || !canAddPattern) return
    setSettings((prev) => ({ ...prev, hostPatterns: [...prev.hostPatterns, candidate] }))
    setNewPattern('')
  }

  const handleReset = () => {
    setSettings(cloneSettings(DEFAULT_SETTINGS))
    setNewPattern('')
    setStatus('idle')
    setErrorMessage(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (resetStatusTimeout.current !== null) {
      window.clearTimeout(resetStatusTimeout.current)
      resetStatusTimeout.current = null
    }
    setStatus('saving')
    setErrorMessage(null)
    try {
      const normalized = normalizeSettings(settings)
      await saveSettings(normalized)
      setSettings(cloneSettings(normalized))
      setStatus('saved')
      resetStatusTimeout.current = window.setTimeout(() => {
        setStatus('idle')
        resetStatusTimeout.current = null
      }, SAVE_STATUS_RESET_DELAY_MS)
    } catch (error) {
      console.error('Failed to save settings', error)
      setStatus('error')
      setErrorMessage('Could not save settings. Try again.')
    }
  }

  return (
    <main>
      <header className="page-header">
        <h1>CoderChart Settings</h1>
        <p>Choose where Mermaid diagrams render and how they appear on supported sites.</p>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-group">
          <div className="settings-group__header">
            <h2>Rendering</h2>
            <p>Automatically convert recognised Mermaid code blocks into diagrams.</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.autoRender}
              onChange={(event) => handleToggleAutoRender(event.target.checked)}
            />
            <span>Auto-render Mermaid diagrams</span>
          </label>
        </section>

        <section className="settings-group">
          <div className="settings-group__header">
            <h2>Site whitelist</h2>
            <p>Add match patterns (e.g. https://chatgpt.com/*) to control where diagrams render.</p>
          </div>
          <ul className="pattern-list">
            {settings.hostPatterns.map((pattern, index) => (
              <li className="pattern-row" key={`${pattern}-${index}`}>
                <input
                  type="text"
                  value={pattern}
                  onChange={(event) => handlePatternChange(index, event.target.value)}
                  placeholder="https://example.com/*"
                />
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => handleRemovePattern(index)}
                  aria-label={`Remove pattern ${pattern}`}
                >
                  Remove
                </button>
              </li>
            ))}
            {settings.hostPatterns.length === 0 && (
              <li className="pattern-empty">No patterns defined. The extension will stay inactive.</li>
            )}
          </ul>
          <div className="pattern-add">
            <input
              type="text"
              value={newPattern}
              onChange={(event) => setNewPattern(event.target.value)}
              placeholder="https://example.com/*"
            />
            <button
              type="button"
              className="button button-secondary"
              onClick={handleAddPattern}
              disabled={!canAddPattern}
            >
              Add pattern
            </button>
          </div>
        </section>

        <footer className="form-footer">
          <div className="form-messages">
            {status === 'saving' && <span className="status">Saving changes…</span>}
            {status === 'saved' && <span className="status status--success">Settings saved</span>}
            {status === 'error' && <span className="status status--error">{errorMessage}</span>}
            {status === 'idle' && errorMessage && <span className="status status--error">{errorMessage}</span>}
          </div>
          <div className="form-actions">
            <button type="button" className="button button-ghost" onClick={handleReset}>
              Reset to defaults
            </button>
            <button type="submit" className="button button-primary" disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    </main>
  )
}

function cloneSettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    autoRender: settings.autoRender,
    hostPatterns: [...settings.hostPatterns],
  }
}

export default Options
