# Architecture

CoderChart follows the typical MV3 separation: a background service worker maintains defaults, the content script renders diagrams in-page, and the options UI manages configuration. Shared utilities in `src/shared` allow all surfaces to agree on settings and URL matching.

## Runtime Components

- **Background (`src/background/index.ts`)**
  - Runs once on install/upgrade.
  - Normalises settings saved in `chrome.storage.sync`, ensuring defaults exist (`autoRender: true`, ChatGPT host patterns).
  - Acts as the central authority for schema migrations.
- **Content Script (`src/contentScript/index.ts`)**
  - Loads settings on startup and listens for `chrome.storage.onChanged` updates.
  - Checks `window.location.href` against the whitelist via `doesUrlMatchPatterns`.
  - Sets up DOM observers to detect new Mermaid blocks, renders via Mermaid, and injects inline toolbars plus themed containers.
  - Handles export flows by converting SVG strings to downloadable SVG/PNG blobs.
- **Options UI (`src/options/Options.tsx`)**
  - Fetches settings on mount, exposes toggles and editable host patterns, and persists updates through `saveSettings`.
  - Implements optimistic UI with save-status feedback and reset-to-defaults shortcut.
  - Validates input lightly by ignoring empty/duplicate patterns.
- **Shared Utilities (`src/shared`)**
  - `settings.ts` centralises defaults, coercion, and persistence helpers.
  - `url.ts` compiles user patterns into regular expressions for whitelist checks.

## Data Flow Sequence

```mermaid
flowchart TD
    A[Load content script] --> B[getSettings()]
    B --> C{autoRender enabled?}
    C -- No --> D[Stay idle]
    C -- Yes --> E{URL matches whitelist?}
    E -- No --> D
    E -- Yes --> F[Configure Mermaid theme]
    F --> G[Process existing DOM]
    G --> H[Start MutationObserver]
    H --> I[Render new Mermaid blocks]
    I --> J[Update toolbar + downloads]
    J --> K[Listen for storage changes]
    K --> C
```

## Mermaid Rendering & Downloads

- Mermaid is initialised with `startOnLoad: false` and theming keyed to system or page dark mode.
- Each detected Mermaid block is rendered into a managed container that stores the last SVG string for reuse.
- **SVG export:** cached SVG is wrapped in a Blob and downloaded via `URL.createObjectURL`.
- **PNG export:** the SVG is rendered into an off-screen `<canvas>` using `drawImage`, respecting intrinsic dimensions before exporting to PNG via `canvas.toBlob`.
- Toolbar buttons are disabled until render completes to avoid empty exports.

## Settings Synchronisation

- The background script seeds defaults, but the content script defensively normalises settings each time it loads.
- Storage updates trigger a content-script listener that either re-activates, re-renders, or deactivates depending on `autoRender`/whitelist changes.
- The options UI trims, deduplicates, and validates entries before writing, preventing malformed patterns from breaking runtime checks.

## Known Constraints

- Builds occasionally report Rollup chunk-size warnings; adjust splitting before release if bundle size grows.
- Rendering currently assumes Mermaid syntax; invalid diagrams surface an inline error but do not retry automatically.
