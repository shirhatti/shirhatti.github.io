import { useEffect } from 'react'
import type { AssetContent } from '../../data/types'
import './Demo.css'

interface DemoProps {
  post: AssetContent
  onClose: () => void
}

export function Demo({ post, onClose }: DemoProps) {
  // Only fires while focus is outside the iframe; the close button covers
  // the case where the demo has captured the keyboard.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div className="demo-overlay">
      <div className="demo-header">
        <span className="demo-filename">{post.slug}</span>
        <span className="demo-title">{post.title}</span>
        <span className="demo-date">{post.date}</span>
        <a
          className="demo-open"
          href={post.src}
          target="_blank"
          rel="noopener noreferrer"
        >
          open ↗
        </a>
        <button
          className="demo-close-btn"
          onClick={onClose}
          aria-label="Close demo"
        >
          ✕
        </button>
      </div>

      {/* No allow-same-origin: the demo runs in an opaque origin and cannot
          reach the parent page, its storage, or cookies. */}
      <iframe
        className="demo-frame"
        src={post.src}
        title={post.title || post.slug}
        sandbox="allow-scripts"
      />

      <div className="demo-status-bar">
        <span>{post.excerpt}</span>
        <span className="demo-keys">
          <kbd>q</kbd> close (click outside the demo first)
        </span>
      </div>
    </div>
  )
}
