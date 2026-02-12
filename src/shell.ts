/**
 * Shell layer — sits between raw terminal input and command handlers.
 *
 * A real shell resolves paths, expands globs, and handles quoting. We don't
 * need a filesystem abstraction because every "file" in this terminal is just
 * a post slug. This module normalises path-like arguments into slugs so that
 * `less ./welcome`, `less posts/welcome.md`, and `less welcome` all resolve
 * the same way.
 */

/**
 * Normalise a single argument that looks like a file path into a bare slug.
 *
 * Handles patterns a visitor might plausibly type:
 *   ./foo          → foo       (current-directory prefix)
 *   ~/foo          → foo       (home prefix)
 *   /foo           → foo       (absolute prefix)
 *   posts/foo      → foo       (directory component)
 *   foo.md         → foo       (.md extension)
 *   01-foo         → foo       (date-prefix in filename, matches post slug derivation)
 *   ./posts/2025/01/01-foo.md  → foo   (full path)
 *
 * Flags (args starting with `-`) are returned unchanged.
 * Key=value args (like --sort=date) are returned unchanged.
 */
export function normalizeArg(arg: string): string {
  // Don't touch flags or key=value options
  if (arg.startsWith('-')) return arg

  let result = arg

  // Strip leading ./ ~/ or /
  result = result.replace(/^(?:\.\/|~\/|\/)/, '')

  // Take the basename (last component after /)
  const lastSlash = result.lastIndexOf('/')
  if (lastSlash !== -1) {
    result = result.substring(lastSlash + 1)
  }

  // Strip .md extension
  if (result.endsWith('.md')) {
    result = result.slice(0, -3)
  }

  // Strip leading date prefix (e.g. "01-" from "01-welcome")
  // Matches the slug derivation in src/data/posts.ts: filename.replace(/^\d+-/, '')
  result = result.replace(/^\d+-/, '')

  return result
}

/**
 * Preprocess an argument list through the shell layer.
 * Non-flag arguments are normalised; flags pass through untouched.
 */
export function preprocessArgs(args: string[]): string[] {
  return args.map(normalizeArg)
}
