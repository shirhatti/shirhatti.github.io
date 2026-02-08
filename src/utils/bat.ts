import { ansi, formatLink } from './ansi'
import type { Post } from '../data/types'

const BOX_CHARS = {
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  cross: '┼',
  teeLeft: '├',
  teeRight: '┤',
  teeTop: '┬',
  teeBottom: '┴',
} as const

interface BatOptions {
  showLineNumbers?: boolean
  showHeader?: boolean
  showGrid?: boolean
  startLine?: number
}

/**
 * Format a post in bat-style with line numbers, header, and syntax highlighting
 */
export function formatPostAsBat(
  post: Post,
  options: BatOptions = {}
): string {
  const {
    showLineNumbers = true,
    showHeader = true,
    showGrid = true,
    startLine = 1,
  } = options

  const lines = post.content.split('\r\n')
  const maxLineNum = startLine + lines.length - 1
  const lineNumWidth = String(maxLineNum).length
  const output: string[] = []

  // File header (bat-style)
  if (showHeader) {
    const headerLine = `${BOX_CHARS.horizontal.repeat(80)}`
    output.push('')
    output.push(`${ansi.dim}${headerLine}${ansi.reset}`)

    // File path and metadata
    const dateParts = post.date.split('-')
    const filePath = `File: posts/${dateParts[0]}/${dateParts[1]}/${dateParts[2]}-${post.slug}.md`
    const metadata = `${post.date} • ${post.tags.join(', ')}`
    output.push(
      `${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.bold}${ansi.brightCyan}${filePath}${ansi.reset}`
    )
    output.push(
      `${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.dim}${metadata}${ansi.reset}`
    )
    output.push(`${ansi.dim}${headerLine}${ansi.reset}`)
  }

  // Content with line numbers and syntax highlighting
  lines.forEach((line, idx) => {
    const lineNum = startLine + idx
    const formattedLine = highlightSyntax(line)

    if (showLineNumbers) {
      const lineNumStr = String(lineNum).padStart(lineNumWidth, ' ')
      const separator = showGrid ? BOX_CHARS.vertical : ' '
      output.push(
        `${ansi.dim}${lineNumStr}${ansi.reset} ${ansi.dim}${separator}${ansi.reset} ${formattedLine}`
      )
    } else {
      output.push(formattedLine)
    }
  })

  // Footer separator
  if (showHeader) {
    output.push(`${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`)
  }

  output.push('')
  return output.join('\r\n')
}

/**
 * Simple syntax highlighting for markdown-style content
 */
