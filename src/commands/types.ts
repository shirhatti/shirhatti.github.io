import type { Terminal } from '@xterm/xterm'
import type { Post } from '../data/types'

export interface CommandContext {
  terminal: Terminal
  navigate: (path: string) => void
  posts: Post[]
  history?: string[]
  setInputInterceptor?: (handler: ((data: string) => void) | null) => void
  openPager?: (post: Post) => Promise<void>
}

export interface Command {
  name: string
  description: string
  aliases?: string[]
  hidden?: boolean
  handler: (args: string[], ctx: CommandContext) => void | Promise<void>
}
