# coderchart

Chrome extension that renders Mermaid diagrams inline wherever ChatGPT (or another whitelisted site) shows a Mermaid code fence. Built with Vite, React, and Manifest V3.

## Features

- Auto-detects Mermaid snippets on supported pages and renders them beneath the original code block.
- Handles live chat updates via a MutationObserver and avoids duplicate work with lightweight bookkeeping.
- Resilient error messaging when Mermaid parsing fails.
- Options page to toggle auto-rendering and manage the site whitelist powered by `chrome.storage.sync`.
- Download rendered diagrams as SVG or PNG straight from the inline toolbar.

## Getting Started

```bash
pnpm install
pnpm dev
```

The dev server pipes hot reloads into the extension. Load the unpacked folder shown in the terminal (usually `dist`) via Chrome's Extensions page while Developer Mode is enabled.

### Options & Settings

- Open `options.html` during development (served at `http://localhost:5173/options.html`) to manage the whitelist or disable auto rendering.
- Saved settings sync across Chrome instances via `chrome.storage.sync`.

## Building

```bash
pnpm run build
```

The production bundle lands in `dist/`. Package it manually or use `pnpm run zip` for a distributable archive.

---

Bootstrapped with [create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext)
