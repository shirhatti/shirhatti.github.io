import './TerminalSkeleton.css'

export function TerminalSkeleton() {
  return (
    <div className="terminal-skeleton">
      <div className="skeleton-line skeleton-pulse"></div>
      <div className="skeleton-line skeleton-pulse" style={{ width: '80%' }}></div>
      <div className="skeleton-line skeleton-pulse" style={{ width: '60%' }}></div>
      <div className="skeleton-prompt skeleton-pulse"></div>
    </div>
  )
}
