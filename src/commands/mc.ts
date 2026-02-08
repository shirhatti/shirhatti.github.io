import { ansi } from '../utils/ansi'
import { formatPostAsBat } from '../utils/bat'
import type { Post } from '../data/types'
import type { CommandContext } from './types'

// --- Data model ---

interface FileTreeNode {
  type: 'year' | 'month' | 'post'
  label: string
  children?: FileTreeNode[]
  post?: Post
  expanded: boolean
}

interface FlatItem {
  node: FileTreeNode
  depth: number
}

function buildTree(posts: Post[]): FileTreeNode[] {
  const yearMap = new Map<string, Map<string, Post[]>>()

  for (const post of posts) {
    const [year, month] = post.date.split('-')
    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const monthMap = yearMap.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, [])
    monthMap.get(month)!.push(post)
  }

  // Sort years descending
  const sortedYears = [...yearMap.keys()].sort((a, b) => b.localeCompare(a))

  return sortedYears.map((year) => {
    const monthMap = yearMap.get(year)!
    const sortedMonths = [...monthMap.keys()].sort((a, b) => b.localeCompare(a))

    const monthNodes: FileTreeNode[] = sortedMonths.map((month) => {
      const monthPosts = monthMap.get(month)!
      // Sort posts by date descending within month
      monthPosts.sort((a, b) => b.date.localeCompare(a.date))

      const postNodes: FileTreeNode[] = monthPosts.map((post) => ({
        type: 'post' as const,
        label: `${post.slug}.md`,
        post,
        expanded: false,
      }))

      return {
        type: 'month' as const,
        label: `${month}/`,
        children: postNodes,
        expanded: true,
      }
    })

    return {
      type: 'year' as const,
      label: `${year}/`,
      children: monthNodes,
      expanded: true,
    }
  })
}