function highlightSyntax(line: string): string {
  // Pass through iTerm2 inline image sequences unchanged
  if (line.includes('\x1b]1337;File=')) return line

  // Headers (lines with all caps or = underneath, or starting with #)
  if (/^[A-Z][A-Z\s]+$/.test(line)) {
    return `${ansi.bold}${ansi.brightYellow}${line}${ansi.reset}`
  }

  if (/^={3,}$/.test(line) || /^-{3,}$/.test(line)) {
    return `${ansi.dim}${line}${ansi.reset}`
  }

  // Headers with # prefix
  if (/^#+\s/.test(line)) {
    return `${ansi.bold}${ansi.brightYellow}${line}${ansi.reset}`
  }

  // Command/code lines (indented with spaces, contain common shell/vim patterns)
  if (
    line.startsWith('  ') &&
    (line.includes('$') ||
      line.includes(':') ||
      line.includes('  -') ||
      /^\s+[a-z]+\s/.test(line))
  ) {
    return highlightCode(line)
  }

  // Bullet points
  if (/^\s*[*-]\s/.test(line)) {
    return line.replace(/^(\s*)([*-])(\s)/, (_, space, bullet, ws) => {
      return `${space}${ansi.brightCyan}${bullet}${ansi.reset}${ws}`
    })
  }

  // Numbered lists
  if (/^\s*\d+\.\s/.test(line)) {
    return line.replace(/^(\s*)(\d+)(\.)(\s)/, (_, space, num, dot, ws) => {
      return `${space}${ansi.brightCyan}${num}${dot}${ansi.reset}${ws}`
    })
  }

  // Inline code (backticks)
  if (line.includes('`')) {
    return line.replace(/`([^`]+)`/g, (_, code) => {
      return `${ansi.yellow}${code}${ansi.reset}`
    })
  }

  return line
}

/**
 * Highlight code snippets
 */
function highlightCode(line: string): string {
  let highlighted = line

  // Vim commands (:command)
  highlighted = highlighted.replace(
    /(:set|:ls|:b|:bd|\.\w+|'[a-z])/g,
    `${ansi.brightMagenta}$1${ansi.reset}`
  )

  // Shell commands and flags
  highlighted = highlighted.replace(
    /\b(cat|ls|cd|grep|git|npm|bun|vim?|curl)\b/g,
    `${ansi.brightGreen}$1${ansi.reset}`
  )

  // Flags and options
  highlighted = highlighted.replace(
    /(\s)(--?[a-z-]+)/g,
    `$1${ansi.brightBlue}$2${ansi.reset}`
  )

  // Numbers
  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    `${ansi.brightCyan}$1${ansi.reset}`
  )

  // Strings in quotes
  highlighted = highlighted.replace(
    /"([^"]*)"/g,
    `${ansi.yellow}"$1"${ansi.reset}`
  )

  // Comments (lines starting with #)
  if (highlighted.trim().startsWith('#')) {
    return `${ansi.dim}${highlighted}${ansi.reset}`
  }

  return highlighted
}

/**
 * Get tag category color for consistent color-coding
 */
function getTagColor(tag: string): string {
  const tagLower = tag.toLowerCase()

  // Meta/intro tags
  if (tagLower.includes('meta') || tagLower.includes('intro')) {
    return ansi.brightMagenta
  }

  // Programming/dev tags
  if (tagLower.includes('programming') || tagLower.includes('webdev') ||
      tagLower.includes('react') || tagLower.includes('code')) {
    return ansi.brightBlue
  }

  // Tools/productivity tags
  if (tagLower.includes('vim') || tagLower.includes('productivity') ||
      tagLower.includes('tools')) {
    return ansi.brightYellow
  }

  // Tutorial/guide tags
  if (tagLower.includes('tutorial') || tagLower.includes('guide') ||
      tagLower.includes('howto')) {
    return ansi.brightGreen
  }

  // Default
  return ansi.cyan
}

/**
 * Get icon/symbol for post based on tags
 */
function getPostIcon(post: Post): string {
  const tags = post.tags.map(t => t.toLowerCase())

  if (tags.some(t => t.includes('meta') || t.includes('intro'))) {
    return '📝'
  }
  if (tags.some(t => t.includes('programming') || t.includes('webdev') || t.includes('react'))) {
    return '💻'
  }
  if (tags.some(t => t.includes('vim') || t.includes('productivity'))) {
    return '⚡'
  }
  if (tags.some(t => t.includes('tutorial') || t.includes('guide'))) {
    return '📖'
  }

  return '📄'
}

/**
 * Format tags with color-coding
 */
function formatTags(tags: string[]): string {
  return tags.map(tag => {
    const color = getTagColor(tag)
    return `${color}${tag}${ansi.reset}`
  }).join(`${ansi.dim}, ${ansi.reset}`)
}

export interface LsOptions {
  longFormat?: boolean
  showAll?: boolean
  sortBy?: 'date' | 'title'
}

/**
 * Format ls output in bat-style grid with enhanced features
 */
export function formatLsOutput(posts: Post[], options: LsOptions = {}): string {
  const { longFormat = false, showAll = false, sortBy = 'date' } = options
  const output: string[] = []

  // Sort posts based on sortBy option
  let sortedPosts = [...posts]
  if (sortBy === 'title') {
    sortedPosts = sortedPosts.sort((a, b) => a.title.localeCompare(b.title))
  } else {
    // Already sorted by date in posts.ts, but re-sort to be explicit
    sortedPosts = sortedPosts.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  // Post count summary at the top
  output.push('')
  const countHeader = `${ansi.bold}${ansi.brightCyan}Posts: ${sortedPosts.length}${ansi.reset}`
  const sortInfo = sortBy === 'title'
    ? `${ansi.dim}(sorted by title)${ansi.reset}`
    : `${ansi.dim}(sorted by date)${ansi.reset}`
  output.push(`${countHeader} ${sortInfo}`)

  // Count by tag category
  const tagCounts = new Map<string, number>()
  sortedPosts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })

  if (tagCounts.size > 0) {
    const tagSummary = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => {
        const color = getTagColor(tag)
        return `${color}${tag}${ansi.reset}${ansi.dim}(${count})${ansi.reset}`
      })
      .join(`${ansi.dim}, ${ansi.reset}`)
    output.push(`${ansi.dim}Tags: ${ansi.reset}${tagSummary}`)
  }

  if (longFormat || showAll) {
    output.push('')
    const header = `${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`
    output.push(header)

    sortedPosts.forEach((post, idx) => {
      const icon = getPostIcon(post)
      const date = `${ansi.dim}${post.date}${ansi.reset}`
      const slugText = `${ansi.brightGreen}${post.slug.padEnd(25)}${ansi.reset}`
      const slug = formatLink(`#/post/${post.slug}`, slugText)
      const title = `${ansi.brightWhite}${post.title}${ansi.reset}`
      const tags = formatTags(post.tags)

      output.push(`${icon} ${date}  ${slug}  ${title}`)
      output.push(`${' '.repeat(4)}${ansi.dim}[${ansi.reset}${tags}${ansi.dim}]${ansi.reset}`)

      // Show all metadata if -a flag is used
      if (showAll) {
        if (post.excerpt) {
          output.push(`${' '.repeat(4)}${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.italic}${ansi.gray}${post.excerpt}${ansi.reset}`)
        }
        const wordCount = post.content.split(/\s+/).length
        const readTime = Math.ceil(wordCount / 200) // ~200 words per minute
        output.push(`${' '.repeat(4)}${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.dim}${wordCount} words • ~${readTime} min read${ansi.reset}`)
      }

      if (idx < sortedPosts.length - 1) {
        output.push(`${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`)
      }
    })

    output.push(header)
    output.push('')
  } else {
    output.push('')
    sortedPosts.forEach((post) => {
      const icon = getPostIcon(post)
      const date = `${ansi.dim}${post.date}${ansi.reset}`
      const slugText = `${ansi.brightGreen}${post.slug}${ansi.reset}`
      const slug = formatLink(`#/post/${post.slug}`, slugText)
      output.push(`  ${icon} ${date}  ${slug}`)
    })
    output.push('')
  }

  return output.join('\r\n')
}

