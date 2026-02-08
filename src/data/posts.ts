import { parseFrontMatter } from '../utils/frontmatter'
import type { Post } from './types'

// Import all markdown files from posts directory
const postFiles = import.meta.glob('/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Import all image files from posts directory
const imageFiles = import.meta.glob('/posts/**/*.{png,jpg,jpeg,gif,webp,svg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const posts: Post[] = Object.entries(postFiles)
  .map(([filepath, content]) => {
    // Parse frontmatter and content
    const { data: frontmatter, content: markdown } = parseFrontMatter(
      content as string,
    )

    // Extract slug from filepath
    // e.g., /posts/2025/01/01-welcome.md -> 01-welcome -> welcome
    const filename = filepath.split('/').pop() || ''
    const slug = filename.replace(/^\d+-/, '').replace(/\.md$/, '')

    // Extract date from filepath if not in frontmatter
    // e.g., /posts/2025/01/01-welcome.md -> 2025-01-01
    const pathParts = filepath.split('/')
    const year = pathParts[pathParts.length - 3]
    const month = pathParts[pathParts.length - 2]
    const day = filename.split('-')[0]
    const fileDate = `${year}-${month}-${day}`

    // Build images map for this post's slug directory
    // e.g., /posts/2016/04/building-a-blog/freesslcerts.png → { "freesslcerts.png": "/resolved/url" }
    const slugDir = `/posts/${year}/${month}/${slug}/`
    const images: Record<string, string> = {}
    for (const [imgPath, imgUrl] of Object.entries(imageFiles)) {
      if (imgPath.startsWith(slugDir)) {
        const imgFilename = imgPath.split('/').pop()!
        images[imgFilename] = imgUrl
      }
    }

    // Convert markdown content to terminal format (keep line breaks)
    const terminalContent = markdown
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\r\n')
      .trim()

    return {
      slug,
      title: frontmatter.title,
      date: frontmatter.date || fileDate,
      tags: frontmatter.tags || [],
      excerpt: frontmatter.excerpt || '',
      content: terminalContent,
      images,
    }
  })
  .sort((a, b) => {
    // Sort by date descending (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
