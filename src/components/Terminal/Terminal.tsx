import { useRef, useEffect, useCallback, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTerminal } from './useTerminal'
import { commands, findCommand } from '../../commands'
import type { CommandContext } from '../../commands'
import { posts } from '../../data/posts'
import { formatPrompt, formatError, ansi, formatLink } from '../../utils/ansi'
import { findClosestMatch } from '../../utils/fuzzy'
import { Pager } from '../Pager/Pager'
import type { Post } from '../../data/types'
import './Terminal.css'

function getWelcomeBanner(): string {
  return [
    '',
    `${ansi.brightCyan}${ansi.bold}  ╔═══════════════════════════════════╗`,
    `  ║                                   ║`,
    `  ║        S H I R H A T T I          ║`,
    `  ║                                   ║`,
    `  ╚═══════════════════════════════════╝${ansi.reset}`,
    '',
    `  ${ansi.dim}Builder, Product Manager, and Developer${ansi.reset}`,
    '',
    `  ${ansi.brightGreen}Email:${ansi.reset}      ${ansi.dim}sourabh\u200B[AT]\u200Bmail\u200B.\u200Bshirhatti\u200B.\u200Bcom${ansi.reset}`,
    `  ${ansi.brightGreen}GitHub:${ansi.reset}     ${formatLink('https://github.com/shirhatti', `${ansi.dim}https://github.com/shirhatti${ansi.reset}`)}`,
    `  ${ansi.brightGreen}Twitter:${ansi.reset}    ${formatLink('https://twitter.com/sshirhatti', `${ansi.dim}https://twitter.com/sshirhatti${ansi.reset}`)}`,
    `  ${ansi.brightGreen}LinkedIn:${ansi.reset}   ${formatLink('https://linkedin.com/in/shirhatti', `${ansi.dim}https://linkedin.com/in/shirhatti${ansi.reset}`)}`,
    '',
    `  ${ansi.brightWhite}${ansi.bold}Recent Posts:${ansi.reset}`,
    '',
    ...posts.slice(0, 3).map((post, idx) =>
      `    ${ansi.dim}${idx + 1}. ${formatLink(`#/post/${post.slug}`, `${ansi.brightCyan}${post.slug}${ansi.reset}`)} ${ansi.dim}(${post.date}) - ${post.title}${ansi.reset}`
    ),
    '',
    `  ${ansi.dim}Type ${ansi.reset}${ansi.brightGreen}help${ansi.reset}${ansi.dim} to get started.${ansi.reset}`,
    '',
    '',
  ].join('\r\n')
}

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const { getTerminal } = useTerminal(containerRef)
  const navigate = useNavigate()
  const location = useLocation()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pagerPost, setPagerPost] = useState<Post | null>(null)
  const pagerResolveRef = useRef<(() => void) | null>(null)

  const inputInterceptorRef = useRef<((data: string) => void) | null>(null)
  const inputBuffer = useRef('')
  const historyRef = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const navigateRef = useRef(navigate)
  const tabCompletionState = useRef<{
    matches: string[]
    currentIndex: number
    originalInput: string
  } | null>(null)
  navigateRef.current = navigate

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const openPager = useCallback(
    (post: Post): Promise<void> => {
      const term = getTerminal()
      if (!term) return Promise.resolve()

      // Hide cursor while pager is open
      term.write('\x1b[?25l')
      // Prevent keys from reaching xterm while pager is open
      inputInterceptorRef.current = () => {}
      setPagerPost(post)

      return new Promise<void>((resolve) => {
        pagerResolveRef.current = resolve
      })
    },
    [getTerminal],
  )

  const handlePagerClose = useCallback(() => {
    const term = getTerminal()
    if (!term) return

    // Show cursor again
    term.write('\x1b[?25h')
    inputInterceptorRef.current = null
    setPagerPost(null)

    // Resolve the promise so writePrompt fires
    if (pagerResolveRef.current) {
      pagerResolveRef.current()
      pagerResolveRef.current = null
    }
  }, [getTerminal])

  // Re-focus terminal after pager overlay is removed from the DOM
  useEffect(() => {
    if (pagerPost === null) {
      const term = getTerminal()
      if (term) {
        term.focus()
        // Also focus xterm's internal textarea directly as a fallback
        const textarea = containerRef.current?.querySelector('textarea')
        if (textarea) textarea.focus()
      }
    }
  }, [pagerPost, getTerminal])

  const writePrompt = useCallback(() => {
    const term = getTerminal()
    if (term) {
      term.write(formatPrompt())
    }
  }, [getTerminal])

  const handleTabCompletion = useCallback(() => {
    const term = getTerminal()
    if (!term) return

    const input = inputBuffer.current
    const parts = input.split(/\s+/)

    // If this is a new tab press (not cycling), reset state
    const isNewTabPress = tabCompletionState.current?.originalInput !== input

    if (isNewTabPress) {
      tabCompletionState.current = null
    }

    let matches: string[] = []
    let prefix = ''

    if (parts.length === 1 && !input.endsWith(' ')) {
      // Complete command name (including aliases)
      prefix = parts[0]
      const commandNames = commands.map((c) => c.name)
      const aliasNames = commands.flatMap((c) => c.aliases || [])
      matches = [...commandNames, ...aliasNames]
        .filter((name) => name.startsWith(prefix))
        .sort()
    } else if (parts.length >= 1) {
      // Check if first word is cat, bat, or less
      const cmdName = parts[0].toLowerCase()
      if (cmdName === 'cat' || cmdName === 'bat' || cmdName === 'less') {
        // Complete post slug
        const lastPart = parts[parts.length - 1]
        prefix = input.endsWith(' ') ? '' : lastPart
        matches = posts
          .map((p) => p.slug)
          .filter((slug) => slug.startsWith(prefix))
          .sort()
      }
    }

    if (matches.length === 0) {
      // No matches, reset state
      tabCompletionState.current = null
      return
    }

    if (matches.length === 1) {
      // Single match - complete it
      const completion = matches[0]
      const beforeCursor = input.slice(0, input.length - prefix.length)
      const newInput = beforeCursor + completion

      // Clear current line and rewrite
      term.write('\x1b[2K\r')
      term.write(formatPrompt())
      term.write(newInput)
      inputBuffer.current = newInput
      tabCompletionState.current = null
      return
    }

    // Multiple matches
    if (isNewTabPress) {
      // First tab - show all matches
      term.writeln('')

      // Display matches in columns
      const maxLength = Math.max(...matches.map((m) => m.length))
      const termWidth = term.cols
      const columnWidth = maxLength + 4
      const columns = Math.max(1, Math.floor(termWidth / columnWidth))

      for (let i = 0; i < matches.length; i += columns) {
        const row = matches.slice(i, i + columns)
        const formattedRow = row
          .map((m) => `${ansi.brightCyan}${m}${ansi.reset}`.padEnd(columnWidth + 10)) // +10 for ANSI codes
          .join('')
        term.writeln(formattedRow)
      }

      // Rewrite prompt and input
      term.write(formatPrompt())
      term.write(input)

      // Initialize cycling state
      tabCompletionState.current = {
        matches,
        currentIndex: 0,
        originalInput: input,
      }
    } else {
      // Subsequent tabs - cycle through matches
      const state = tabCompletionState.current!
      state.currentIndex = (state.currentIndex + 1) % state.matches.length

      const completion = state.matches[state.currentIndex]
      const beforeCursor = input.slice(0, input.length - prefix.length)
      const newInput = beforeCursor + completion

      // Clear current line and rewrite
      term.write('\x1b[2K\r')
      term.write(formatPrompt())
      term.write(newInput)
      inputBuffer.current = newInput

      // Update original input to current for next cycle
      state.originalInput = newInput
    }
  }, [getTerminal])

  const executeCommand = useCallback(
    (input: string) => {
      const term = getTerminal()
      if (!term) return

      const trimmed = input.trim()
      if (!trimmed) {
        term.writeln('')
        writePrompt()
        return
      }

      historyRef.current.push(trimmed)
      historyIndex.current = -1

      const parts = trimmed.split(/\s+/)
      const cmdName = parts[0].toLowerCase()
      let args = parts.slice(1)

      // Special handling for 'll' alias - auto-add -l flag
      let cmd = findCommand(cmdName)
      if (cmdName === 'll' && cmd) {
        args = ['-l', ...args]
      }

      const ctx: CommandContext = {
        terminal: term,
        navigate: navigateRef.current,
        posts,
        history: historyRef.current,
        setInputInterceptor: (handler) => { inputInterceptorRef.current = handler },
        openPager: openPagerRef.current,
      }

      term.writeln('')
      if (cmd) {
        const result = cmd.handler(args, ctx)
        if (result instanceof Promise) {
          result.then(() => {
            writePrompt()
            if (mobileInputRef.current) {
              mobileInputRef.current.value = ''
            }
          })
          return
        }
      } else {
        term.writeln(formatError(`Command not found: '${cmdName}'`))

        // Try to find a similar command using fuzzy matching
        const commandNames = commands.map((c) => c.name)
        const suggestion = findClosestMatch(cmdName, commandNames, 2)

        if (suggestion) {
          term.writeln('')
          term.writeln(`${ansi.dim}Did you mean ${ansi.reset}${ansi.brightGreen}${suggestion}${ansi.reset}${ansi.dim}?${ansi.reset}`)
          term.writeln(`${ansi.dim}Try: ${ansi.reset}${ansi.green}${suggestion}${ansi.reset}`)
        } else {
          term.writeln('')
          term.writeln(`${ansi.dim}Type ${ansi.reset}${ansi.green}help${ansi.reset}${ansi.dim} to see all available commands${ansi.reset}`)
        }
      }
      writePrompt()

      // Clear mobile input if present
      if (mobileInputRef.current) {
        mobileInputRef.current.value = ''
      }
    },
    [getTerminal, writePrompt],
  )

  const runCommand = useCallback(
    (cmd: string) => {
      const term = getTerminal()
      if (!term) return

      // Clear current input
      term.write('\x1b[2K\r')
      term.write(formatPrompt())
      term.write(cmd)
      inputBuffer.current = cmd

      // Execute after a brief delay to show the command
      setTimeout(() => {
        executeCommand(cmd)
        inputBuffer.current = ''
      }, 100)
    },
    [getTerminal, executeCommand],
  )

  // Keep openPager ref stable for the context
  const openPagerRef = useRef(openPager)
  openPagerRef.current = openPager

  // Keep executeCommand ref stable for the onData listener
  const executeRef = useRef(executeCommand)
  executeRef.current = executeCommand

  // Keep runCommand ref stable for the link handler
  const runCommandRef = useRef(runCommand)
  runCommandRef.current = runCommand

  // Keep handleTabCompletion ref stable for the onData listener
  const handleTabCompletionRef = useRef(handleTabCompletion)
  handleTabCompletionRef.current = handleTabCompletion

  // Mobile input handler
  const handleMobileInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const term = getTerminal()
      if (!term) return

      if (e.key === 'Enter') {
        e.preventDefault()
        const value = e.currentTarget.value
        executeCommand(value)
        inputBuffer.current = ''
        e.currentTarget.value = ''
      }
    },
    [getTerminal, executeCommand],
  )

  // Handle mobile input changes - sync with terminal
  const handleMobileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = getTerminal()
      if (!term) return

      const value = e.currentTarget.value

      // Update the terminal display
      term.write('\x1b[2K\r')
      term.write(formatPrompt())
      term.write(value)
      inputBuffer.current = value
    },
    [getTerminal],
  )

  // Initialize terminal once
  useEffect(() => {
    const term = getTerminal()
    if (!term) return

    // Set up OSC 8 link handler to run `cat <slug>` on click or open external links
    term.options.linkHandler = {
      activate(_event: MouseEvent, uri: string) {
        const match = uri.match(/#\/post\/(.+)$/)
        if (match) {
          runCommandRef.current(`less ${match[1]}`)
        } else if (uri.startsWith('http') || uri.startsWith('mailto:')) {
          window.open(uri, '_blank', 'noopener,noreferrer')
        }
      },
    }

    term.write(getWelcomeBanner())

    const dataDisposable = term.onData((data) => {
      if (inputInterceptorRef.current) {
        inputInterceptorRef.current(data)
        return
      }

      const code = data.charCodeAt(0)

      if (data === '\r') {
        executeRef.current(inputBuffer.current)
        inputBuffer.current = ''
        tabCompletionState.current = null
      } else if (data === '\t') {
        // Tab completion
        handleTabCompletionRef.current()
      } else if (code === 127) {
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1)
          term.write('\b \b')
          tabCompletionState.current = null
        }
      } else if (data === '\x1b[A') {
        // Arrow up — navigate history
        if (historyRef.current.length > 0) {
          if (historyIndex.current === -1) {
            historyIndex.current = historyRef.current.length - 1
          } else if (historyIndex.current > 0) {
            historyIndex.current--
          }
          const entry = historyRef.current[historyIndex.current]
          term.write('\x1b[2K\r')
          term.write(formatPrompt())
          term.write(entry)
          inputBuffer.current = entry
          tabCompletionState.current = null
        }
      } else if (data === '\x1b[B') {
        // Arrow down — navigate history
        if (historyIndex.current !== -1) {
          if (historyIndex.current < historyRef.current.length - 1) {
            historyIndex.current++
            const entry = historyRef.current[historyIndex.current]
            term.write('\x1b[2K\r')
            term.write(formatPrompt())
            term.write(entry)
            inputBuffer.current = entry
          } else {
            historyIndex.current = -1
            term.write('\x1b[2K\r')
            term.write(formatPrompt())
            inputBuffer.current = ''
          }
          tabCompletionState.current = null
        }
      } else if (code === 3) {
        // Ctrl+C
        term.writeln('^C')
        inputBuffer.current = ''
        tabCompletionState.current = null
        writePrompt()
      } else if (code === 12) {
        // Ctrl+L - clear screen
        term.clear()
        inputBuffer.current = ''
        tabCompletionState.current = null
        writePrompt()
      } else if (code >= 32) {
        inputBuffer.current += data
        term.write(data)
        tabCompletionState.current = null
      }
    })

    // If we loaded directly to a post URL, open pager
    const match = location.pathname.match(/^\/post\/(.+)$/)
    if (match) {
      const post = posts.find((p) => p.slug === match[1])
      if (post) {
        term.write(formatPrompt())
        term.writeln(`less ${post.slug}`)
        openPagerRef.current(post).then(() => writePrompt())
      } else {
        writePrompt()
      }
    } else {
      writePrompt()
    }

    return () => {
      dataDisposable.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTerminal])

  // Auto-focus mobile input on mount
  useEffect(() => {
    if (isMobile && mobileInputRef.current) {
      // Small delay to ensure keyboard shows
      setTimeout(() => {
        mobileInputRef.current?.focus()
      }, 300)
    }
  }, [isMobile])

  // Focus mobile input when tapping terminal
  const handleTerminalClick = useCallback(() => {
    if (isMobile && mobileInputRef.current) {
      mobileInputRef.current.focus()
    }
  }, [isMobile])

  return (
    <>
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div ref={containerRef} className="terminal-content" onClick={handleTerminalClick} />
        {pagerPost && <Pager post={pagerPost} onClose={handlePagerClose} />}
      </div>

      <>
        {isMobile && (
          <input
            ref={mobileInputRef}
            type="text"
            className="mobile-input"
            onKeyDown={handleMobileInput}
            onChange={handleMobileInputChange}
            placeholder="Type command..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        )}

        <button
          className="command-palette-toggle"
          onClick={() => setShowCommandPalette(!showCommandPalette)}
          aria-label="Toggle command palette"
        >
          {showCommandPalette ? '✕' : '⌘'}
        </button>

        {showCommandPalette && (
          <div className="command-palette">
            <div className="command-palette-section">
              <div className="command-palette-title">Quick Commands</div>
              <button onClick={() => { runCommand('help'); setShowCommandPalette(false); }}>
                help - Show available commands
              </button>
              <button onClick={() => { runCommand('ls'); setShowCommandPalette(false); }}>
                ls - List all posts
              </button>
              <button onClick={() => { runCommand('clear'); setShowCommandPalette(false); }}>
                clear - Clear terminal
              </button>
              <button onClick={() => { runCommand('whoami'); setShowCommandPalette(false); }}>
                whoami - About me
              </button>
            </div>

            {posts.length > 0 && (
              <div className="command-palette-section">
                <div className="command-palette-title">Recent Posts</div>
                {posts.slice(0, 5).map((post) => (
                  <button
                    key={post.slug}
                    onClick={() => {
                      runCommand(`less ${post.slug}`)
                      setShowCommandPalette(false)
                    }}
                  >
                    {post.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    </>
  )
}
