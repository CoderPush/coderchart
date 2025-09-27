import { vi } from 'vitest'

type Listener<T extends (...args: any[]) => any> = T

type ChromeEvent<T extends (...args: any[]) => any> = {
  addListener: (listener: Listener<T>) => void
  removeListener: (listener: Listener<T>) => void
  hasListener: (listener: Listener<T>) => boolean
  hasListeners: () => boolean
  emit: (...args: Parameters<T>) => Promise<void>
  clearListeners: () => void
}

function createChromeEvent<T extends (...args: any[]) => any>(): ChromeEvent<T> {
  const listeners = new Set<Listener<T>>()
  return {
    addListener: (listener) => {
      listeners.add(listener)
    },
    removeListener: (listener) => {
      listeners.delete(listener)
    },
    hasListener: (listener) => listeners.has(listener),
    hasListeners: () => listeners.size > 0,
    emit: async (...args) => {
      await Promise.all(Array.from(listeners).map((listener) => listener(...args)))
    },
    clearListeners: () => {
      listeners.clear()
    },
  }
}

type StorageChange = {
  oldValue?: unknown
  newValue?: unknown
}

type StorageSnapshot = Record<string, unknown>

const storageState = new Map<string, unknown>()

const storageOnChanged = createChromeEvent<Parameters<chrome.storage.StorageAreaChangedEvent['addListener']>[0]>()
const runtimeOnInstalled = createChromeEvent<Parameters<chrome.runtime.RuntimeInstalledEvent['addListener']>[0]>()
const runtimeOnMessage = createChromeEvent<Parameters<chrome.runtime.ExtensionMessageEvent['addListener']>[0]>()

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

function resolveStorageSnapshot(keys?: string | string[] | StorageSnapshot | null): StorageSnapshot {
  if (!keys) {
    return Object.fromEntries(storageState.entries())
  }

  if (typeof keys === 'string') {
    return { [keys]: storageState.get(keys) }
  }

  if (Array.isArray(keys)) {
    return keys.reduce<StorageSnapshot>((acc, key) => {
      acc[key] = storageState.get(key)
      return acc
    }, {})
  }

  const defaults: StorageSnapshot = { ...keys }
  for (const [key, value] of Object.entries(defaults)) {
    if (!storageState.has(key)) continue
    defaults[key] = storageState.get(key)
  }
  return defaults
}

function applyStorageUpdate(entries: StorageSnapshot): Record<string, StorageChange> {
  const changes: Record<string, StorageChange> = {}
  for (const [key, value] of Object.entries(entries)) {
    const oldValue = storageState.get(key)
    storageState.set(key, value)
    changes[key] = { oldValue, newValue: value }
  }
  return changes
}

export const chromeMock: typeof chrome = {
  runtime: {
    id: 'mock-extension-id',
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
    onMessage: runtimeOnMessage,
    onInstalled: runtimeOnInstalled,
    lastError: undefined,
  },
  storage: {
    sync: {
      get: vi.fn(async (keys?: string | string[] | StorageSnapshot | null) => {
        return resolveStorageSnapshot(keys)
      }),
      set: vi.fn(async (items: StorageSnapshot) => {
        const changes = applyStorageUpdate(items)
        if (Object.keys(changes).length > 0) {
          await storageOnChanged.emit(changes, 'sync')
        }
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys]
        const changes: Record<string, StorageChange> = {}
        keyList.forEach((key) => {
          if (!storageState.has(key)) return
          const oldValue = storageState.get(key)
          storageState.delete(key)
          changes[key] = { oldValue }
        })
        if (Object.keys(changes).length > 0) {
          await storageOnChanged.emit(changes, 'sync')
        }
      }),
      clear: vi.fn(async () => {
        const changes: Record<string, StorageChange> = {}
        for (const [key, value] of storageState.entries()) {
          changes[key] = { oldValue: value, newValue: undefined }
        }
        storageState.clear()
        if (Object.keys(changes).length > 0) {
          await storageOnChanged.emit(changes, 'sync')
        }
      }),
    },
    onChanged: storageOnChanged,
  },
  scripting: {
    executeScript: vi.fn(),
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as unknown as typeof chrome

export function installChromeMock() {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: chromeMock,
  })
}

export function resetChromeMock() {
  chromeMock.runtime.sendMessage.mockClear()
  chromeMock.runtime.getURL.mockClear()
  chromeMock.storage.sync.get.mockClear()
  chromeMock.storage.sync.set.mockClear()
  chromeMock.storage.sync.remove.mockClear()
  chromeMock.storage.sync.clear.mockClear()
  chromeMock.scripting.executeScript.mockClear()
  chromeMock.tabs.create.mockClear()
  chromeMock.tabs.query.mockClear()
  chromeMock.tabs.sendMessage.mockClear()
  storageState.clear()
  storageOnChanged.clearListeners()
  runtimeOnInstalled.clearListeners()
  runtimeOnMessage.clearListeners()
}

export function setChromeStorageSync(initial: StorageSnapshot) {
  for (const [key, value] of Object.entries(initial)) {
    storageState.set(key, cloneValue(value))
  }
}

export function getChromeStorageSync(): StorageSnapshot {
  return Object.fromEntries(storageState.entries())
}

export function emitStorageChange(changes: Record<string, StorageChange>, area: chrome.storage.AreaName = 'sync') {
  return storageOnChanged.emit(changes, area)
}

export function emitRuntimeInstalled(details: chrome.runtime.InstalledDetails) {
  return runtimeOnInstalled.emit(details)
}

export function emitRuntimeMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) {
  return runtimeOnMessage.emit(message, sender, sendResponse)
}
