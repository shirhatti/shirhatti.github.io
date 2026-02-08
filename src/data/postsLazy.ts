import { parseFrontMatter } from '../utils/frontmatter'
import type { Post } from './types'

// Import only metadata eagerly, content lazily
const postFiles = import.meta.glob('/posts/**/*.md', {
  query: '?raw',
  import: 'default',
})

interface PostMetadata {
  slug: string
  title: string
  date: string
  tags: string[]
  excerpt: string
  filepath: string
}

// Cache for loaded post content
const contentCache = new Map<string, string>()

// Extract metadata without loading full content
function extractMetadata(): PostMetadata[] {
  return Object.keys(postFiles).map((filepath) => {
    const filename = filepath.split('/').pop() || ''
    const slug = filename.replace(/^\d+-/, '').replace(/\.md$/, '')

    const pathParts = filepath.split('/')
    const year = pathParts[pathParts.length - 3]
    const month = pathParts[pathParts.length - 2]
    const day = filename.split('-')[0]
    const fileDate = `${year}-${month}-${day}`

    return {
      slug,
      title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      date: fileDate,
      tags: [],
      excerpt: '',
      filepath,
    }
  })
}

const metadata = extractMetadata()

// Lazy load post content when needed
export async function loadPostContent(slug: string): Promise<Post | null> {
  const meta = metadata.find(m => m.slug === slug)
  if (!meta) return null

  // Check cache first
  if (contentCache.has(slug)) {
    return createPost(meta, contentCache.get(slug)!)
  }

  try {
    const loader = postFiles[meta.filepath]
    const content = await loader() as string
    contentCache.set(slug, content)
    return createPost(meta, content)
  } catch (error) {
    console.error(`Failed to load post ${slug}:`, error)
    return null
  }
}

function createPost(meta: PostMetadata, rawContent: string): Post {
  const { data: frontmatter, content: markdown } = parseFrontMatter(rawContent)

  const terminalContent = markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\r\n')
    .trim()

  return {
    slug: meta.slug,
    title: frontmatter.title || meta.title,
    date: frontmatter.date || meta.date,
    tags: frontmatter.tags || [],
    excerpt: frontmatter.excerpt || '',
    content: terminalContent,
    images: {},
  }
}

// Export lightweight post list (without content)
export const postsMetadata: Omit<Post, 'content'>[] = metadata.map(meta => ({
  slug: meta.slug,
  title: meta.title,
  date: meta.date,
  tags: meta.tags,
  excerpt: meta.excerpt,
  images: {},
})).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

// For backward compatibility, load all posts eagerly on first access
let allPostsCache: Post[] | null = null

export async function getAllPosts(): Promise<Post[]> {
  if (allPostsCache) return allPostsCache

  const posts = await Promise.all(
    metadata.map(meta => loadPostContent(meta.slug))
  )

  allPostsCache = posts
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return allPostsCache
}
