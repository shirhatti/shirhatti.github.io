import { useEffect, useRef, useCallback, useState } from 'react'
import { init, Terminal } from 'ghostty-web'
import { perf } from '../../utils/perf'

// Determine font size based on screen width
const getFontSize = () => {
  if (typeof window === 'undefined') return 14
  const width = window.innerWidth
  if (width <= 480) return 11
  if (width <= 768) return 12
  return 14
}

const FONT_FAMILY = '"Fira Code", "Cascadia Code", "SF Mono", Menlo, monospace'

/**
 * Measure the actual character size for a monospace font using canvas.
 */
function measureCharSize(
  fontFamily: string,
  fontSize: number,
): { width: number; height: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText('W')
  return {
    width: metrics.width,
    height: fontSize * 1.2,
  }
}

/**
 * Fit terminal to its container by calculating cols/rows from container dimensions.
 */
function fitToContainer(terminal: Terminal, container: HTMLElement) {
  const fontSize = terminal.options.fontSize ?? 14
  const fontFamily = terminal.options.fontFamily ?? 'monospace'
  const { width: charWidth, height: charHeight } = measureCharSize(
    fontFamily,
    fontSize,
  )

  const padding = 16 // matches .terminal-content padding (8px * 2)
  const cols = Math.max(
    2,
    Math.floor((container.clientWidth - padding) / charWidth),
  )
  const rows = Math.max(
    1,
    Math.floor((container.clientHeight - padding) / charHeight),
  )

  terminal.resize(cols, rows)
}

const getTerminalOptions = () => ({
  cursorBlink: true,
  cursorStyle: 'block' as const,
  fontFamily: FONT_FAMILY,
  fontSize: getFontSize(),
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

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const terminalRef = useRef<Terminal | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false

    ;(async () => {
      perf.mark('terminal-init-start')
      await init()
      perf.mark('terminal-wasm-loaded')

      if (disposed) return

      const terminal = new Terminal(getTerminalOptions())
      terminal.open(container)
      fitToContainer(terminal, container)

      perf.mark('terminal-init-end')

      const wasmLoad = perf.measure(
        'wasm-load',
        'terminal-init-start',
        'terminal-wasm-loaded',
      )
      const totalInit = perf.measure(
        'terminal-total-init',
        'terminal-init-start',
        'terminal-init-end',
      )
      if (wasmLoad >= 0) perf.record('WASM load', wasmLoad)
      if (totalInit >= 0) perf.record('Terminal init (total)', totalInit)

      terminalRef.current = terminal
      setReady(true)

      let resizeTimer: ReturnType<typeof setTimeout>
      const handleResize = () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          const newFontSize = getFontSize()
          if (terminal.options.fontSize !== newFontSize) {
            terminal.options.fontSize = newFontSize
          }
          fitToContainer(terminal, container)
        }, 100)
      }
      window.addEventListener('resize', handleResize)

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize)
        clearTimeout(resizeTimer)
        terminal.dispose()
        terminalRef.current = null
        setReady(false)
      }
    })()

    return () => {
      disposed = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [containerRef])

  const getTerminal = useCallback(() => terminalRef.current, [])

  return { getTerminal, ready }
}
