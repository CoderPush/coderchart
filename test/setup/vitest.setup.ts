import createFetchMock from 'vitest-fetch-mock'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { installChromeMock, resetChromeMock } from '../mocks/chrome'

const fetchMock = createFetchMock(vi)
fetchMock.enableMocks()

installChromeMock()

beforeEach(() => {
  fetchMock.resetMocks()
})

afterEach(() => {
  resetChromeMock()
})

globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(performance.now()), 0) as unknown as number
}

globalThis.cancelAnimationFrame = (handle: number) => {
  clearTimeout(handle as unknown as NodeJS.Timeout)
}

function updateHistoryLocation(url?: string | URL | null) {
  if (!url) return
  const target = typeof url === 'string' ? new URL(url, window.location.href) : new URL(url.toString(), window.location.href)
  try {
    window.location.href = target.toString()
  } catch {
    window.location.assign(target.toString())
  }
}

const originalReplaceState = window.history.replaceState.bind(window.history)
window.history.replaceState = ((data: any, unused: string, url?: string | URL | null) => {
  updateHistoryLocation(url)
  return originalReplaceState(data, unused, url ?? null)
}) as typeof window.history.replaceState

const originalPushState = window.history.pushState.bind(window.history)
window.history.pushState = ((data: any, unused: string, url?: string | URL | null) => {
  updateHistoryLocation(url)
  return originalPushState(data, unused, url ?? null)
}) as typeof window.history.pushState
