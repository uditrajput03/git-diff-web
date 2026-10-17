# Git Diff Web

Fast, privacy-first, in-browser code and text diff comparison tool. Compare code snippets, configuration files, JSON, or documents using either a native VS Code Monaco diff editor or a GitHub-style PR diff view.

Runs 100% locally in your browser — zero code or text is transmitted to any server.

**Live Demo:** [https://uditrajput03.github.io/git-diff-web/](https://uditrajput03.github.io/git-diff-web/)

---

## Features

- **Dual Diff Engines**
  - **VS Code Monaco Editor**: High-fidelity diffing with syntax highlighting, inline minimap, and VS Code editing features.
  - **GitHub-Style Diff**: Clean, lightweight diff table modeled after GitHub pull request reviews.
- **Split & Unified Modes**
  - Side-by-side split view with synchronized scrolling.
  - Single-column unified view matching terminal `git diff` output.
- **Intra-Line Granularity**
  - **Word**: Highlights modified tokens within changed lines.
  - **Character**: Identifies exact character-level differences (ideal for hashes, secrets, and typos).
  - **Line**: Standard block-level line comparisons.
- **Diff Controls**
  - Ignore whitespace (leading/trailing).
  - Ignore case sensitivity.
  - Fold unchanged lines to focus only on modified hunks.
  - Toggle word wrap.
- **In-Diff Search & Hunk Navigation**
  - Search terms across differences with match cycling (`Ctrl/Cmd + F`, `Enter` / `Shift + Enter`).
  - Jump directly between diff hunks with `F7` / `Shift + F7`.
- **Git Patch Export**
  - Copy standard unified diff patch directly to clipboard.
  - Export RFC-compliant `.patch` file compatible with `git apply`.
- **Developer Convenience**
  - Drag-and-drop file upload onto original/modified panes.
  - One-click swap inputs.
  - Built-in sample datasets (TypeScript, JSON, Python, Rust, Go, SQL, Markdown).
  - Dark and Light themes.
  - Real-time diff metrics (additions, deletions, modifications, unchanged lines).

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>F</kbd> | Focus in-diff search bar |
| <kbd>Enter</kbd> / <kbd>Shift</kbd> + <kbd>Enter</kbd> | Next / previous search match (in search bar) |
| <kbd>F7</kbd> / <kbd>Shift</kbd> + <kbd>F7</kbd> | Jump to next / previous diff hunk |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> | Swap Original and Modified contents |
| <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>V</kbd> | Toggle Split / Unified view |

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 8](https://vite.dev/)
- **Diff Engines**: [Monaco Editor](https://github.com/suren-atoyan/monaco-react) & [jsdiff](https://github.com/kpdecker/jsdiff)
- **UI Components**: [Ant Design 6](https://ant.design/) & [Lucide Icons](https://lucide.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/uditrajput03/git-diff-web.git
cd git-diff-web
npm install --legacy-peer-deps
```

### Development

Start the local Vite development server:

```bash
npm run dev
```

### Build

Compile TypeScript and generate production assets in `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run Oxlint:

```bash
npm run lint
```

---

## Deployment

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/static.yml`) that automatically builds and deploys changes on push to the `main` branch.

### Cloudflare Pages

Configured via `wrangler.jsonc`:

```bash
npm run build
npx wrangler pages deploy dist
```

---

## Privacy

Git Diff Web processes all diff calculations, tokenization, and rendering entirely within your browser runtime. No text, source code, or telemetry is sent to any external server.

---

## License

MIT
