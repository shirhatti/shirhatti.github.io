import type { Terminal } from '@xterm/xterm'

export interface CommandContext {
  terminal: Terminal
  navigate: (path: string) => void
  cwd: string
  setCwd: (path: string) => void
  history?: string[]
  setInputInterceptor?: (handler: ((data: string) => void) | null) => void
  openOverlay?: (name: string, props?: Record<string, unknown>) => Promise<void>
}

export interface Command {
  name: string
  description: string
  aliases?: string[]
  hidden?: boolean
  handler: (args: string[], ctx: CommandContext) => void | Promise<void>
}
