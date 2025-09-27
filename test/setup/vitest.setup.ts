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
