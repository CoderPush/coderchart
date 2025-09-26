# Extension Flow

This guide walks through the end-to-end experience from installation to exporting rendered diagrams.

## Narrative Flow

1. **Install:** User loads the unpacked build or installs from the Chrome Web Store. The background script seeds default settings in `chrome.storage.sync`.
2. **Grant permissions:** Chrome applies host permissions declared in `manifest.ts` (ChatGPT domains and localhost during development).
3. **Open supported page:** When the user opens chatgpt.com or another whitelisted host, the content script loads, retrieves settings, and checks the URL against the whitelist.
4. **Render diagrams:** Matching Mermaid code fences trigger the inline renderer. Mermaid initialises with theme selection, generates SVG, and injects a container with toolbar controls.
5. **Adjust settings:** Users can visit `options.html` to disable auto-rendering, edit host patterns, or reset to defaults. Changes sync across devices.
6. **Use toolbar:** Inline buttons allow collapsing/expanding the diagram, scrolling back to the source code block, and exporting as SVG or PNG.
7. **Download pipeline:** SVG downloads reuse the cached render, while PNG downloads convert the SVG via an off-screen canvas before prompting a file save.
8. **Keep updated:** A MutationObserver re-runs rendering when the chat adds new content, and storage listeners reconfigure the script when settings change.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chrome
    participant B as Background
    participant CS as Content Script
    participant Opt as Options UI

    U->>C: Install extension
    C->>B: fire onInstalled
    B->>chrome.storage.sync: normalize defaults (autoRender true, ChatGPT hosts)
    U->>C: Open chatgpt.com
    C->>CS: Inject content script
    CS->>chrome.storage.sync: getSettings()
    chrome.storage.sync-->>CS: settings
    CS->>CS: doesUrlMatchPatterns()
    alt Matches whitelist
        CS->>Mermaid: initialize(theme)
        CS->>U: Render inline diagram and toolbar
    else Not matched
        CS->>CS: stay dormant
    end
    U->>Toolbar: Click download SVG/PNG
    Toolbar->>CS: fetch cached SVG / convert to PNG
    CS->>U: Trigger file download
    U->>Opt: Open options page
    Opt->>chrome.storage.sync: save updated settings
    chrome.storage.sync-->>CS: onChanged event
    CS->>CS: Apply settings (activate/deactivate/re-render)
```
