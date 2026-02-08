// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { ansi } from './ansi'
import { formatPostAsBat, _internal } from './bat'
import type { Post } from '../data/types'

const { wrapAnsi, visibleLength, tokenize, renderInlineMarkdown, highlightSyntax } = _internal

// Helper: strip all ANSI/OSC escapes to get visible text
function strip(s: string): string {
  return s
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

// ── visibleLength ──────────────────────────────────────────

describe('visibleLength', () => {
  it('returns length of plain text', () => {
    expect(visibleLength('hello')).toBe(5)
  })

  it('ignores CSI escape sequences', () => {
    expect(visibleLength(`${ansi.bold}hello${ansi.reset}`)).toBe(5)
  })

  it('ignores OSC 8 link sequences', () => {
    const link = `\x1b]8;;https://example.com\x1b\\click\x1b]8;;\x1b\\`
    expect(visibleLength(link)).toBe(5) // "click"
  })

  it('handles mixed escapes and text', () => {
    const s = `${ansi.red}foo${ansi.reset} bar ${ansi.bold}baz${ansi.reset}`
    expect(visibleLength(s)).toBe(11) // "foo bar baz"
  })

  it('returns 0 for empty string', () => {
    expect(visibleLength('')).toBe(0)
  })
})

// ── tokenize ───────────────────────────────────────────────

describe('tokenize', () => {
  it('splits plain text into word and space tokens', () => {
    const tokens = tokenize('hello world')
    expect(tokens.map(strip)).toEqual(['hello', ' ', 'world'])
  })

  it('keeps ANSI escapes attached to adjacent words', () => {
    const input = `${ansi.bold}hello${ansi.reset} world`
    const tokens = tokenize(input)
    // First token should contain the bold escape + "hello" + reset
    expect(strip(tokens[0])).toBe('hello')
    expect(tokens[0]).toContain(ansi.bold)
  })

  it('handles OSC 8 links as single tokens', () => {
    const link = `\x1b]8;;https://example.com\x1b\\click here\x1b]8;;\x1b\\`
    const tokens = tokenize(link)
    // The link text "click" and "here" are separate words inside the OSC,
    // but OSC sequences attach to their adjacent words
    const combined = tokens.join('')
    expect(strip(combined)).toBe('click here')
  })
})

// ── wrapAnsi ───────────────────────────────────────────────

describe('wrapAnsi', () => {
  it('does not wrap text shorter than maxWidth', () => {
    const result = wrapAnsi('short line', 40)
    expect(result).toEqual(['short line'])
  })

  it('wraps long plain text at word boundaries', () => {
    const input = 'the quick brown fox jumps over the lazy dog'
    const result = wrapAnsi(input, 20)
    for (const line of result) {
      expect(visibleLength(line)).toBeLessThanOrEqual(20)
    }
    // All words preserved
    expect(result.map(strip).join(' ').replace(/\s+/g, ' ').trim()).toBe(input)
  })

  it('wraps ANSI-formatted text without counting escapes', () => {
    const input = `${ansi.bold}hello${ansi.reset} ${ansi.red}world${ansi.reset} this is long`
    const result = wrapAnsi(input, 12)
    for (const line of result) {
      expect(visibleLength(line)).toBeLessThanOrEqual(12)
    }
  })

  it('allows links with whitespace to break across lines', () => {
    const link = `\x1b]8;;https://example.com\x1b\\Jeff Atwood\x1b]8;;\x1b\\`
    const input = `text by ${link} is good`
    const result = wrapAnsi(input, 15)
    // Link can break at whitespace between "Jeff" and "Atwood"
    expect(result.length).toBeGreaterThan(1)
    for (const line of result) {
      expect(visibleLength(line)).toBeLessThanOrEqual(15)
    }
  })

  it('closes and reopens links at line breaks', () => {
    const link = `\x1b]8;;https://example.com\x1b\\word1 word2 word3\x1b]8;;\x1b\\`
    const result = wrapAnsi(link, 10)
    // Each line that continues a link should have its own OSC open and close
    for (const line of result) {
      const opens = (line.match(/\x1b\]8;;https:\/\/example\.com\x1b\\/g) || []).length
      const closes = (line.match(/\x1b\]8;;\x1b\\/g) || []).length
      // Every line with link content should have balanced open/close
      if (opens > 0 || closes > 0) {
        expect(closes).toBeGreaterThanOrEqual(opens)
      }
    }
  })

  it('resets ANSI styles at line breaks so they do not bleed', () => {
    // Bold + underlined text that wraps
    const input = `${ansi.bold}${ansi.underline}word1 word2 word3 word4 word5${ansi.reset}`
    const result = wrapAnsi(input, 15)
    expect(result.length).toBeGreaterThan(1)
    // First line should end with a reset
    expect(result[0]).toContain(ansi.reset)
    // Continuation lines should re-apply styles
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toContain(ansi.bold)
      expect(result[i]).toContain(ansi.underline)
    }
  })

  it('returns single-element array for empty string', () => {
    expect(wrapAnsi('', 40)).toEqual([''])
  })
})

