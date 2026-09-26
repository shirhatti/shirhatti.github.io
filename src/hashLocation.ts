// Minimal hash-based routing. The app only needs to read the initial path
// (to open deep-linked overlays) and push new paths, so a full router
// library is unnecessary weight on the critical path.

/** Current path from the URL hash, e.g. '#/post/foo?x=1' -> '/post/foo' */
export function getHashPath(): string {
  const path = window.location.hash.slice(1).split(/[?#]/)[0]
  return path.startsWith('/') ? path : '/' + path
}

/** Push a new path onto the history via the URL hash. */
export function navigate(path: string): void {
  window.location.hash = path
}
