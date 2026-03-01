import manifest from 'virtual:vfs-manifest'
import type { VfsManifestEntry } from '../vite-plugin-vfs-manifest'
import { parseFrontMatter } from './utils/frontmatter'
import type { Post } from './data/types'

// Lazy content loaders — content is fetched only on readFile()
const contentLoaders = import.meta.glob('/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: false,
})

// Image URLs — small strings, fine to load eagerly
const imageFiles = import.meta.glob('/posts/**/*.{png,jpg,jpeg,gif,webp,svg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface FsNode {
  name: string
  type: 'file' | 'dir'
  children: Map<string, FsNode>
  entry?: VfsManifestEntry
}

export const HOME = '/home/visitor'

function mkdirp(root: FsNode, path: string): FsNode {
  const parts = path.split('/').filter(Boolean)
  let node = root
  for (const part of parts) {
    let child = node.children.get(part)
    if (!child) {
      child = { name: part, type: 'dir', children: new Map() }
      node.children.set(part, child)
    }
    node = child
  }
  return node
}

function buildTree(): FsNode {
  const root: FsNode = { name: '', type: 'dir', children: new Map() }

  // Create home directory
  mkdirp(root, HOME)

  // Mount each manifest entry under ~/posts/...
  for (const entry of manifest) {
    // entry.path = '/posts/2016/04/11-building-a-blog.md'
    // mount at /home/visitor/posts/2016/04/11-building-a-blog.md
    const vfsPath = HOME + entry.path
    const parts = vfsPath.split('/').filter(Boolean)
    const filename = parts.pop()!
    const dir = mkdirp(root, '/' + parts.join('/'))
    dir.children.set(filename, {
      name: filename,
      type: 'file',
      children: new Map(),
      entry,
    })
  }

  return root
}

const root = buildTree()

/** Resolve a path relative to cwd. Handles ~, ., .., absolute paths. */
export function resolve(cwd: string, path: string): string {
  // ~ expands to home
  if (path === '~') return HOME
  if (path.startsWith('~/')) {
    path = HOME + path.slice(1)
  }

  // Make absolute
  if (!path.startsWith('/')) {
    path = cwd + '/' + path
  }

  // Normalize: resolve . and .., collapse multiple slashes
  const parts = path.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      stack.pop()
    } else {
      stack.push(part)
    }
  }

  return '/' + stack.join('/')
}

/** Get the node at an absolute path. */
export function stat(path: string): FsNode | null {
  if (path === '/') return root
  const parts = path.split('/').filter(Boolean)
  let node = root
  for (const part of parts) {
    const child = node.children.get(part)
    if (!child) return null
    node = child
  }
  return node
}

/** List directory entries. Returns empty array if path is not a directory. */
export function readdir(path: string): FsNode[] {
  const node = stat(path)
  if (!node || node.type !== 'dir') return []
  return Array.from(node.children.values())
}

/**
 * Load file content lazily and return a Post object.
 * Returns null if the path is not a file or has no content loader.
 */
export async function readFile(path: string): Promise<Post | null> {
  const node = stat(path)
  if (!node || node.type !== 'file' || !node.entry) return null

  const loader = contentLoaders[node.entry.path]
  if (!loader) return null

  const raw = (await loader()) as string
  const { content: markdown } = parseFrontMatter(raw)

  const terminalContent = markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\r\n')
    .trim()

  // Collect images for this post
  const { slug, meta } = node.entry
  const parts = node.entry.path.split('/')
  const year = parts[parts.length - 3]
  const month = parts[parts.length - 2]
  const imgDir = `/posts/${year}/${month}/${slug}/`
  const images: Record<string, string> = {}
  for (const [imgPath, imgUrl] of Object.entries(imageFiles)) {
    if (imgPath.startsWith(imgDir)) {
      images[imgPath.split('/').pop()!] = imgUrl
    }
  }

  return {
    slug,
    title: meta.title,
    date: meta.date,
    tags: meta.tags,
    excerpt: meta.excerpt,
    content: terminalContent,
    images,
  }
}

/** Find a manifest entry by slug (for overlay deep-link resolution). */
export function findBySlug(slug: string): VfsManifestEntry | undefined {
  return manifest.find((e) => e.slug === slug)
}

/** All manifest entries sorted by date descending (for welcome banner, etc). */
export function allEntries(): VfsManifestEntry[] {
  return [...manifest].sort(
    (a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime(),
  )
}

/**
 * Shorten an absolute path for display in the prompt.
 * Replaces /home/visitor with ~.
 */
export function displayPath(path: string): string {
  if (path === HOME) return '~'
  if (path.startsWith(HOME + '/')) return '~' + path.slice(HOME.length)
  return path
}
