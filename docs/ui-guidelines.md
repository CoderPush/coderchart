# UI Guidelines

## Inline Diagram Container

- Present diagrams directly beneath the source code block using a rounded container that mirrors host spacing.
- Header displays "Mermaid diagram" with a compact toolbar aligned to the right.
- Respect page theme changes: detect dark mode via root class or `prefers-color-scheme` and update backgrounds/borders accordingly.
- Keep collapse/expand state intuitive; show "Hide diagram" when expanded and "Show diagram" when collapsed.

## Toolbar Buttons

- Order actions: `Hide diagram`, `Scroll to code`, `Export` dropdown.
- Disable export actions until render succeeds to avoid empty files.
- Provide hover feedback with subtle background changes; use consistent sizes and border radii.
- Preserve the original label via `data-coderchart-label` so temporary text (e.g. "Preparing PNG…") can revert cleanly.
- Close the dropdown when users click elsewhere or trigger an action so focus returns predictably.

## Options Page

- Anchor primary controls (auto-render toggle) at the top of the form with descriptive copy.
- Patterns list supports inline editing; include remove buttons with accessible labels.
- Prevent duplicate or empty patterns; disable the "Add pattern" button until input is valid.
- Show save status feedback (`Saving…`, `Settings saved`, error) near the form footer.
- Include a "Reset to defaults" button for quick recovery.

## Accessibility Considerations

- Buttons and interactive elements use semantic `<button>`/`<input>` elements for screen-reader compatibility.
- Contrast ratios aim to exceed WCAG AA by using muted backgrounds with solid borders and high-contrast text.
- Scroll-to-code uses `scrollIntoView({ behavior: 'smooth', block: 'center' })` to avoid disorienting jumps.
- Error notices provide text explanations and suggestions (`Check the Mermaid syntax and try again`).
- Ensure focus outlines remain visible; do not disable browser outlines via CSS.

## Future Enhancements

- Add keyboard shortcuts for toggling diagrams or triggering exports.
- Offer user-selectable themes or high-contrast mode overrides.
- Surface toast confirmations after downloads to improve feedback.
