import { ansi, formatLink } from './ansi'
import type { Post } from '../data/types'

/* eslint-disable no-control-regex */
const RE_OSC8_LINK = /\x1b\]8;;([^\x07\x1b]*?)(?:\x07|\x1b\\)/g
const RE_OSC = /\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g
const RE_CSI = /\x1b\[([0-9;]*[a-zA-Z])/g
const RE_TOKEN =
  /(\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;]*[a-zA-Z]|\s+|[^\s\x1b]+)/g
/* eslint-enable no-control-regex */

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
  showHeader?: boolean
  cols?: number
}

/**
 * Format a post in bat-style with header and syntax highlighting
 */
export function formatPostAsBat(post: Post, options: BatOptions = {}): string {
  const { showHeader = true, cols = 80 } = options

  const lines = post.content.split('\r\n')
  const output: string[] = []

  const contentWidth = Math.max(cols, 20)
  const headerWidth = Math.max(cols, 40)

  // File header (bat-style)
  if (showHeader) {
    const headerLine = `${BOX_CHARS.horizontal.repeat(headerWidth)}`
    output.push('')
    output.push(`${ansi.dim}${headerLine}${ansi.reset}`)

    // File path and metadata
    const dateParts = post.date.split('-')
    const filePath = `File: posts/${dateParts[0]}/${dateParts[1]}/${dateParts[2]}-${post.slug}.md`
    const metadata = `${post.date} • ${post.tags.join(', ')}`
    output.push(
      `${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.bold}${ansi.brightCyan}${filePath}${ansi.reset}`,
    )
    output.push(
      `${ansi.dim}${BOX_CHARS.vertical}${ansi.reset} ${ansi.dim}${metadata}${ansi.reset}`,
    )
    output.push(`${ansi.dim}${headerLine}${ansi.reset}`)
  }

  // Content with syntax highlighting and word wrap
  const hlState: HighlightState = { inCodeBlock: false, codeLang: '' }

  lines.forEach((line) => {
    const formattedLine = highlightSyntax(line, hlState)
    // Skip wrapping for iTerm2 inline image sequences
    if (line.includes('\x1b]1337;File=')) {
      output.push(formattedLine)
    } else {
      const wrapped = wrapAnsi(formattedLine, contentWidth)
      wrapped.forEach((segment) => output.push(segment))
    }
  })

  // Footer separator
  if (showHeader) {
    output.push(
      `${ansi.dim}${BOX_CHARS.horizontal.repeat(headerWidth)}${ansi.reset}`,
    )
  }

  output.push('')
  return output.join('\r\n')
}

/**
 * Word-wrap an ANSI-formatted string at word boundaries.
 * Measures visible width (ignoring escape sequences and OSC 8 links).
 * Tracks active OSC 8 link and ANSI style state so that when a line
 * breaks mid-link, the link is closed/reopened and styles are reset/restored.
 */
