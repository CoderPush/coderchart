import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const extensionFixture = base.extend<{ extensionPath: string }>({
  extensionPath: [
    async ({}, use) => {
      execSync('pnpm zip', { stdio: 'inherit' })
      const extensionDir = path.resolve(__dirname, '../../build')
      process.env.PLAYWRIGHT_EXTENSION_PATH = extensionDir
      await use(extensionDir)
    },
    { scope: 'worker', auto: true },
  ],
})

export const test = extensionFixture
export const expect = extensionFixture.expect
