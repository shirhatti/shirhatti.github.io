import * as stylex from '@stylexjs/stylex'

export const colors = stylex.defineVars({
  bgBase: '#1a1a1a',
  bgSurface: '#1e1e1e',
  bgElevated: '#2d2d2d',
  bgOverlay: '#333',
  borderSubtle: '#3c3c3c',
  borderDefault: '#404040',
  textPrimary: '#d4d4d4',
  textBright: '#e0e0e0',
  textWhite: '#ffffff',
  textMuted: '#808080',
  textDim: '#999',
  textFaint: '#b0b0b0',
  textSubdued: '#d0d0d0',
  accentGreen: '#0dbc79',
  accentGreenLight: '#23d18b',
  accentCyan: '#4ec9b0',
  accentBlue: '#569cd6',
  accentYellow: '#dcdcaa',
  accentGreenComment: '#6a9955',
  trafficRed: '#ff5f56',
  trafficYellow: '#ffbd2e',
  trafficGreen: '#27c93f',
})

export const fonts = stylex.defineVars({
  mono: "'Fira Code', 'Cascadia Code', 'SF Mono', Menlo, monospace",
  monoUi: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  sansContent:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
})
