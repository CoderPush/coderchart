import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

type ManifestV3 = chrome.runtime.ManifestV3

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

const manifest = {
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-32.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
    256: 'img/logo-256.png',
    512: 'img/logo-512.png',
    1024: 'img/logo-1024.png',
  } as const,
  options_page: 'options.html' as const,
  background: {
    service_worker: 'src/background/index.ts' as const,
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*/*', 'http://localhost/*'] as const,
      js: ['src/contentScript/index.ts'] as const,
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        'img/logo-16.png',
        'img/logo-32.png',
        'img/logo-48.png',
        'img/logo-128.png',
        'img/logo-256.png',
        'img/logo-512.png',
        'img/logo-1024.png',
        'img/logo-light-512.png',
        'img/logo-light-1024.png',
      ] as const,
      matches: [] as const,
    },
  ],
  permissions: ['storage'],
} satisfies ManifestV3

export default defineManifest(manifest)
