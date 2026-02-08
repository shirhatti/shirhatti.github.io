import { ansi } from './ansi'
import type { Post } from '../data/types'

const BOX_CHARS = {
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
} as const

export interface TagInfo {
  name: string
  count: number
  posts: Post[]
}

/**
 * Get category color for a tag based on common patterns
 */
function getTagColor(tag: string): string {
  const tagLower = tag.toLowerCase()

  // Programming/development related
  if (
    ['programming', 'webdev', 'react', 'typescript', 'javascript', 'python',
     'go', 'rust', 'java', 'code', 'development'].includes(tagLower)
  ) {
    return ansi.brightGreen
  }

  // Tools/productivity
  if (
    ['vim', 'git', 'terminal', 'cli', 'shell', 'bash', 'zsh', 'tmux',
     'productivity', 'workflow', 'tools'].includes(tagLower)
  ) {
    return ansi.brightMagenta
  }

  // Meta/blog related
  if (
    ['meta', 'intro', 'about', 'announcement', 'update'].includes(tagLower)
  ) {
    return ansi.brightBlue
  }

  // Tutorials/guides
  if (
    ['tutorial', 'guide', 'howto', 'tips', 'tricks', 'learn'].includes(tagLower)
  ) {
    return ansi.brightYellow
  }

  // Default
  return ansi.brightCyan
}

/**
 * Get emoji/symbol for a tag category
 */
function getTagSymbol(tag: string): string {
  const tagLower = tag.toLowerCase()

  if (
    ['programming', 'webdev', 'react', 'typescript', 'javascript', 'python',
     'go', 'rust', 'java', 'code', 'development'].includes(tagLower)
  ) {
    return '⚡'
  }

  if (
    ['vim', 'git', 'terminal', 'cli', 'shell', 'bash', 'zsh', 'tmux',
     'productivity', 'workflow', 'tools'].includes(tagLower)
  ) {
    return '🔧'
  }

  if (
    ['meta', 'intro', 'about', 'announcement', 'update'].includes(tagLower)
  ) {
    return '📝'
  }

  if (
    ['tutorial', 'guide', 'howto', 'tips', 'tricks', 'learn'].includes(tagLower)
  ) {
    return '📚'
  }

  return '🏷️'
}

/**
 * Extract all tags from posts and compute statistics
 */
export function extractTags(posts: Post[]): TagInfo[] {
  const tagMap = new Map<string, Post[]>()

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, [])
      }
      tagMap.get(tag)!.push(post)
    })
  })

  const tags: TagInfo[] = Array.from(tagMap.entries()).map(([name, posts]) => ({
    name,
    count: posts.length,
    posts,
  }))

  // Sort by popularity (count descending), then alphabetically
  tags.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }
    return a.name.localeCompare(b.name)
  })

  return tags
}

/**
 * Find tags that commonly appear together with the given tag
 */
export function findRelatedTags(tagName: string, posts: Post[], limit = 5): string[] {
  const relatedTagCounts = new Map<string, number>()

  posts.forEach((post) => {
    if (post.tags.includes(tagName)) {
      post.tags.forEach((tag) => {
        if (tag !== tagName) {
          relatedTagCounts.set(tag, (relatedTagCounts.get(tag) || 0) + 1)
        }
      })
    }
  })

  return Array.from(relatedTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag)
}

/**
 * Format all tags in a beautiful grid
 */
export function formatTagsOverview(tags: TagInfo[]): string {
  const output: string[] = []

  output.push('')
  output.push(`${ansi.bold}${ansi.brightCyan}All Tags${ansi.reset} ${ansi.dim}(sorted by popularity)${ansi.reset}`)
  output.push('')

  // Create a nice box header
  const headerLine = `${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`
  output.push(headerLine)

  // Display tags in a grid-like format
  tags.forEach((tag, idx) => {
    const symbol = getTagSymbol(tag.name)
    const color = getTagColor(tag.name)
    const tagName = `${color}${tag.name}${ansi.reset}`
    const count = `${ansi.dim}(${tag.count})${ansi.reset}`

    output.push(`  ${symbol} ${tagName.padEnd(35)} ${count}`)

    if (idx < tags.length - 1) {
      output.push(`${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`)
    }
  })

  output.push(headerLine)
  output.push('')
  output.push(`${ansi.dim}Total: ${tags.length} tags, ${tags.reduce((sum, t) => sum + t.count, 0)} tagged posts${ansi.reset}`)
  output.push('')
  output.push(`${ansi.dim}Usage: tags <tagname> to see posts with a specific tag${ansi.reset}`)
  output.push('')

  return output.join('\r\n')
}

/**
 * Format posts for a specific tag in bat-style
 */
export function formatTagPosts(tagName: string, tagInfo: TagInfo, allPosts: Post[]): string {
  const output: string[] = []
  const symbol = getTagSymbol(tagName)
  const color = getTagColor(tagName)

  output.push('')
  output.push(
    `${ansi.bold}${ansi.brightCyan}Posts tagged with ${color}${symbol} ${tagName}${ansi.reset} ${ansi.dim}(${tagInfo.count} posts)${ansi.reset}`
  )
  output.push('')

  // Header line
  const headerLine = `${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`
  output.push(headerLine)

  // Sort posts by date (newest first)
  const sortedPosts = [...tagInfo.posts].sort((a, b) => b.date.localeCompare(a.date))

  sortedPosts.forEach((post, idx) => {
    const date = `${ansi.dim}${post.date}${ansi.reset}`
    const slug = `${ansi.brightGreen}${post.slug}${ansi.reset}`
    const title = `${ansi.brightWhite}${post.title}${ansi.reset}`

    // Show all tags, highlighting the current one
    const tags = post.tags
      .map((tag) => {
        if (tag === tagName) {
          const tagColor = getTagColor(tag)
          return `${tagColor}${ansi.bold}${tag}${ansi.reset}`
        }
        return `${ansi.dim}${tag}${ansi.reset}`
      })
      .join(', ')

    output.push(`  ${date}  ${slug}`)
    output.push(`  ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${title}`)
    output.push(`  ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.dim}${post.excerpt}${ansi.reset}`)
    output.push(`  ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${tags}`)

    if (idx < sortedPosts.length - 1) {
      output.push(`${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`)
    }
  })

  output.push(headerLine)

  // Show related tags
  const relatedTags = findRelatedTags(tagName, allPosts)
  if (relatedTags.length > 0) {
    output.push('')
    output.push(`${ansi.dim}Related tags: ${relatedTags.map(tag => {
      const tagColor = getTagColor(tag)
      return `${tagColor}${tag}${ansi.reset}`
    }).join(', ')}${ansi.reset}`)
  }

  output.push('')
  output.push(`${ansi.dim}Usage: cat <post-name> to read a post${ansi.reset}`)
  output.push('')

  return output.join('\r\n')
}
