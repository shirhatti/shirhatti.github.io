import type { ReactNode } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors, fonts } from '../../styles/tokens.stylex'

const MOBILE = '@media (max-width: 768px)'
const MOBILE_SM = '@media (max-width: 600px)'
const XXSMALL = '@media (max-width: 400px)'

const styles = stylex.create({
  window: {
    width: {
      default: '94vw',
      [MOBILE]: '98vw',
      [MOBILE_SM]: '100vw',
    },
    maxWidth: 1200,
    height: {
      default: '88vh',
      [MOBILE]: '94vh',
      [MOBILE_SM]: '100vh',
    },
    margin: {
      default: '4vh auto',
      [MOBILE]: '2vh auto',
      [MOBILE_SM]: 0,
    },
    borderRadius: {
      default: 8,
      [MOBILE_SM]: 0,
    },
    overflow: 'hidden',
    boxShadow: {
      default: '0 20px 60px rgba(0, 0, 0, 0.5)',
      [MOBILE_SM]: 'none',
    },
    background: colors.bgSurface,
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: {
    background: `linear-gradient(to bottom, ${colors.borderSubtle}, ${colors.bgElevated})`,
    padding: {
      default: '10px 14px',
      [MOBILE]: '8px 12px',
      [MOBILE_SM]: '6px 10px',
      [XXSMALL]: '4px 8px',
    },
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${colors.bgBase}`,
    flexShrink: 0,
  },
  buttons: {
    display: {
      default: 'flex',
      [XXSMALL]: 'none',
    },
    gap: 8,
    width: {
      default: 52,
      [MOBILE_SM]: 40,
    },
    visibility: {
      default: 'visible',
      [MOBILE_SM]: 'hidden',
    },
  },
  buttonsSpacer: {
    width: {
      default: 52,
      [MOBILE_SM]: 40,
    },
    display: {
      default: 'block',
      [XXSMALL]: 'none',
    },
  },
  dot: {
    width: {
      default: 12,
      [MOBILE]: 10,
    },
    height: {
      default: 12,
      [MOBILE]: 10,
    },
    borderRadius: '50%',
    display: 'inline-block',
  },
  close: { background: colors.trafficRed },
  minimize: { background: colors.trafficYellow },
  maximize: { background: colors.trafficGreen },
  title: {
    color: colors.textDim,
    fontSize: {
      default: 13,
      [MOBILE]: 12,
      [XXSMALL]: 11,
    },
    fontFamily: fonts.sans,
    flex: 1,
    textAlign: {
      default: 'center',
      [XXSMALL]: 'left',
    },
    userSelect: 'none',
  },
})

export function TerminalWindow({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(styles.window)}>
      <div {...stylex.props(styles.titleBar)}>
        <div {...stylex.props(styles.buttons)}>
          <span {...stylex.props(styles.dot, styles.close)} />
          <span {...stylex.props(styles.dot, styles.minimize)} />
          <span {...stylex.props(styles.dot, styles.maximize)} />
        </div>
        <span {...stylex.props(styles.title)}>visitor@shirhatti.com: ~</span>
        <div {...stylex.props(styles.buttonsSpacer)} />
      </div>
      {children}
    </div>
  )
}
