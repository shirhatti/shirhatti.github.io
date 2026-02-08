// Minified ANSI codes - using shorter constant names for better treeshaking
const R = '\x1b[0m' // reset
const B = '\x1b[1m' // bold
const D = '\x1b[2m' // dim

export const ansi = {
  reset: R,
  bold: B,
  dim: D,
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
} as const

// Optimized inline helpers - reduce function call overhead
export const bold = (t: string) => `${B}${t}${R}`
export const color = (c: keyof typeof ansi, t: string) => `${ansi[c]}${t}${R}`
export const formatHeader = (t: string) => `${B}${ansi.cyan}${t}${R}`
export const formatError = (t: string) => `${ansi.red}${t}${R}`
export const formatDim = (t: string) => `${D}${t}${R}`

// Pre-computed prompt for better performance
const PROMPT = `\x1b[92mvisitor\x1b[0m\x1b[90m@\x1b[0m\x1b[96mshirhatti.com\x1b[0m\x1b[90m:\x1b[0m\x1b[94m~\x1b[0m\x1b[90m$ \x1b[0m`
export const formatPrompt = () => PROMPT

// OSC 8 hyperlink support for terminal
// OSC 8 format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
export const formatLink = (url: string, text: string) => {
  // Ensure we have a full URL for the link to work
  const fullUrl = url.startsWith('http') || url.startsWith('mailto:')
    ? url
    : `${window.location.origin}${window.location.pathname}${url}`
  return `\x1b]8;;${fullUrl}\x1b\\${text}\x1b]8;;\x1b\\`
}
