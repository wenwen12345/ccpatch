# Repository Guidelines

## Project Structure & Module Organization
- `index.js` — CLI entry (bin: `ccpatch`); applies AST patches.
- `lib/` — helpers: `config.js` (reads/writes `~/.ccpatch/config.json`), `interactive.js` (interactive config UI).
- `patches/` — patch modules (e.g., `validationPatch.js`, `contextLowPatch.js`, `escInterruptPatch.js`).
- `package.json` — ESM (`"type": "module"`), Babel deps; `tsconfig.json` — strict type‑check (no emit);
  `bun.lock` indicates Bun usage. `README.md` — usage notes.

## Build, Test, and Development Commands
- Help: `node index.js --help`
- Configure patches: `node index.js config`
- Apply to a file: `node index.js path/to/file.js` (defaults to `cli.js`)
- Bun equivalents: `bun index.js ...`, `bun index.js config`
- Type‑check (peer dep): `npx tsc --noEmit` or `bun x tsc --noEmit`

## Coding Style & Naming Conventions
- JavaScript (ESM) with 2‑space indentation and semicolons.
- Descriptive `lowerCamelCase` for variables/functions; patch files named like `<feature>Patch.js`.
- Keep imports explicit with `.js` extensions; avoid reformatting unrelated code.
- Follow the existing quote style within each file.

## Testing Guidelines
- No tests yet. If adding tests, prefer:
  - Node: `node --test`
  - Bun: `bun test`
- Place tests under `tests/` with `*.test.js` naming. Keep fast, deterministic, and focused.

## Commit & Pull Request Guidelines
- Commit style follows Conventional Commits (seen in history: `feat`, `fix`, `docs`; optional scope).
  - Example: `feat(patches): add throttlePatch to limit AST rewrites`
- PRs must include: clear description, linked issues, reproduction steps, and before/after output
  (e.g., command used: `node index.js file.js`). Keep PRs small and focused.

## Security & Configuration Tips
- User config lives at `~/.ccpatch/config.json`. Never commit personal configs or secrets.
- Patch logic must be idempotent and defensive: exit cleanly when no match is found; avoid broad AST rewrites.

## Agent‑Specific Instructions
- Adding a patch:
  - Create `patches/<Name>Patch.js` exporting `patchASTWith<Name>`.
  - Register it in `lib/config.js#getAvailablePatches` with a concise description.
  - Keep logs minimal and actionable; avoid new deps without discussion.

