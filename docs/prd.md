# Product Requirements

## Problem Statement

AI chat platforms often expose Mermaid code blocks as raw text, forcing users to copy/paste into external renderers. CoderChart removes that friction by transforming recognised Mermaid snippets directly within the chat interface.

## Goals

- Auto-render Mermaid diagrams on trusted hosts without manual intervention.
- Provide inline controls to manage visibility, navigation, and exports.
- Keep configuration lightweight and synced across Chrome profiles.
- Fail gracefully when diagrams cannot render and surface actionable feedback.

## Target Users

- Engineers and analysts who rely on ChatGPT or similar tools to sketch flows, ERDs, or diagrams.
- Technical writers who review Mermaid output in AI-assisted drafts.
- Product teams evaluating AI-generated diagrams during reviews.

## Key Features

- Default auto-rendering (`autoRender = true`) for fast feedback loops.
- Host whitelist seeded with ChatGPT domains (`https://chatgpt.com/*`, `https://chat.openai.com/*`).
- MutationObserver-driven detection to keep up with streaming chat updates.
- Inline toolbar with show/hide, scroll-to-code, and SVG/PNG download actions.
- Themed containers that respect host dark/light schemes.
- Options page (`options.html`) for toggling auto-render, editing whitelists, and resetting defaults.

## Success Metrics

- 90%+ of Mermaid blocks render without manual refresh.
- Diagram render latency under 500ms on typical chat conversations (after initial page load).
- Less than 5% of renders trigger unhandled errors in production logs.
- At least 50% of active users keep the default auto-render setting enabled.
- Positive qualitative feedback on export quality (SVG/PNG) from beta users.

## Non-goals

- Supporting arbitrary third-party diagramming syntaxes beyond Mermaid.
- Providing a pop-up or new-tab renderer. Focus is inline augmentation.
- Offline mode or local backup of diagrams beyond user-triggered downloads.
- Autosaving edited diagrams or providing a diagram editor.

## Future Roadmap Ideas

- Guided onboarding surfaced on install to highlight toolbar controls.
- Additional host presets (e.g. internal Confluence, GitHub Issues) with user opt-in.
- Granular theme controls for high-contrast or dyslexia-friendly modes.
- Export presets (transparent backgrounds, custom dimensions) for presentation teams.
- Automated integration tests to catch regressions in the download pipeline.
- Resolve build-time chunk-size warnings by tuning Vite rollup settings.
