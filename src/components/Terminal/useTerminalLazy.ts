import { useEffect, useRef, useCallback, useState } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

const TERMINAL_OPTIONS = {
  cursorBlink: true,
  cursorStyle: 'block' as const,
  fontFamily: '"Fira Code", "Cascadia Code", "SF Mono", Menlo, monospace',
  fontSize: 14,
  lineHeight: 1.2,
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#00ff00',
    cursorAccent: '#000000',
    selectionBackground: '#3a3d41',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  },
}

export function useTerminalLazy(containerRef: React.RefObject<HTMLDivElement | null>) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let mounted = true

    // Dynamically import xterm and addon
    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/xterm/css/xterm.css')
    ])
      .then(([{ Terminal }, { FitAddon }]) => {
        if (!mounted || !containerRef.current) return

        const terminal = new Terminal(TERMINAL_OPTIONS)
        const fitAddon = new FitAddon()

        terminal.loadAddon(fitAddon)
        terminal.open(containerRef.current)
        fitAddon.fit()

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon
        setIsLoading(false)

        let resizeTimer: ReturnType<typeof setTimeout>
        const handleResize = () => {
          clearTimeout(resizeTimer)
          resizeTimer = setTimeout(() => fitAddon.fit(), 100)
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          clearTimeout(resizeTimer)
          terminal.dispose()
          terminalRef.current = null
          fitAddonRef.current = null
        }
      })
      .catch((error) => {
        console.error('Failed to load terminal:', error)
        setIsLoading(false)
      })

    return () => {
      mounted = false
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
        fitAddonRef.current = null
      }
    }
  }, [containerRef])

  const getTerminal = useCallback(() => terminalRef.current, [])

  return { getTerminal, isLoading }
}