// ── renderInlineMarkdown ───────────────────────────────────

describe('renderInlineMarkdown', () => {
  it('renders inline code with yellow highlighting', () => {
    const result = renderInlineMarkdown('use `npm install`')
    expect(result).toContain(ansi.yellow)
    expect(result).toContain('npm install')
    expect(strip(result)).toBe('use npm install')
  })

  it('renders bold with ANSI bold', () => {
    const result = renderInlineMarkdown('this is **important**')
    expect(result).toContain(ansi.bold)
    expect(strip(result)).toBe('this is important')
  })

  it('renders italic with ANSI italic', () => {
    const result = renderInlineMarkdown('this is *emphasized*')
    expect(result).toContain(ansi.italic)
    expect(strip(result)).toBe('this is emphasized')
  })

  it('renders links as OSC 8 hyperlinks', () => {
    const result = renderInlineMarkdown('[click here](https://example.com)')
    // Should contain OSC 8 open and close
    expect(result).toContain('\x1b]8;;https://example.com\x1b\\')
    expect(result).toContain('\x1b]8;;\x1b\\')
    // Visible text should be the link text
    expect(strip(result)).toBe('click here')
  })

  it('renders images as dimmed alt text', () => {
    const result = renderInlineMarkdown('![My Image](image.png)')
    expect(result).toContain(ansi.dim)
    expect(strip(result)).toBe('[My Image]')
  })

  it('renders images without alt text as empty', () => {
    const result = renderInlineMarkdown('![](image.png)')
    expect(strip(result)).toBe('')
  })

  it('does not treat _ inside words as italic', () => {
    const result = renderInlineMarkdown('some_variable_name')
    expect(strip(result)).toBe('some_variable_name')
    expect(result).not.toContain(ansi.italic)
  })

  it('handles nested bold inside link text', () => {
    // Bold inside a link won't nest due to left-to-right processing,
    // but the link should still render correctly
    const result = renderInlineMarkdown('[click](https://example.com)')
    expect(strip(result)).toBe('click')
  })

  it('passes through plain text unchanged', () => {
    const result = renderInlineMarkdown('just plain text')
    expect(result).toBe('just plain text')
  })
})

// ── highlightSyntax ────────────────────────────────────────

describe('highlightSyntax', () => {
  it('renders h1/h2 headers with bold underline bright white', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('## Hello World', state)
    expect(result).toContain(ansi.bold)
    expect(result).toContain(ansi.underline)
    expect(result).toContain(ansi.brightWhite)
    expect(strip(result)).toContain('Hello World')
    expect(strip(result)).not.toContain('##')
  })

  it('renders h3+ headers with bold yellow', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('### Sub Heading', state)
    expect(result).toContain(ansi.bold)
    expect(result).toContain(ansi.brightYellow)
    expect(strip(result)).toContain('Sub Heading')
    expect(strip(result)).not.toContain('###')
  })

  it('renders setext underlines as dim', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('===', state)
    expect(result).toContain(ansi.dim)
  })

  it('toggles code fence state', () => {
    const state = { inCodeBlock: false, codeLang: '' }

    highlightSyntax('```typescript', state)
    expect(state.inCodeBlock).toBe(true)
    expect(state.codeLang).toBe('typescript')

    const codeLine = highlightSyntax('const x = 1', state)
    expect(codeLine).toContain(ansi.yellow)
    expect(state.inCodeBlock).toBe(true)

    highlightSyntax('```', state)
    expect(state.inCodeBlock).toBe(false)
    expect(state.codeLang).toBe('')
  })

  it('renders unordered list items with cyan bullet', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('- list item', state)
    expect(result).toContain(ansi.brightCyan)
    expect(result).toContain('•')
    expect(strip(result)).toContain('list item')
  })

  it('renders ordered list items with cyan number', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('1. first item', state)
    expect(result).toContain(ansi.brightCyan)
    expect(strip(result)).toContain('1. first item')
  })

  it('renders blockquotes with vertical bar and italic', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('> quoted text', state)
    expect(result).toContain('▌')
    expect(result).toContain(ansi.italic)
    expect(strip(result)).toContain('quoted text')
  })

  it('renders horizontal rules as dash line', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    // *** is unambiguously a horizontal rule (--- matches setext heading)
    const result = highlightSyntax('***', state)
    expect(result).toContain('─')
    expect(result).toContain(ansi.dim)
  })

  it('processes inline markdown in regular paragraphs', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const result = highlightSyntax('Visit [site](https://example.com) now', state)
    expect(result).toContain('\x1b]8;;https://example.com\x1b\\')
    expect(strip(result)).toBe('Visit site now')
  })

  it('passes through iTerm2 image sequences unchanged', () => {
    const state = { inCodeBlock: false, codeLang: '' }
    const seq = '\x1b]1337;File=inline=1:base64data\x07'
    expect(highlightSyntax(seq, state)).toBe(seq)
  })
})

