import type { ReactNode } from 'react'
import './TerminalWindow.css'

export function TerminalWindow({ children }: { children: ReactNode }) {
  return (
    <div className="terminal-window">
      <div className="terminal-title-bar">
        <div className="terminal-buttons">
          <span className="terminal-button close" />
          <span className="terminal-button minimize" />
          <span className="terminal-button maximize" />
        </div>
        <span className="terminal-title">visitor@shirhatti.com: ~</span>
        <div className="terminal-buttons-spacer" />
      </div>
      {children}
    </div>
  )
}