function flattenTree(nodes: FileTreeNode[], depth = 0): FlatItem[] {
  const result: FlatItem[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.children && node.expanded) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

// --- Rendering ---

function renderFrame(
  _tree: FileTreeNode[],
  flatItems: FlatItem[],
  selectedIndex: number,
  cols: number,
  rows: number,
): string {
  const R = ansi.reset
  const B = ansi.bold
  const D = ansi.dim
  const CYAN = ansi.brightCyan
  const WHITE = ansi.brightWhite
  const YELLOW = ansi.brightYellow

  const totalWidth = Math.max(cols, 40)
  const leftWidth = Math.max(Math.floor(totalWidth * 0.4), 16)
  const rightWidth = totalWidth - leftWidth - 3 // 3 for borders (left, middle, right)

  // Available content rows (minus title bar, panel headers, help bar, bottom border)
  const contentRows = Math.max(rows - 4, 3)

  // Compute scroll offset to keep selection visible
  let scrollOffset = 0
  if (flatItems.length > contentRows) {
    if (selectedIndex >= contentRows) {
      scrollOffset = selectedIndex - contentRows + 1
    }
    // Clamp
    scrollOffset = Math.min(scrollOffset, flatItems.length - contentRows)
    scrollOffset = Math.max(scrollOffset, 0)
  }

  const visibleItems = flatItems.slice(scrollOffset, scrollOffset + contentRows)

  // Build the selected post preview
  const selectedItem = flatItems[selectedIndex]
  const previewLines = buildPreview(selectedItem, rightWidth)

  // Build output
  const out: string[] = []

  // Move cursor to top-left
  out.push('\x1b[H')

  // Title bar
  const titleLeft = ' Midnight Commander '
  const titleRight = ' shirhatti.com '
  const titleFill = totalWidth - titleLeft.length - titleRight.length - 2
  out.push(
    `${CYAN}${B}${'┌'}${titleLeft}${'─'.repeat(Math.max(titleFill, 0))}${titleRight}${'┐'}${R}`,
  )

  // Panel headers
  const leftHeader = ' Blog Posts '
  const rightHeader = ' Preview '
  const leftPad = Math.max(leftWidth - leftHeader.length, 0)
  const rightPad = Math.max(rightWidth - rightHeader.length, 0)
  out.push(
    `${CYAN}├${'─'.repeat(Math.floor(leftPad / 2))}${leftHeader}${'─'.repeat(Math.ceil(leftPad / 2))}┬${'─'.repeat(Math.floor(rightPad / 2))}${rightHeader}${'─'.repeat(Math.ceil(rightPad / 2))}┤${R}`,
  )

  // Content rows
  for (let i = 0; i < contentRows; i++) {
    // Left panel cell
    let leftCell = ''
    if (i < visibleItems.length) {
      const item = visibleItems[i]
      const globalIndex = scrollOffset + i
      const isSelected = globalIndex === selectedIndex

      const indent = '  '.repeat(item.depth)
      let icon = ''
      if (item.node.type !== 'post') {
        icon = item.node.expanded ? '▼ ' : '► '
      } else {
        icon = '  '
      }

      const label = `${indent}${icon}${item.node.label}`
      // Truncate to fit
      const maxLabelLen = leftWidth
      const truncated = label.length > maxLabelLen ? label.slice(0, maxLabelLen - 1) + '…' : label

      if (isSelected) {
        leftCell = `\x1b[7m${padRight(truncated, leftWidth)}\x1b[27m`
      } else {
        const color = item.node.type === 'post' ? WHITE : YELLOW
        leftCell = `${color}${padRight(truncated, leftWidth)}${R}`
      }
    } else {
      leftCell = padRight('', leftWidth)
    }

    // Right panel cell
    let rightCell = ''
    if (i < previewLines.length) {
      rightCell = padRight(previewLines[i], rightWidth)
    } else {
      rightCell = padRight('', rightWidth)
    }

    out.push(`${CYAN}│${R}${leftCell}${CYAN}│${R}${rightCell}${CYAN}│${R}`)
  }

  // Help bar
  const helpText = ` ${D}\u2191\u2193${R}:Navigate  ${D}Enter${R}:Open  ${D}Space${R}:Expand  ${D}q${R}:Quit`
  const helpBarInner = totalWidth - 2
  out.push(`${CYAN}├${'─'.repeat(leftWidth)}┴${'─'.repeat(rightWidth)}┤${R}`)
  out.push(`${CYAN}│${R}${padRight(helpText, helpBarInner, true)}${CYAN}│${R}`)
  out.push(`${CYAN}└${'─'.repeat(totalWidth - 2)}┘${R}`)

  return out.join('\r\n')
}

function buildPreview(selectedItem: FlatItem | undefined, width: number): string[] {
  const R = ansi.reset
  const B = ansi.bold
  const D = ansi.dim
  const GREEN = ansi.brightGreen
  const CYAN = ansi.brightCyan

  if (!selectedItem || !selectedItem.node.post) {
    if (selectedItem && selectedItem.node.type !== 'post') {
      return [
        `${B}${selectedItem.node.label}${R}`,
        '',
        `${D}Directory - ${selectedItem.node.children?.length ?? 0} items${R}`,
        '',
        `${D}Press Space to expand/collapse${R}`,
      ]
    }
    return [`${D}No post selected${R}`]
  }

  const post = selectedItem.node.post
  const lines: string[] = []

  lines.push(`${GREEN}Title:${R}  ${B}${post.title}${R}`)
  lines.push(`${GREEN}Date:${R}   ${post.date}`)
  if (post.tags.length > 0) {
    lines.push(`${GREEN}Tags:${R}   ${post.tags.map(t => `${CYAN}${t}${R}`).join(', ')}`)
  }
  lines.push(`${GREEN}Slug:${R}   ${D}${post.slug}${R}`)
  lines.push('')
  lines.push(`${D}${'─'.repeat(Math.min(width - 2, 40))}${R}`)
  lines.push('')

  // Excerpt
  if (post.excerpt) {
    const wrappedExcerpt = wordWrap(post.excerpt, Math.max(width - 2, 20))
    lines.push(...wrappedExcerpt)
    lines.push('')
  }

  // Content preview (first portion of content, stripped of markdown)
  const contentPreview = stripMarkdown(post.content).slice(0, 600)
  if (contentPreview) {
    lines.push(`${D}${'─'.repeat(Math.min(width - 2, 40))}${R}`)
    lines.push('')
    const wrappedContent = wordWrap(contentPreview, Math.max(width - 2, 20))
    lines.push(...wrappedContent.map(l => `${D}${l}${R}`))
  }

  return lines
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
    .replace(/\*(.+?)\*/g, '$1')         // italic
    .replace(/`([^`]+)`/g, '$1')         // inline code
    .replace(/```[\s\S]*?```/g, '')      // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/^[-*+]\s+/gm, '  - ')     // lists
    .replace(/^\s*\n/gm, '\n')          // blank lines
    .trim()
}

function wordWrap(text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let current = ''
    for (const word of words) {
      if (current.length + word.length + 1 > maxWidth && current.length > 0) {
        lines.push(current)
        current = word
      } else {
        current = current ? current + ' ' + word : word
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

/** Pad string to width, accounting for ANSI escape sequences */
function padRight(str: string, width: number, _hasAnsi = false): string {
  // Strip ANSI to measure visible length
  const visible = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
  const pad = Math.max(width - visible.length, 0)
  return str + ' '.repeat(pad)
}

// --- Mouse parsing ---

interface MouseEvent {
  button: number
  col: number
  row: number
  isRelease: boolean
}

function parseSgrMouse(data: string): MouseEvent | null {
  // SGR format: \x1b[<button;col;row[Mm]
  const match = data.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
  if (!match) return null
  return {
    button: parseInt(match[1], 10),
    col: parseInt(match[2], 10),
    row: parseInt(match[3], 10),
    isRelease: match[4] === 'm',
  }
}

// --- Main handler ---

export async function mcHandler(_args: string[], ctx: CommandContext): Promise<void> {
  const { terminal, navigate, posts, setInputInterceptor } = ctx

  if (!setInputInterceptor) {
    terminal.writeln('')
    terminal.writeln(`${ansi.red}mc: input interceptor not available${ansi.reset}`)
    terminal.writeln('')
    return
  }

  const setInterceptor = setInputInterceptor

  if (posts.length === 0) {
    terminal.writeln('')
    terminal.writeln(`${ansi.dim}No posts available.${ansi.reset}`)
    terminal.writeln('')
    return
  }

  const tree = buildTree(posts)

  return new Promise<void>((resolve) => {
    let flatItems = flattenTree(tree)
    let selectedIndex = 0
    let stateCols = terminal.cols
    let stateRows = terminal.rows
    let lastClickTime = 0
    let lastClickRow = -1

    // Switch to alternate screen buffer, hide cursor, enable mouse
    terminal.write('\x1b[?1049h') // alt screen
    terminal.write('\x1b[?25l')   // hide cursor
    terminal.write('\x1b[?1000h') // normal mouse tracking
    terminal.write('\x1b[?1006h') // SGR extended mouse mode

    function render() {
      flatItems = flattenTree(tree)
      // Clamp selection
      if (selectedIndex >= flatItems.length) selectedIndex = flatItems.length - 1
      if (selectedIndex < 0) selectedIndex = 0

      const frame = renderFrame(tree, flatItems, selectedIndex, stateCols, stateRows)
      terminal.write(frame)
    }

    function cleanup() {
      // Disable mouse, show cursor, restore main screen
      terminal.write('\x1b[?1006l')
      terminal.write('\x1b[?1000l')
      terminal.write('\x1b[?25h')
      terminal.write('\x1b[?1049l')
      resizeDisposable.dispose()
      setInterceptor(null)
    }

    function quit() {
      cleanup()
      resolve()
    }

    function openPost(post: Post) {
      cleanup()
      navigate(`/post/${post.slug}`)
      terminal.write(formatPostAsBat(post))
      resolve()
    }

    function toggleExpand(item: FlatItem) {
      if (item.node.type !== 'post' && item.node.children) {
        item.node.expanded = !item.node.expanded
        render()
      }
    }

    function handleInput(data: string) {
      // Check for SGR mouse events
      const mouse = parseSgrMouse(data)
      if (mouse) {
        handleMouse(mouse)
        return
      }

      // Keyboard
      if (data === 'q' || data === '\x1b' || data === '\x1b[21~') {
        // q, Esc, F10
        quit()
      } else if (data === '\x1b[A') {
        // Up arrow
        if (selectedIndex > 0) {
          selectedIndex--
          render()
        }
      } else if (data === '\x1b[B') {
        // Down arrow
        if (selectedIndex < flatItems.length - 1) {
          selectedIndex++
          render()
        }
      } else if (data === '\r') {
        // Enter
        const item = flatItems[selectedIndex]
        if (item) {
          if (item.node.type === 'post' && item.node.post) {
            openPost(item.node.post)
          } else {
            toggleExpand(item)
          }
        }
      } else if (data === ' ') {
        // Space - toggle expand/collapse
        const item = flatItems[selectedIndex]
        if (item) {
          toggleExpand(item)
        }
      } else if (data === '\x1b[H' || data === '\x1b[1~') {
        // Home
        selectedIndex = 0
        render()
      } else if (data === '\x1b[F' || data === '\x1b[4~') {
        // End
        selectedIndex = flatItems.length - 1
        render()
      } else if (data === '\x1b[5~') {
        // Page Up
        selectedIndex = Math.max(0, selectedIndex - (stateRows - 4))
        render()
      } else if (data === '\x1b[6~') {
        // Page Down
        selectedIndex = Math.min(flatItems.length - 1, selectedIndex + (stateRows - 4))
        render()
      }
    }

    function handleMouse(mouse: MouseEvent) {
      const contentStartRow = 3 // After title bar and panel headers (1-indexed)
      const contentRows = Math.max(stateRows - 4, 3)

      // Compute scroll offset (same logic as renderFrame)
      let scrollOffset = 0
      if (flatItems.length > contentRows) {
        if (selectedIndex >= contentRows) {
          scrollOffset = selectedIndex - contentRows + 1
        }
        scrollOffset = Math.min(scrollOffset, flatItems.length - contentRows)
        scrollOffset = Math.max(scrollOffset, 0)
      }

      const leftWidth = Math.max(Math.floor(stateCols * 0.4), 16)

      if (mouse.button === 64) {
        // Scroll up
        if (selectedIndex > 0) {
          selectedIndex--
          render()
        }
        return
      }

      if (mouse.button === 65) {
        // Scroll down
        if (selectedIndex < flatItems.length - 1) {
          selectedIndex++
          render()
        }
        return
      }

      // Left click (button 0) in left panel
      if (mouse.button === 0 && !mouse.isRelease) {
        // Check if click is within left panel content area
        if (mouse.col >= 2 && mouse.col <= leftWidth + 1 &&
            mouse.row >= contentStartRow && mouse.row < contentStartRow + contentRows) {
          const clickedContentRow = mouse.row - contentStartRow
          const clickedIndex = scrollOffset + clickedContentRow

          if (clickedIndex >= 0 && clickedIndex < flatItems.length) {
            const now = Date.now()
            const isDoubleClick = (now - lastClickTime < 400) && (lastClickRow === mouse.row)
            lastClickTime = now
            lastClickRow = mouse.row

            if (isDoubleClick) {
              // Double-click: open post or toggle directory
              const item = flatItems[clickedIndex]
              if (item.node.type === 'post' && item.node.post) {
                openPost(item.node.post)
              } else {
                toggleExpand(item)
              }
            } else {
              // Single click: select
              selectedIndex = clickedIndex
              render()
            }
          }
        }
      }
    }

    // Subscribe to resize
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      stateCols = cols
      stateRows = rows
      render()
    })

    // Set up input interceptor
    setInterceptor(handleInput)

    // Initial render
    render()
  })
}
