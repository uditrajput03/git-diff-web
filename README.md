# Git Diff Web

Fast, privacy-first in-browser text and code diff tool. Compare code snippets, configuration files, or text using either a native VS Code Monaco diff editor or a GitHub-style split/unified review view.

All comparison and tokenization runs 100% locally in your browser. No code or text leaves your machine.

**Live Site:** [https://git-diff.pages.dev](https://git-diff.pages.dev)

---

## What It Does

- **Two Comparison Views**
  - **VS Code Monaco**: Side-by-side editor with syntax highlighting, inline minimap, and editor features.
  - **GitHub-Style**: Clean diff view identical to pull request code reviews.
- **Granular Diffing**: Switch between Word (token-level), Character (for typos, hashes, and secrets), or Line diffing.
- **Split & Unified Modes**: View changes side-by-side or combined into a single unified stream.
- **Hunk Navigation & Search**: Cycle through differences with `F7` / `Shift+F7` and search within the diff with `Ctrl/Cmd+F`.
- **Git Patch Export**: Copy a standard unified patch or download an RFC-compliant `.patch` file ready for `git apply`.
- **Display Controls**: Ignore leading/trailing whitespace, ignore case, fold unchanged context, and toggle word wrap.
- **Zero Friction**: Drag-and-drop file upload, one-click input swapping, and built-in code samples.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>F</kbd> | Search in diff |
| <kbd>Enter</kbd> / <kbd>Shift</kbd> + <kbd>Enter</kbd> | Next / previous search match |
| <kbd>F7</kbd> / <kbd>Shift</kbd> + <kbd>F7</kbd> | Next / previous diff hunk |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> | Swap Original and Modified panes |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>V</kbd> | Toggle Split / Unified view |

---

## Local Development

```bash
git clone https://github.com/uditrajput03/git-diff-web.git
cd git-diff-web
npm install --legacy-peer-deps
npm run dev
```

To build for production:

```bash
npm run build
```

---

## License

MIT