function wrapAnsi(text: string, maxWidth: number): string[] {
  // Fast path: measure visible length, skip wrapping if it fits
  const visLen = visibleLength(text)
  if (visLen <= maxWidth) return [text]

  const tokens = tokenize(text)
  const lines: string[] = []
  let currentLine = ''
  let currentVisLen = 0
  // Track active OSC 8 link URL (empty = not in a link)
  let activeLink = ''
  // Track active ANSI style codes (accumulated CSI sequences)
  let activeStyles: string[] = []

  /** Scan a token's escape sequences and update activeLink/activeStyles. */
  const updateState = (token: string) => {
    for (const m of token.matchAll(RE_OSC8_LINK)) {
      activeLink = m[1] // empty string = link close, non-empty = link open
    }
    for (const m of token.matchAll(RE_CSI)) {
      if (m[1] === '0m') {
        activeStyles = []
      } else {
        activeStyles.push(`\x1b[${m[1]}`)
      }
    }
  }

  /** Finish the current line, closing any open link/style. */
  const finishLine = () => {
    let line = currentLine
    if (activeLink) line += '\x1b]8;;\x1b\\'
    if (activeStyles.length > 0) line += ansi.reset
    lines.push(line)
    currentLine = ''
    currentVisLen = 0
  }

  /** Start a continuation line, reopening any active style/link. */
  const continueOnNewLine = () => {
    if (activeStyles.length > 0) currentLine += activeStyles.join('')
    if (activeLink) currentLine += `\x1b]8;;${activeLink}\x1b\\`
  }

  for (const token of tokens) {
    const tokenVisLen = visibleLength(token)

    // Pure whitespace token
    if (/^\s+$/.test(token)) {
      if (currentVisLen + tokenVisLen > maxWidth && currentVisLen > 0) {
        finishLine()
        continueOnNewLine()
      } else {
        currentLine += token
        currentVisLen += tokenVisLen
      }
      // Whitespace has no escapes, no state update needed
      continue
    }

    // Word token (may contain ANSI)
    if (currentVisLen + tokenVisLen > maxWidth && currentVisLen > 0) {
      finishLine()
      continueOnNewLine()
      currentLine += token
      currentVisLen = tokenVisLen
    } else {
      currentLine += token
      currentVisLen += tokenVisLen
    }
    // Update state after adding the token to the line
    updateState(token)
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }
  return lines.length > 0 ? lines : [text]
}

/** Measure visible length, stripping ANSI escapes and OSC 8 sequences. */
function visibleLength(s: string): number {
  return s.replace(RE_OSC, '').replace(RE_CSI, '').length
}

/** Split ANSI text into word and whitespace tokens, keeping escapes attached. */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  RE_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  let current = ''
  let currentIsWord = true

  while ((match = RE_TOKEN.exec(text)) !== null) {
    const part = match[1]
    const isEscape = part[0] === '\x1b'
    const isSpace = !isEscape && /^\s+$/.test(part)

    if (isEscape) {
      // Attach escape sequences to current token
      current += part
    } else if (isSpace) {
      if (currentIsWord && current) {
        tokens.push(current)
        current = ''
      }
      current += part
      currentIsWord = false
    } else {
      if (!currentIsWord && current) {
        tokens.push(current)
        current = ''
      }
      current += part
      currentIsWord = true
    }
  }

  if (current) tokens.push(current)
  return tokens
}

/**
 * Render inline markdown spans: links, images, bold, italic, inline code.
 * Processes left-to-right so nested/overlapping patterns work predictably.
 */
function renderInlineMarkdown(text: string): string {
  let result = ''
  let i = 0

  while (i < text.length) {
    // Inline code: `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        result += `${ansi.yellow}${text.slice(i + 1, end)}${ansi.reset}`
        i = end + 1
        continue
      }
    }

    // Image: ![alt](url) — render alt text as accessible caption
    if (text[i] === '!' && text[i + 1] === '[') {
      const altEnd = text.indexOf(']', i + 2)
      if (altEnd !== -1 && text[altEnd + 1] === '(') {
        const urlEnd = text.indexOf(')', altEnd + 2)
        if (urlEnd !== -1) {
          const alt = text.slice(i + 2, altEnd)
          if (alt) {
            result += `${ansi.dim}[${alt}]${ansi.reset}`
          }
          i = urlEnd + 1
          continue
        }
      }
    }

    // Link: [text](url) — render as clickable OSC 8 hyperlink
    if (text[i] === '[') {
      const textEnd = text.indexOf(']', i + 1)
      if (textEnd !== -1 && text[textEnd + 1] === '(') {
        const urlEnd = text.indexOf(')', textEnd + 2)
        if (urlEnd !== -1) {
          const linkText = text.slice(i + 1, textEnd)
          const url = text.slice(textEnd + 2, urlEnd)
          result += formatLink(
            url,
            `${ansi.underline}${ansi.brightCyan}${linkText}${ansi.reset}`,
          )
          i = urlEnd + 1
          continue
        }
      }
    }

    // Bold: **text** or __text__
    if (
      (text[i] === '*' && text[i + 1] === '*') ||
      (text[i] === '_' && text[i + 1] === '_')
    ) {
      const marker = text.slice(i, i + 2)
      const end = text.indexOf(marker, i + 2)
      if (end !== -1) {
        result += `${ansi.bold}${renderInlineMarkdown(text.slice(i + 2, end))}${ansi.reset}`
        i = end + 2
        continue
      }
    }

    // Italic: *text* or _text_ (but not inside words for _)
    if (text[i] === '*' || text[i] === '_') {
      const marker = text[i]
      // Don't treat _ in the middle of words as italic
      if (marker === '_' && i > 0 && /\w/.test(text[i - 1])) {
        result += text[i]
        i++
        continue
      }
      const end = text.indexOf(marker, i + 1)
      if (end !== -1 && end > i + 1) {
        result += `${ansi.italic}${renderInlineMarkdown(text.slice(i + 1, end))}${ansi.reset}`
        i = end + 1
        continue
      }
    }

    result += text[i]
    i++
  }

  return result
}

