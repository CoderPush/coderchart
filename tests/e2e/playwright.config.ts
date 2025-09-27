import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const extensionPath = process.env.PLAYWRIGHT_EXTENSION_PATH ?? path.resolve(__dirname, '../../build')

export default defineConfig({
  testDir: __dirname,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
