import type { Plugin } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, posix } from 'node:path'
import { globSync } from 'tinyglobby'

export interface VfsManifestEntry {
  /** VFS path, e.g. '/posts/2016/04/11-building-a-blog.md' */
  path: string
  /** URL-friendly slug, e.g. 'building-a-blog' */
  slug: string
  /** File extension, e.g. '.md', '.png' */
  extension: string
  meta: {
    title: string
    date: string
    tags: string[]
    excerpt: string
    wordCount: number
  }
}

interface VfsManifestOptions {
  /** Glob pattern for markdown files, e.g. 'posts/**\/*.md' */
  pattern: string
  /** Glob pattern for sidecar metadata files, e.g. 'posts/**\/.*.meta.yaml' */
  sidecarPattern?: string
}

export default function vfsManifest(options: VfsManifestOptions): Plugin {
  const virtualModuleId = 'virtual:vfs-manifest'
  const resolvedId = '\0' + virtualModuleId

  return {
    name: 'vfs-manifest',

    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },

    load(id) {
      if (id !== resolvedId) return

      const root = process.cwd()
      const entries: VfsManifestEntry[] = []

      // --- Markdown files (frontmatter metadata) ---
      const files = globSync(options.pattern, { cwd: root })

      for (const file of files) {
        const abs = resolve(root, file)
        const content = readFileSync(abs, 'utf-8')
        const meta = extractFrontmatter(content)

        const vfsPath = '/' + file.split('\\').join('/')
        const filename = posix.basename(vfsPath)
        const ext = posix.extname(filename)
        const slug = filename.replace(/^\d+-/, '').replace(ext, '')

        const { year, month, day } = deriveDateFromPath(vfsPath, filename)
        const fileDate = `${year}-${month}-${day}`

        // Count words in markdown body (after frontmatter)
        const bodyStart = content.indexOf('---', 3)
        const body = bodyStart !== -1 ? content.slice(bodyStart + 3).trim() : ''
        const wordCount = body.split(/\s+/).filter(Boolean).length

        entries.push({
          path: vfsPath,
          slug,
          extension: ext,
          meta: {
            title: meta.title || '',
            date: meta.date || fileDate,
            tags: meta.tags || [],
            excerpt: meta.excerpt || '',
            wordCount,
          },
        })
      }

      // --- Sidecar metadata files (for non-markdown content) ---
      if (options.sidecarPattern) {
        const sidecars = globSync(options.sidecarPattern, {
          cwd: root,
          dot: true,
        })

        for (const sidecar of sidecars) {
          // .15-my-photo.png.meta.yaml → 15-my-photo.png
          const dir = posix.dirname(sidecar)
          const base = posix.basename(sidecar)
          const contentFilename = base.slice(1, -'.meta.yaml'.length)
          const contentPath = posix.join(dir, contentFilename)

          // Skip orphan sidecars (no matching content file)
          const abs = resolve(root, contentPath)
          if (!existsSync(abs)) continue

          const sidecarAbs = resolve(root, sidecar)
          const raw = readFileSync(sidecarAbs, 'utf-8')
          const meta = parseSidecar(raw)

          const vfsPath = '/' + contentPath.split('\\').join('/')
          const ext = posix.extname(contentFilename)
          const slug = contentFilename.replace(/^\d+-/, '').replace(ext, '')

          const { year, month, day } = deriveDateFromPath(
            vfsPath,
            contentFilename,
          )
          const fileDate = `${year}-${month}-${day}`

          entries.push({
            path: vfsPath,
            slug,
            extension: ext,
            meta: {
              title: meta.title || '',
              date: meta.date || fileDate,
              tags: meta.tags || [],
              excerpt: meta.excerpt || '',
              wordCount: 0,
            },
          })
        }
      }

      return `export default ${JSON.stringify(entries)}`
    },
  }
}

/** Derive year/month/day from VFS path structure: /posts/YYYY/MM/DD-slug.ext */
function deriveDateFromPath(
  vfsPath: string,
  filename: string,
): { year: string; month: string; day: string } {
  const parts = vfsPath.split('/')
  return {
    year: parts[parts.length - 3],
    month: parts[parts.length - 2],
    day: filename.split('-')[0],
  }
}

/** Parse a sidecar YAML file (no --- delimiters, just key: value pairs) */
function parseSidecar(raw: string): {
  title: string
  date: string
  tags: string[]
  excerpt: string
} {
  return parseYamlSubset(raw.split('\n'))
}

/** Extract only frontmatter metadata — does not parse the markdown body */
function extractFrontmatter(raw: string): {
  title: string
  date: string
  tags: string[]
  excerpt: string
} {
  const empty = { title: '', date: '', tags: [] as string[], excerpt: '' }
  const lines = raw.split('\n')
  if (lines[0].trim() !== '---') return empty

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) return empty

  return parseYamlSubset(lines.slice(1, endIndex))
}

/** Shared YAML subset parser for frontmatter and sidecar files */
function parseYamlSubset(lines: string[]): {
  title: string
  date: string
  tags: string[]
  excerpt: string
} {
  const strings: Record<string, string> = {}
  const arrays: Record<string, string[]> = {}
  let currentKey: string | null = null
  let currentArray: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('-')) {
      currentArray.push(trimmed.slice(1).trim())
      continue
    }

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex !== -1) {
      if (currentKey && currentArray.length > 0) {
        arrays[currentKey] = currentArray
        currentArray = []
      }
      const key = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()
      currentKey = key
      if (value) {
        strings[key] = value
        currentKey = null
      }
    }
  }

  if (currentKey && currentArray.length > 0) {
    arrays[currentKey] = currentArray
  }

  return {
    title: strings.title || '',
    date: strings.date || '',
    tags: arrays.tags || [],
    excerpt: strings.excerpt || '',
  }
}
