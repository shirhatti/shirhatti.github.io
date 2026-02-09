// Shared StyleX styles for common patterns across components.
import * as stylex from '@stylexjs/stylex'
import { colors, fonts } from './tokens.stylex'

// Focus ring pattern — compose into any interactive element
export const focusRing = stylex.create({
  green: {
    outline: {
      default: 'revert',
      ':focus-visible': `2px solid ${colors.accentGreen}`,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': 2,
    },
  },
  greenInset: {
    outline: {
      default: 'revert',
      ':focus-visible': `2px solid ${colors.accentGreen}`,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': -2,
    },
  },
  cyan: {
    outline: {
      default: 'revert',
      ':focus-visible': `2px solid ${colors.accentCyan}`,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': -2,
    },
  },
})

// Chrome bar — shared look for pager header, status bar, etc.
export const chromeBar = stylex.create({
  base: {
    display: 'flex',
    alignItems: 'center',
    background: colors.bgElevated,
    fontFamily: fonts.monoUi,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
  },
  top: {
    borderBottom: `1px solid ${colors.borderDefault}`,
  },
  bottom: {
    borderTop: `1px solid ${colors.borderDefault}`,
  },
})

// Close button — used in pager header and status bar
export const closeButton = stylex.create({
  base: {
    background: 'none',
    border: 'none',
    color: {
      default: colors.textMuted,
      ':hover': colors.textBright,
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

// Palette button — items in the command palette
export const paletteItem = stylex.create({
  base: {
    width: '100%',
    padding: '12px 16px',
    background: {
      default: 'transparent',
      ':active': colors.borderSubtle,
    },
    color: colors.textPrimary,
    border: 'none',
    textAlign: 'left',
    fontFamily: fonts.mono,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  },
})
