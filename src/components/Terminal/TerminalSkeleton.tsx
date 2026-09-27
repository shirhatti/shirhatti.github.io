import './TerminalSkeleton.css'

export function TerminalSkeleton() {
  return (
    <div className="terminal-skeleton">
      <div className="skeleton-line"></div>
      <div className="skeleton-line" style={{ width: '80%' }}></div>
      <div className="skeleton-line" style={{ width: '60%' }}></div>
      <div className="skeleton-prompt"></div>
    </div>
  )
}