/**
 * Format grep search results with context
 */
export interface GrepMatch {
  post: Post
  lineNum: number
  line: string
  contextBefore: string[]
  contextAfter: string[]
  matchIndex: number
  matchLength: number
}

export function formatGrepOutput(
  matches: GrepMatch[],
  _pattern: string,
  _caseInsensitive: boolean
): string {
  if (matches.length === 0) {
    return `\r\n${ansi.dim}No matches found${ansi.reset}\r\n`
  }

  const output: string[] = []
  let currentPost = ''

  matches.forEach((match, idx) => {
    const dateParts = match.post.date.split('-')
    const postPath = `posts/${dateParts[0]}/${dateParts[1]}/${dateParts[2]}-${match.post.slug}.md`

    // Show post header if it's a different post from the last match
    if (postPath !== currentPost) {
      if (currentPost !== '') {
        output.push('') // Empty line between different posts
      }
      currentPost = postPath
      output.push('')
      output.push(`${ansi.bold}${ansi.brightCyan}${postPath}${ansi.reset}`)
      output.push(`${ansi.dim}${BOX_CHARS.horizontal.repeat(80)}${ansi.reset}`)
    }

    const maxLineNum = match.lineNum + match.contextAfter.length
    const lineNumWidth = String(maxLineNum).length

    // Context before
    match.contextBefore.forEach((contextLine, i) => {
      const lineNum = match.lineNum - match.contextBefore.length + i
      const lineNumStr = String(lineNum).padStart(lineNumWidth, ' ')
      output.push(
        `${ansi.dim}${lineNumStr}${ansi.reset} ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${contextLine}`
      )
    })

    // Matched line with highlighting
    const lineNumStr = String(match.lineNum).padStart(lineNumWidth, ' ')
    const highlightedLine = highlightMatch(
      match.line,
      _pattern,
      match.matchIndex,
      match.matchLength
    )
    output.push(
      `${ansi.brightYellow}${lineNumStr}${ansi.reset} ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${highlightedLine}`
    )

    // Show match indicator
    const spacesBeforeMatch = ' '.repeat(match.matchIndex)
    const carets = '^'.repeat(match.matchLength)
    output.push(
      `${ansi.dim}${' '.repeat(lineNumWidth + 3)}${BOX_CHARS.vertical}${ansi.reset} ${spacesBeforeMatch}${ansi.brightRed}${carets}${ansi.reset}`
    )

    // Context after
    match.contextAfter.forEach((contextLine, i) => {
      const lineNum = match.lineNum + i + 1
      const lineNumStr = String(lineNum).padStart(lineNumWidth, ' ')
      output.push(
        `${ansi.dim}${lineNumStr}${ansi.reset} ${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${contextLine}`
      )
    })

    // Add separator between matches in the same file
    if (idx < matches.length - 1) {
      const nextMatch = matches[idx + 1]
      const nextPostPath = `posts/${nextMatch.post.date.split('-').join('/')}/${nextMatch.post.slug}.md`
      if (postPath === nextPostPath) {
        output.push(`${ansi.dim}  ${BOX_CHARS.horizontal.repeat(78)}${ansi.reset}`)
      }
    }
  })

  output.push('')
  output.push(
    `${ansi.dim}Found ${ansi.reset}${ansi.brightGreen}${matches.length}${ansi.reset}${ansi.dim} match${matches.length !== 1 ? 'es' : ''}${ansi.reset}`
  )
  output.push('')

  return output.join('\r\n')
}

/**
 * Highlight the matched portion of a line
 */
function highlightMatch(
  line: string,
  _pattern: string,
  matchIndex: number,
  matchLength: number
): string {
  const before = line.substring(0, matchIndex)
  const match = line.substring(matchIndex, matchIndex + matchLength)
  const after = line.substring(matchIndex + matchLength)

  return `${before}${ansi.bold}${ansi.brightYellow}${match}${ansi.reset}${after}`
}
