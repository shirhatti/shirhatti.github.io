import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ImageAddon } from '@xterm/addon-image'
import '@xterm/xterm/css/xterm.css'

// Determine font size based on screen width
const getFontSize = () => {
  if (typeof window === 'undefined') return 14
  const width = window.innerWidth
  if (width <= 480) return 11
  if (width <= 768) return 12
  return 14
}

const getTerminalOptions = () => ({
  cursorBlink: true,
  cursorStyle: 'block' as const,
  fontFamily: '"Fira Code", "Cascadia Code", "SF Mono", Menlo, monospace',
  fontSize: getFontSize(),
  lineHeight: 1.2,
  allowTransparency: false,
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
})

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal(getTerminalOptions())
    const fitAddon = new FitAddon()

    const imageAddon = new ImageAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(imageAddon)
    terminal.open(container)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    let resizeTimer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        // Update font size on resize
        const newFontSize = getFontSize()
        if (terminal.options.fontSize !== newFontSize) {
          terminal.options.fontSize = newFontSize
        }
        fitAddon.fit()
      }, 100)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [containerRef])

  const getTerminal = useCallback(() => terminalRef.current, [])

  return { getTerminal }
}