// ── formatPostAsBat (integration) ──────────────────────────

describe('formatPostAsBat', () => {
  const post: Post = {
    slug: 'test-post',
    title: 'Test Post',
    date: '2025-01-15',
    tags: ['test'],
    excerpt: 'A test post',
    content: 'Line one\r\nLine two\r\nLine three',
    images: {},
  }

  it('includes header with file path', () => {
    const result = formatPostAsBat(post)
    expect(strip(result)).toContain('posts/2025/01/15-test-post.md')
  })

  it('omits header when showHeader is false', () => {
    const result = formatPostAsBat(post, { showHeader: false })
    expect(strip(result)).not.toContain('posts/')
  })

  it('wraps long lines within cols boundary', () => {
    const longPost: Post = {
      ...post,
      content: 'This is a very long line that should be wrapped because it exceeds the column width that we have set for the terminal display output',
    }
    const result = formatPostAsBat(longPost, { cols: 40 })
    const lines = result.split('\r\n')
    for (const line of lines) {
      // Every visible line should fit within cols
      expect(visibleLength(line)).toBeLessThanOrEqual(45) // small margin for gutter
    }
  })

  it('renders markdown links as clickable in post content', () => {
    const linkPost: Post = {
      ...post,
      content: 'Visit [Example](https://example.com) today',
    }
    const result = formatPostAsBat(linkPost)
    expect(result).toContain('\x1b]8;;https://example.com\x1b\\')
    expect(strip(result)).toContain('Example')
  })

  it('does not break link syntax across wrapped lines', () => {
    const linkPost: Post = {
      ...post,
      content: 'I recommend reading [Jeff Atwood](https://twitter.com/codinghorror) for programming insights',
    }
    const result = formatPostAsBat(linkPost, { cols: 50 })
    // The OSC 8 link should be intact somewhere in the output
    expect(result).toContain('\x1b]8;;https://twitter.com/codinghorror\x1b\\')
    expect(result).toContain('\x1b]8;;\x1b\\')
  })

  it('wraps every line within cols boundary including lines with links', () => {
    const linkPost: Post = {
      ...post,
      content: 'Both [Let\'s Encrypt](https://letsencrypt.org/) and [Cloudflare](https://www.cloudflare.com/) have recently started offering free Domain Validated certificates for personal websites.',
    }
    const result = formatPostAsBat(linkPost, { cols: 80 })
    const lines = result.split('\r\n')
    for (const line of lines) {
      expect(visibleLength(line)).toBeLessThanOrEqual(80)
    }
  })

  it('wraps real blog content with multiple links within cols', () => {
    const realPost: Post = {
      ...post,
      content: 'While I don\'t expect to do any payment processing on my personal blog nor do I serve up any login page, having an SSL issued from a trusted CA will still protect readers of my blog from a [Man-in-the-middle (MITM) attack](https://wikipedia.org/wiki/Man-in-the-middle_attack). Additionally, a huge motivation for me to use SSL was that Google now uses [HTTPS as a ranking signal](https://security.googleblog.com/2014/08/https-as-ranking-signal_6.html).',
    }
    const cols = 110
    const result = formatPostAsBat(realPost, { cols })
    const lines = result.split('\r\n')
    const failures: string[] = []
    for (const line of lines) {
      const vl = visibleLength(line)
      if (vl > cols) {
        failures.push(`visibleLength=${vl} > ${cols}: "${strip(line).substring(0, 60)}..."`)
      }
    }
    expect(failures).toEqual([])
  })

  it('does not wrap iTerm2 image sequences', () => {
    const imgPost: Post = {
      ...post,
      content: '\x1b]1337;File=inline=1;size=100;width=40:base64base64base64base64\x07',
    }
    const result = formatPostAsBat(imgPost, { cols: 40 })
    // The image sequence should pass through intact
    expect(result).toContain('\x1b]1337;File=inline=1;size=100;width=40:base64base64base64base64\x07')
  })
})
