# Documentation Hub

CoderChart centralises product, technical, and process documentation inside `/docs`. Start here for high-level context and jump to deeper guides as needed.

## Project Overview

CoderChart is a Chrome extension that auto-renders Mermaid diagrams on supported AI chat surfaces. It detects Mermaid blocks, injects a themed inline preview with toolbar controls, and keeps settings in sync across browsers via `chrome.storage.sync`.

## Quickstart

```bash
pnpm install
pnpm dev
# Load the dist/ directory as an unpacked extension in Chrome
```

Additional scripts live in `package.json`, including `pnpm build` for production bundles and `pnpm run zip` to package the extension.

## Documentation Map

- [Product Requirements](./prd.md)
- [Architecture](./architecture.md)
- [Extension Flow](./extension-flow.md)
- [UI Guidelines](./ui-guidelines.md)
- [Testing Guide](./testing.md)
- [Changelog](./changelog.md)

## Doc Conventions

- Use Markdown with concise, action-oriented language.
- Reference code with workspace-relative paths (e.g. `src/contentScript/index.ts`).
- Call out defaults and limitations explicitly.
- Prefer Mermaid diagrams for flows or sequences.

## Ownership

Primary owner: _TBD_. Contact: _TBD_. Update this section once a maintainer is assigned.
