import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve, posix } from 'node:path'
import { globSync } from 'tinyglobby'

export interface VfsManifestEntry {
  /** VFS path, e.g. '/posts/2016/04/11-building-a-blog.md' */
  path: string
  /** URL-friendly slug, e.g. 'building-a-blog' */
  slug: string
  meta: {
    title: string
    date: string
    tags: string[]
    excerpt: string
    wordCount: number
  }
}

interface VfsManifestOptions {
  /** Glob pattern for files to include, e.g. 'posts/**\/*.md' */
  pattern: string
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
      const files = globSync(options.pattern, { cwd: root })

      const entries: VfsManifestEntry[] = files.map((file) => {
        const abs = resolve(root, file)
        const content = readFileSync(abs, 'utf-8')
        const meta = extractFrontmatter(content)

        // Build VFS path: /posts/2016/04/11-building-a-blog.md
        const vfsPath = '/' + file.split('\\').join('/')

        // Derive slug from filename: 11-building-a-blog.md → building-a-blog
        const filename = posix.basename(vfsPath)
        const slug = filename.replace(/^\d+-/, '').replace(/\.md$/, '')

        // Derive date from path structure: /posts/YYYY/MM/DD-slug.md
        const parts = vfsPath.split('/')
        const year = parts[parts.length - 3]
        const month = parts[parts.length - 2]
        const day = filename.split('-')[0]
        const fileDate = `${year}-${month}-${day}`

        // Count words in markdown body (after frontmatter)
        const bodyStart = content.indexOf('---', 3)
        const body = bodyStart !== -1 ? content.slice(bodyStart + 3).trim() : ''
        const wordCount = body.split(/\s+/).filter(Boolean).length

        return {
          path: vfsPath,
          slug,
          meta: {
            title: meta.title || '',
            date: meta.date || fileDate,
            tags: meta.tags || [],
            excerpt: meta.excerpt || '',
            wordCount,
          },
        }
      })

      return `export default ${JSON.stringify(entries)}`
    },
  }
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

  const strings: Record<string, string> = {}
  const arrays: Record<string, string[]> = {}
  let currentKey: string | null = null
  let currentArray: string[] = []

  for (const line of lines.slice(1, endIndex)) {
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