/**
 * Markdown-aware syntax highlighting for terminal rendering.
 * Tracks code fence state across lines via the inCodeBlock flag.
 */
interface HighlightState {
  inCodeBlock: boolean
  codeLang: string
}

function highlightSyntax(line: string, state: HighlightState): string {
  // Pass through iTerm2 inline image sequences unchanged
  if (line.includes('\x1b]1337;File=')) return line

  // Code fence toggle: ```lang or ```
  if (/^`{3}/.test(line)) {
    if (!state.inCodeBlock) {
      state.inCodeBlock = true
      state.codeLang = line.slice(3).trim()
      return `${ansi.dim}${'─'.repeat(40)}${state.codeLang ? ` ${state.codeLang}` : ''}${ansi.reset}`
    } else {
      state.inCodeBlock = false
      state.codeLang = ''
      return `${ansi.dim}${'─'.repeat(40)}${ansi.reset}`
    }
  }

  // Inside code block — render as-is with code coloring
  if (state.inCodeBlock) {
    return `  ${ansi.yellow}${line}${ansi.reset}`
  }

  // Setext heading underlines (=== or ---)
  if (/^={3,}$/.test(line) || /^-{3,}$/.test(line)) {
    return `${ansi.dim}${line}${ansi.reset}`
  }

  // ATX headers: # Heading — strip the # prefix for cleaner display
  const headerMatch = line.match(/^(#{1,6})\s+(.*)$/)
  if (headerMatch) {
    const level = headerMatch[1].length
    const rendered = renderInlineMarkdown(headerMatch[2])
    if (level <= 2) {
      return `\r\n${ansi.bold}${ansi.underline}${ansi.brightWhite}${rendered}${ansi.reset}`
    }
    return `\r\n${ansi.bold}${ansi.brightYellow}${rendered}${ansi.reset}`
  }

  // Horizontal rule
  if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
    return `${ansi.dim}${'─'.repeat(40)}${ansi.reset}`
  }

  // Blockquote: > text
  const bqMatch = line.match(/^(>\s?)(.*)$/)
  if (bqMatch) {
    return `${ansi.dim}${ansi.brightCyan}▌${ansi.reset} ${ansi.italic}${renderInlineMarkdown(bqMatch[2])}${ansi.reset}`
  }

  // Unordered list: - item or * item
  const ulMatch = line.match(/^(\s*)([*-])\s(.*)$/)
  if (ulMatch) {
    return `${ulMatch[1]}${ansi.brightCyan}•${ansi.reset} ${renderInlineMarkdown(ulMatch[3])}`
  }

  // Ordered list: 1. item
  const olMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/)
  if (olMatch) {
    return `${olMatch[1]}${ansi.brightCyan}${olMatch[2]}.${ansi.reset} ${renderInlineMarkdown(olMatch[3])}`
  }

  // Regular paragraph text — process inline markdown
  return renderInlineMarkdown(line)
}

// Exported for unit testing
export const _internal = {
  wrapAnsi,
  visibleLength,
  tokenize,
  renderInlineMarkdown,
  highlightSyntax,
}
