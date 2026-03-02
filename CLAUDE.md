# CLAUDE.md

## Setup

```bash
nix develop     # provides bun, runs bun install automatically
```

Or without nix: install [bun](https://bun.sh/), then `bun install`.

## Commands

- `bun dev` — start dev server
- `bun run build` — typecheck (tsc) + production build (vite)
- `bun run lint` — eslint
- `bun run format` — prettier (write)
- `bun run format:check` — prettier (check only)
- `bunx vitest run` — unit tests
- `bunx playwright test` — e2e tests

## Project Structure

- `posts/YYYY/MM/DD-slug.md` — blog posts with YAML frontmatter
- `src/commands/registry.ts` — all terminal commands (help, cat, less, ls, whoami, stats, etc.)
- `src/commands/types.ts` — Command type definition
- `src/components/Terminal/Terminal.tsx` — xterm.js terminal, input handling, tab completion, welcome banner
- `src/overlays/index.ts` — overlay registry, route matching, lazy loading (infrastructure)
- `src/overlays/pager.ts` — pager overlay entry (route, resolver, component loader)
- `src/components/Pager/Pager.tsx` — HTML pager for `less` command
- `src/components/TerminalWindow/` — window chrome UI
- `src/utils/ansi.ts` — ANSI escape codes, formatLink, shared `identity` constant (header box + contact info)
- `src/utils/cat.ts` — bat-style post formatter with syntax highlighting, word wrap, grep output
- `src/utils/cat.test.ts` — unit tests for cat.ts (42 tests)
- `src/utils/stats.ts` — blog statistics calculations
- `src/utils/fuzzy.ts` — fuzzy matching for command/post suggestions
- `src/utils/frontmatter.ts` — YAML frontmatter parser
- `src/utils/image.ts` — iTerm2 inline image protocol support
- `src/data/posts.ts` — glob-imports posts from `posts/` directory

## Adding an Overlay

See [`src/overlays/README.md`](src/overlays/README.md).

## Key Patterns

- Use **bun** for everything (not npm/yarn)
- Single quotes, no semicolons, 2-space indent (enforced by prettier)
- ANSI escape codes use constants from `src/utils/ansi.ts` — never hardcode raw escapes outside that file
- Shared identity info (name, subtitle, contact links) lives in `identity` export from `ansi.ts`
- Pre-commit hook runs: whitespace check, conflict markers, large file check, lint, format check, build, tests
