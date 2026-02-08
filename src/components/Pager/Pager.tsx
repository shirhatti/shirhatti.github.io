import { useEffect, useRef, useCallback, useState } from 'react'
import type { Post } from '../../data/types'
import { renderMarkdown } from '../../utils/markdown'
import './Pager.css'

interface PagerProps {
  post: Post
  onClose: () => void
}

export function Pager({ post, onClose }: PagerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPercent, setScrollPercent] = useState(0)

  const html = renderMarkdown(post.content, post.images)

  const updateScrollPercent = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setScrollPercent(max <= 0 ? 100 : Math.round((el.scrollTop / max) * 100))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollPercent, { passive: true })
    updateScrollPercent()
    return () => el.removeEventListener('scroll', updateScrollPercent)
  }, [updateScrollPercent])

  useEffect(() => {
    const LINE = 40
    const handler = (e: KeyboardEvent) => {
      const el = scrollRef.current
      if (!el) return

      const page = el.clientHeight * 0.9
      const half = el.clientHeight * 0.5

      switch (true) {
        case e.key === 'q' || e.key === 'Escape':
          e.preventDefault()
          e.stopPropagation()
          onClose()
          return
        case e.key === 'j' || e.key === 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, LINE)
          return
        case e.key === 'k' || e.key === 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, -LINE)
          return
        case e.key === ' ' || e.key === 'PageDown':
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, page)
          return
        case e.key === 'b' || e.key === 'PageUp':
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, -page)
          return
        case e.key === 'd' && e.ctrlKey:
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, half)
          return
        case e.key === 'u' && e.ctrlKey:
          e.preventDefault()
          e.stopPropagation()
          el.scrollBy(0, -half)
          return
        case e.key === 'g' || e.key === 'Home':
          e.preventDefault()
          e.stopPropagation()
          el.scrollTo(0, 0)
          return
        case e.key === 'G' || e.key === 'End':
          e.preventDefault()
          e.stopPropagation()
          el.scrollTo(0, el.scrollHeight)
          return
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div className="pager-overlay">
      <div className="pager-header">
        <span className="pager-filename">{post.slug}</span>
        <span className="pager-date">{post.date}</span>
        <div className="pager-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="pager-tag">
              {tag}
            </span>
          ))}
        </div>
        <button
          className="pager-close-btn"
          onClick={onClose}
          aria-label="Close pager"
        >
          ✕
        </button>
      </div>

      <div className="pager-scroll" ref={scrollRef}>
        <div className="pager-content">
          <h1>{post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div className="pager-status-bar">
        <span>
          {post.slug} — {scrollPercent}%
        </span>
        <div className="pager-keys">
          <span>
            <kbd>j</kbd>/<kbd>k</kbd> scroll
          </span>
          <span>
            <kbd>Space</kbd>/<kbd>b</kbd> page
          </span>
          <span>
            <kbd>q</kbd> close
          </span>
        </div>
        <button
          className="pager-close-btn"
          onClick={onClose}
          aria-label="Close pager"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
