import { useEffect, useRef, useCallback, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import type { Post } from '../../data/types'
import { renderMarkdown } from '../../utils/markdown'
import { colors, fonts } from '../../styles/tokens.stylex'

const MOBILE = '@media (max-width: 768px)'
import { chromeBar, closeButton, focusRing } from '../../styles/shared'
import './Pager.css'

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
    background: colors.bgSurface,
    display: 'flex',
    flexDirection: 'column',
    color: colors.textPrimary,
  },
  header: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    gap: 12,
    padding: '6px 16px',
  },
  filename: {
    color: colors.textBright,
    fontWeight: 600,
  },
  date: {
    color: colors.accentGreenComment,
  },
  tags: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 6,
  },
  tag: {
    background: colors.bgOverlay,
    padding: '1px 6px',
    borderRadius: 3,
    color: colors.accentBlue,
    fontSize: 12,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    overscrollBehavior: 'contain',
  },
  content: {
    fontFamily: fonts.sansContent,
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
    justifyContent: 'space-between',
    padding: '4px 16px',
    paddingBottom: {
      default: 4,
      [MOBILE]: 'calc(4px + env(safe-area-inset-bottom, 0px))',
    },
  },
  keys: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    gap: 12,
  },
  kbd: {
    background: colors.borderDefault,
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 11,
    color: colors.textPrimary,
  },
  closeBtnHidden: {
    display: 'none',
  },
  closeBtnMobile: {
    display: {
      default: 'none',
      [MOBILE]: 'block',
    },
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
      <div {...stylex.props(chromeBar.base, chromeBar.top, styles.header)}>
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
          {...stylex.props(
            closeButton.base,
            styles.closeBtnHidden,
            focusRing.cyan,
          )}
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

      <div
        {...stylex.props(chromeBar.base, chromeBar.bottom, styles.statusBar)}
      >
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
          {...stylex.props(
            closeButton.base,
            styles.closeBtnMobile,
            focusRing.cyan,
          )}
          onClick={onClose}
          aria-label="Close pager"
        >
          {'\u2715'}
        </button>
      </div>
    </div>
  )
}
