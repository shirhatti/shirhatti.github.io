import { lazy, type ComponentType } from 'react'
import type { VfsManifestEntry } from '../../vite-plugin-vfs-manifest'
import { pager } from './pager'

export interface OverlayProps {
  onClose: () => void
  [key: string]: unknown
}

export interface OverlayState {
  name: string
  props: Record<string, unknown>
}

export interface OverlayEntry {
  route: string
  command: string
  extensions?: string[]
  loader: () => Promise<{ default: ComponentType<OverlayProps> }>
  resolve: (params: Record<string, string>) => {
    loadProps: () => Promise<Record<string, unknown> | null>
    displayArg: string
  } | null
}

const overlays: Record<string, OverlayEntry> = {
  pager,
}

export const overlayRoutes = Object.values(overlays).map((o) => o.route)

/** Return an overlay path for a manifest entry, or null if no overlay handles it. */
export function entryOverlayPath(entry: VfsManifestEntry): string | null {
  const ext = entry.path.slice(entry.path.lastIndexOf('.'))
  for (const [name, o] of Object.entries(overlays)) {
    if (o.extensions?.includes(ext))
      return overlayPath(name, { slug: entry.slug })
  }
  return null
}

export function overlayPath(
  name: string,
  params: Record<string, string>,
): string {
  const entry = overlays[name]
  if (!entry) return '/'
  return entry.route.replace(/:(\w+)/g, (_, key) => params[key] ?? '')
}

export interface OverlayMatch {
  name: string
  command: string
  displayArg: string
  loadProps: () => Promise<Record<string, unknown> | null>
}

export function matchOverlayRoute(pathname: string): OverlayMatch | null {
  for (const [name, entry] of Object.entries(overlays)) {
    const params = matchRoute(entry.route, pathname)
    if (!params) continue
    const resolved = entry.resolve(params)
    if (!resolved) continue
    return {
      name,
      command: entry.command,
      displayArg: resolved.displayArg,
      loadProps: resolved.loadProps,
    }
  }
  return null
}

function matchRoute(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

const cache = new Map<
  string,
  React.LazyExoticComponent<ComponentType<OverlayProps>>
>()

export function getOverlayComponent(name: string) {
  if (cache.has(name)) return cache.get(name)!
  const entry = overlays[name]
  if (!entry) return null
  const component = lazy(entry.loader)
  cache.set(name, component)
  return component
}
