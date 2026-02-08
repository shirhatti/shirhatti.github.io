import { useEffect, useRef, useCallback, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import type { Post } from '../../data/types'
import { renderMarkdown } from '../../utils/markdown'
import './Pager.css'

const MOBILE = '@media (max-width: 768px)'

const styles = stylex.create({
  overlay: {
    position: {
      default: 'absolute',
      [MOBILE]: 'fixed',
    },
    inset: 0,
    zIndex: {
      default: 50,
      [MOBILE]: 200,
    },
    background: '#1e1e1e',
    display: 'flex',
    flexDirection: 'column',
    color: '#d4d4d4',
  },
  header: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    alignItems: 'center',
    gap: 12,
    padding: '6px 16px',
    background: '#2d2d2d',
    borderBottom: '1px solid #404040',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 12,
    color: '#808080',
    flexShrink: 0,
  },
  filename: {
    color: '#e0e0e0',
    fontWeight: 600,
  },
  date: {
    color: '#6a9955',
  },
  tags: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 6,
  },
  tag: {
    background: '#333',
    padding: '1px 6px',
    borderRadius: 3,
    color: '#569cd6',
    fontSize: 12,
  },
  closeBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: {
      default: '#808080',
      ':hover': '#e0e0e0',
    },
    fontSize: 18,
    cursor: 'pointer',
    padding: '8px 12px',
    lineHeight: 1,
    marginLeft: 8,
    minWidth: 44,
    minHeight: 44,
  },
  closeBtnFocusVisible: {
    outline: {
      default: 'revert',
      ':focus-visible': '2px solid #4ec9b0',
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': -2,
    },
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    overscrollBehavior: 'contain',
  },
  content: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    fontSize: {
      default: 16,
      [MOBILE]: 15,
    },
    lineHeight: 1.7,
    padding: {
      default: '24px 32px',
      [MOBILE]: 16,
    },
    paddingBottom: {
      default: null,
      [MOBILE]: 32,
    },
    maxWidth: 780,
    margin: '0 auto',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 16px',
    paddingBottom: {
      default: 4,
      [MOBILE]: 'calc(4px + env(safe-area-inset-bottom, 0px))',
    },
    background: '#2d2d2d',
    borderTop: '1px solid #404040',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 12,
    color: '#808080',
    flexShrink: 0,
  },
  keys: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    gap: 12,
  },
  kbd: {
    background: '#404040',
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 11,
    color: '#d4d4d4',
  },
  mobileCloseBtn: {
    display: {
      default: 'none',
      [MOBILE]: 'block',
    },
    background: 'none',
    border: 'none',
    color: {
      default: '#808080',
      ':hover': '#e0e0e0',
    },
    fontSize: 18,
    cursor: 'pointer',
    padding: '8px 12px',
    lineHeight: 1,
    marginLeft: 8,
    minWidth: 44,
    minHeight: 44,
  },
})

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
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.filename)}>{post.slug}</span>
        <span {...stylex.props(styles.date)}>{post.date}</span>
        <div {...stylex.props(styles.tags)}>
          {post.tags.map((tag) => (
            <span key={tag} {...stylex.props(styles.tag)}>
              {tag}
            </span>
          ))}
        </div>
        <button
          {...stylex.props(styles.closeBtn, styles.closeBtnFocusVisible)}
          onClick={onClose}
          aria-label="Close pager"
        >
          {'\u2715'}
        </button>
      </div>

      <div {...stylex.props(styles.scroll)} ref={scrollRef}>
        <div
          className={`pager-content ${stylex.props(styles.content).className ?? ''}`}
        >
          <h1>{post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div {...stylex.props(styles.statusBar)}>
        <span>
          {post.slug} — {scrollPercent}%
        </span>
        <div {...stylex.props(styles.keys)}>
          <span>
            <kbd {...stylex.props(styles.kbd)}>j</kbd>/
            <kbd {...stylex.props(styles.kbd)}>k</kbd> scroll
          </span>
          <span>
            <kbd {...stylex.props(styles.kbd)}>Space</kbd>/
            <kbd {...stylex.props(styles.kbd)}>b</kbd> page
          </span>
          <span>
            <kbd {...stylex.props(styles.kbd)}>q</kbd> close
          </span>
        </div>
        <button
          {...stylex.props(styles.mobileCloseBtn)}
          onClick={onClose}
          aria-label="Close pager"
        >
          {'\u2715'}
        </button>
      </div>
    </div>
  )
}
