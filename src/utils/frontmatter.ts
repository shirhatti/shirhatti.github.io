/**
 * Simple YAML frontmatter parser for the browser
 * Handles the subset of YAML we need (strings and arrays)
 */

export interface FrontMatter {
  title: string
  date: string
  tags: string[]
  excerpt: string
}

export interface ParsedPost {
  data: FrontMatter
  content: string
}

/**
 * Parse a markdown file with YAML frontmatter
 */
export function parseFrontMatter(raw: string): ParsedPost {
  const lines = raw.split('\n')

  // Check for frontmatter delimiters
  if (lines[0].trim() !== '---') {
    throw new Error('Invalid frontmatter: missing opening ---')
  }

  // Find closing delimiter
  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    throw new Error('Invalid frontmatter: missing closing ---')
  }

  // Extract frontmatter and content
  const frontmatterLines = lines.slice(1, endIndex)
  const contentLines = lines.slice(endIndex + 1)

  // Parse frontmatter
  const data = parseYamlSubset(frontmatterLines)

  // Join content
  const content = contentLines.join('\n').trim()

  return { data, content }
}

/**
 * Parse a simple subset of YAML (only what we need)
 * Supports:
 * - key: value (strings)
 * - key: (arrays on next lines with - prefix)
 */
function parseYamlSubset(lines: string[]): FrontMatter {
  const strings: Record<string, string> = {}
  const arrays: Record<string, string[]> = {}
  let currentKey: string | null = null
  let currentArray: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Array item
    if (trimmed.startsWith('-')) {
      const value = trimmed.slice(1).trim()
      currentArray.push(value)
      continue
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex !== -1) {
      // Save previous array if any
      if (currentKey && currentArray.length > 0) {
        arrays[currentKey] = currentArray
        currentArray = []
      }

      const key = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()

      currentKey = key

      if (value) {
        // Inline value
        strings[key] = value
        currentKey = null
      }
      // else: value will come on next lines (array)
    }
  }

  // Save last array if any
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
