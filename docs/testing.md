# Testing Guide

## Manual Test Plan

- **Local setup**
  - Run `pnpm install` and `pnpm dev`.
  - Load the generated `dist/` folder as an unpacked extension in Chrome (Developer Mode on).
- **Settings sanity**
  - Confirm defaults: auto-render enabled, whitelist contains ChatGPT domains.
  - Toggle auto-render off in `options.html`; verify diagrams stop rendering until re-enabled.
  - Add and remove a custom host pattern; ensure the input trims whitespace and disallows duplicates.
- **Rendering lifecycle**
  - On chatgpt.com, paste multiple Mermaid snippets (different diagram types) and verify each auto-renders below its code block.
  - Trigger chat updates or regenerate responses to confirm the MutationObserver handles new content without duplicates.
  - Switch the page between light and dark themes (or toggle system theme) and confirm container styling updates.
- **Toolbar actions**
  - Use "Hide diagram" / "Show diagram" toggles; ensure state persists while on the page.
  - Click "Scroll to code" and verify smooth scrolling centers the source block.
  - Open the "Export" dropdown, trigger SVG and PNG exports, and confirm filenames are unique per block while PNG output matches expected dimensions.
  - Induce a Mermaid syntax error and check that the inline error pane displays message + hint.
- **Extension lifecycle**
  - Reload the extension in `chrome://extensions` to verify background script restores defaults without duplicates.
  - Test on a non-whitelisted host to confirm the content script remains dormant.

## Automated Testing Opportunities

- Unit tests around `patternToRegExp` and `doesUrlMatchPatterns` to cover wildcard edge cases.
- Jest/`@testing-library/react` tests for `Options` form interactions (validation, save states, reset behaviour).
- Integration harness (e.g. Puppeteer) to open a static page with seeded Mermaid blocks and assert render/download flows.
- Canvas conversion smoke tests ensuring `convertSvgToPng` returns blobs with expected dimensions.
- CI check to detect Vite chunk-size warnings and fail builds when thresholds exceed targets.

## Known Gaps

- No automated coverage for the content script DOM manipulation; browser-based tests would increase confidence.
- PNG export depends on browser canvas support; add fallbacks or better error messaging if conversion fails.
