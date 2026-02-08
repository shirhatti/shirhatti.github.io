import type { ReactNode } from 'react'
import * as stylex from '@stylexjs/stylex'

const TABLET = '@media (max-width: 768px)'
const MOBILE = '@media (max-width: 600px)'
const XSMALL = '@media (max-width: 400px)'

const styles = stylex.create({
  window: {
    width: {
      default: '94vw',
      [TABLET]: '98vw',
      [MOBILE]: '100vw',
    },
    maxWidth: 1200,
    height: {
      default: '88vh',
      [TABLET]: '94vh',
      [MOBILE]: '100vh',
    },
    margin: {
      default: '4vh auto',
      [TABLET]: '2vh auto',
      [MOBILE]: 0,
    },
    borderRadius: {
      default: 8,
      [MOBILE]: 0,
    },
    overflow: 'hidden',
    boxShadow: {
      default: '0 20px 60px rgba(0, 0, 0, 0.5)',
      [MOBILE]: 'none',
    },
    background: '#1e1e1e',
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: {
    background: 'linear-gradient(to bottom, #3c3c3c, #2d2d2d)',
    padding: {
      default: '10px 14px',
      [TABLET]: '8px 12px',
      [MOBILE]: '6px 10px',
      [XSMALL]: '4px 8px',
    },
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #1a1a1a',
    flexShrink: 0,
  },
  buttons: {
    display: {
      default: 'flex',
      [XSMALL]: 'none',
    },
    gap: 8,
    width: {
      default: 52,
      [MOBILE]: 40,
    },
    visibility: {
      default: 'visible',
      [MOBILE]: 'hidden',
    },
  },
  buttonsSpacer: {
    width: {
      default: 52,
      [MOBILE]: 40,
    },
    display: {
      default: 'block',
      [XSMALL]: 'none',
    },
  },
  button: {
    width: {
      default: 12,
      [TABLET]: 10,
    },
    height: {
      default: 12,
      [TABLET]: 10,
    },
    borderRadius: '50%',
    display: 'inline-block',
  },
  close: {
    background: '#ff5f56',
  },
  minimize: {
    background: '#ffbd2e',
  },
  maximize: {
    background: '#27c93f',
  },
  title: {
    color: '#999',
    fontSize: {
      default: 13,
      [TABLET]: 12,
      [XSMALL]: 11,
    },
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    flex: 1,
    textAlign: {
      default: 'center',
      [XSMALL]: 'left',
    },
    userSelect: 'none',
  },
})

export function TerminalWindow({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(styles.window)}>
      <div {...stylex.props(styles.titleBar)}>
        <div {...stylex.props(styles.buttons)}>
          <span {...stylex.props(styles.button, styles.close)} />
          <span {...stylex.props(styles.button, styles.minimize)} />
          <span {...stylex.props(styles.button, styles.maximize)} />
        </div>
        <span {...stylex.props(styles.title)}>visitor@shirhatti.com: ~</span>
        <div {...stylex.props(styles.buttonsSpacer)} />
      </div>
      {children}
    </div>
  )
}
